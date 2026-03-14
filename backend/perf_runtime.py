from __future__ import annotations

import contextvars
import copy
import json
import math
import threading
import time
from datetime import datetime
from typing import Any, Callable, Optional


_REQUEST_CONTEXT: contextvars.ContextVar[Optional[dict[str, Any]]] = contextvars.ContextVar("perf_request_context", default=None)
_LOCK = threading.Lock()

_METRICS: dict[str, list[dict[str, Any]]] = {
    "requests": [],
    "mongo": [],
    "payloads": [],
    "frontend": [],
}

_MAX_ENTRIES = {
    "requests": 2000,
    "mongo": 10000,
    "payloads": 2000,
    "frontend": 1000,
}


def iso_now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _trim(bucket: str) -> None:
    max_entries = _MAX_ENTRIES[bucket]
    if len(_METRICS[bucket]) > max_entries:
        del _METRICS[bucket][:-max_entries]


def reset_metrics() -> dict[str, str]:
    with _LOCK:
        for key in _METRICS:
            _METRICS[key].clear()
    return {"status": "success"}


def snapshot_metrics() -> dict[str, Any]:
    with _LOCK:
        return copy.deepcopy(_METRICS)


def begin_request_context(method: str, path: str) -> contextvars.Token:
    ctx = {
        "method": method,
        "path": path,
        "request_start_perf": time.perf_counter(),
        "request_start_wall": iso_now(),
        "mongo_queries": 0,
        "mongo_time_ms": 0.0,
        "collections": set(),
    }
    return _REQUEST_CONTEXT.set(ctx)


def get_request_context() -> Optional[dict[str, Any]]:
    return _REQUEST_CONTEXT.get()


def end_request_context(token: contextvars.Token, status_code: int, response_size_bytes: int) -> Optional[dict[str, Any]]:
    ctx = _REQUEST_CONTEXT.get()
    try:
        if not ctx:
            return None

        total_duration_ms = round((time.perf_counter() - ctx["request_start_perf"]) * 1000, 3)
        entry = {
            "path": ctx["path"],
            "method": ctx["method"],
            "startTimestamp": ctx["request_start_wall"],
            "endTimestamp": iso_now(),
            "durationMs": total_duration_ms,
            "responseSizeBytes": int(response_size_bytes or 0),
            "statusCode": status_code,
            "mongoQueries": int(ctx["mongo_queries"]),
            "mongoTimeMs": round(float(ctx["mongo_time_ms"]), 3),
            "collections": sorted(ctx["collections"]),
        }
        with _LOCK:
            _METRICS["requests"].append(entry)
            _trim("requests")
        return entry
    finally:
        _REQUEST_CONTEXT.reset(token)


def record_frontend_metric(metric: dict[str, Any]) -> None:
    metric = dict(metric)
    metric.setdefault("recordedAt", iso_now())
    with _LOCK:
        _METRICS["frontend"].append(metric)
        _trim("frontend")


def record_payload_metric(endpoint: str, route_elapsed_ms: float, serialization_ms: float, payload_size_bytes: int, record_count: int) -> dict[str, Any]:
    entry = {
        "endpoint": endpoint,
        "recordedAt": iso_now(),
        "routeElapsedMs": round(route_elapsed_ms, 3),
        "serializationMs": round(serialization_ms, 3),
        "payloadSizeBytes": int(payload_size_bytes),
        "recordCount": int(record_count),
    }
    with _LOCK:
        _METRICS["payloads"].append(entry)
        _trim("payloads")
    return entry


def preview_payload(endpoint: str, payload: Any, route_started_perf: float, record_count: int) -> Any:
    serialization_start = time.perf_counter()
    encoded = json.dumps(payload, default=str).encode("utf-8")
    serialization_ms = (time.perf_counter() - serialization_start) * 1000
    route_elapsed_ms = (time.perf_counter() - route_started_perf) * 1000
    record_payload_metric(endpoint, route_elapsed_ms, serialization_ms, len(encoded), record_count)
    return payload


def _record_mongo(collection_name: str, query_type: str, duration_ms: float, returned_docs: int, details: Optional[dict[str, Any]] = None) -> None:
    ctx = _REQUEST_CONTEXT.get()
    entry = {
        "recordedAt": iso_now(),
        "path": ctx.get("path") if ctx else None,
        "method": ctx.get("method") if ctx else None,
        "collection": collection_name,
        "queryType": query_type,
        "returnedDocs": int(returned_docs),
        "durationMs": round(duration_ms, 3),
    }
    if details:
        entry.update(details)

    if ctx:
        ctx["mongo_queries"] += 1
        ctx["mongo_time_ms"] += duration_ms
        ctx["collections"].add(collection_name)

    with _LOCK:
        _METRICS["mongo"].append(entry)
        _trim("mongo")


def timed_call(collection: Any, query_type: str, operation: Callable[[], Any], returned_docs: Callable[[Any], int], details: Optional[dict[str, Any]] = None) -> Any:
    started = time.perf_counter()
    result = operation()
    duration_ms = (time.perf_counter() - started) * 1000
    _record_mongo(collection.name, query_type, duration_ms, returned_docs(result), details)
    return result


def timed_find_one(collection: Any, query: dict[str, Any], projection: Optional[dict[str, Any]] = None, label: Optional[str] = None) -> Any:
    return timed_call(
        collection,
        "find_one",
        lambda: collection.find_one(query, projection),
        lambda doc: 1 if doc else 0,
        {"label": label, "query": str(query)[:500]} if label else {"query": str(query)[:500]},
    )


def timed_count_documents(collection: Any, query: dict[str, Any], label: Optional[str] = None) -> int:
    return timed_call(
        collection,
        "count_documents",
        lambda: collection.count_documents(query),
        lambda count: int(count),
        {"label": label, "query": str(query)[:500]} if label else {"query": str(query)[:500]},
    )


def timed_aggregate(collection: Any, pipeline: list[dict[str, Any]], label: Optional[str] = None) -> list[dict[str, Any]]:
    return timed_call(
        collection,
        "aggregate",
        lambda: list(collection.aggregate(pipeline)),
        lambda docs: len(docs),
        {"label": label, "pipelineLength": len(pipeline)} if label else {"pipelineLength": len(pipeline)},
    )
    
async def async_timed_find_list(
    collection: Any,
    query: Optional[dict[str, Any]] = None,
    projection: Optional[dict[str, Any]] = None,
    sort: Optional[list[tuple[str, int]]] = None,
    limit: Optional[int] = None,
    label: Optional[str] = None,
) -> list[dict[str, Any]]:
    async def _op():
        cursor = collection.find(query or {}, projection)
        if sort:
            cursor = cursor.sort(sort)
        if limit:
            cursor = cursor.limit(limit)
        return await cursor.to_list(length=None)

    return await async_timed_call(
        collection,
        "find",
        _op,
        lambda docs: len(docs),
        {"label": label, "query": str(query)[:500]} if label else {"query": str(query)[:500]},
    )


async def async_timed_call(collection: Any, query_type: str, operation: Callable[[], Any], returned_docs: Callable[[Any], int], details: Optional[dict[str, Any]] = None) -> Any:
    started = time.perf_counter()
    result = await operation()
    duration_ms = (time.perf_counter() - started) * 1000
    _record_mongo(collection.name, query_type, duration_ms, returned_docs(result), details)
    return result

async def async_timed_aggregate(collection: Any, pipeline: list[dict[str, Any]], label: Optional[str] = None) -> list[dict[str, Any]]:
    async def _op():
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None) 

    return await async_timed_call(
        collection,
        "aggregate",
        _op,
        lambda docs: len(docs),
        {"label": label, "pipelineLength": len(pipeline)} if label else {"pipelineLength": len(pipeline)},
    )



def timed_find_list(
    collection: Any,
    query: Optional[dict[str, Any]] = None,
    projection: Optional[dict[str, Any]] = None,
    sort: Optional[tuple[str, int]] = None,
    limit: Optional[int] = None,
    label: Optional[str] = None,
) -> list[dict[str, Any]]:
    def _run() -> list[dict[str, Any]]:
        cursor = collection.find(query or {}, projection)
        if sort:
            cursor = cursor.sort(sort[0], sort[1])
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)

    details = {
        "query": str(query or {})[:500],
        "sort": str(sort) if sort else None,
        "limit": limit,
    }
    if label:
        details["label"] = label
    return timed_call(collection, "find", _run, lambda docs: len(docs), details)


def percentile(values: list[float], p: int) -> Optional[float]:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return round(ordered[0], 3)
    rank = (p / 100) * (len(ordered) - 1)
    low = math.floor(rank)
    high = math.ceil(rank)
    if low == high:
        return round(ordered[low], 3)
    weight = rank - low
    return round((ordered[low] * (1 - weight)) + (ordered[high] * weight), 3)


def summarize_latencies(entries: list[dict[str, Any]]) -> dict[str, Optional[float]]:
    durations = [float(entry.get("durationMs", 0.0)) for entry in entries]
    if not durations:
        return {"averageMs": None, "p50Ms": None, "p95Ms": None, "p99Ms": None}
    return {
        "averageMs": round(sum(durations) / len(durations), 3),
        "p50Ms": percentile(durations, 50),
        "p95Ms": percentile(durations, 95),
        "p99Ms": percentile(durations, 99),
    }
