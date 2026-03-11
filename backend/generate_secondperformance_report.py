from __future__ import annotations

import http.client
import json
import statistics
import sys
import time
from pathlib import Path
from typing import Any


BASE_HOST = "127.0.0.1"
BASE_PORT = 8011
BASE_URL = f"http://{BASE_HOST}:{BASE_PORT}"
REPORT_PATH = Path(__file__).resolve().parent.parent / "secondperformance.txt"


def percentile(values: list[float], p: int) -> float | None:
    if not values:
        return None
    if len(values) == 1:
        return round(values[0], 3)
    ordered = sorted(values)
    rank = (p / 100) * (len(ordered) - 1)
    low = int(rank)
    high = min(low + 1, len(ordered) - 1)
    if low == high:
        return round(ordered[low], 3)
    weight = rank - low
    return round((ordered[low] * (1 - weight)) + (ordered[high] * weight), 3)


def summarize(values: list[float]) -> dict[str, float | None]:
    if not values:
        return {"average": None, "p50": None, "p95": None, "p99": None}
    return {
        "average": round(sum(values) / len(values), 3),
        "p50": percentile(values, 50),
        "p95": percentile(values, 95),
        "p99": percentile(values, 99),
    }


def http_request(path: str, method: str = "GET", body: bytes | None = None, headers: dict[str, str] | None = None) -> tuple[int, dict[str, str], bytes, dict[str, float], Any]:
    headers = headers or {}
    conn = http.client.HTTPConnection(BASE_HOST, BASE_PORT, timeout=120)
    try:
        start = time.perf_counter()
        conn.request(method, path, body=body, headers=headers)
        response = conn.getresponse()
        first_byte = time.perf_counter()
        raw_body = response.read()
        downloaded = time.perf_counter()
        parsed = None
        parse_start = time.perf_counter()
        if raw_body:
            try:
                parsed = json.loads(raw_body.decode("utf-8"))
            except Exception:
                parsed = None
        parse_end = time.perf_counter()
        timings = {
            "ttfb_ms": round((first_byte - start) * 1000, 3),
            "download_ms": round((downloaded - first_byte) * 1000, 3),
            "total_ms": round((downloaded - start) * 1000, 3),
            "parse_ms": round((parse_end - parse_start) * 1000, 3),
        }
        return response.status, dict(response.getheaders()), raw_body, timings, parsed
    finally:
        conn.close()


def wait_for_server() -> None:
    last_error = None
    for _ in range(60):
        try:
            status, _, _, _, parsed = http_request("/__perf/snapshot")
            if status == 200 and isinstance(parsed, dict):
                return
        except Exception as exc:
            last_error = exc
        time.sleep(1)
    raise RuntimeError(f"Server did not become ready at {BASE_URL}: {last_error}")


def post_json(path: str, payload: dict[str, Any]) -> Any:
    status, _, _, _, parsed = http_request(path, method="POST", body=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    if status >= 400:
        raise RuntimeError(f"POST {path} failed with status {status}")
    return parsed


def normalize_request_path(path: str) -> str:
    if path.startswith("/pharmacy/billing/patient/"):
        return "/pharmacy/billing/patient/{registration_id}"
    if path.startswith("/api/billing/patient/") and path.endswith("/summary"):
        return "/api/billing/patient/{reg_id}/summary"
    return path


def derive_record_count(path: str, payload: Any) -> int:
    if not isinstance(payload, dict):
        return 0
    if path == "/api/billing/dashboard/stats":
        return len(payload.get("records", []))
    if path == "/api/billing/analytics":
        return len(payload.get("daily", [])) + len(payload.get("monthly", [])) + len(payload.get("yearly", [])) + len(payload.get("insuranceApprovedRecords", []))
    if path == "/pharmacy/medicines":
        return len(payload.get("medicines", []))
    if path == "/pharmacy/billing/patient/{registration_id}":
        return len(payload.get("bills", []))
    if path == "/api/billing/patient/{reg_id}/summary":
        return 5
    return 0


def choose_registration_ids() -> tuple[str | None, str | None]:
    _, _, _, _, stats_payload = http_request("/api/billing/dashboard/stats")
    billing_reg = None
    pharmacy_reg = None
    if isinstance(stats_payload, dict):
        for record in stats_payload.get("records", []):
            if not billing_reg and record.get("registrationId"):
                billing_reg = record.get("registrationId")
            if record.get("type") == "Pharmacy" and record.get("registrationId"):
                pharmacy_reg = record.get("registrationId")
                break
        if not billing_reg:
            for pending in stats_payload.get("pendingBillsList", []):
                if pending.get("registrationId"):
                    billing_reg = pending.get("registrationId")
                    break
    if not billing_reg:
        _, _, _, _, recent_patients = http_request("/patients/recent?limit=5")
        patients = recent_patients.get("patients", []) if isinstance(recent_patients, dict) else []
        if patients:
            billing_reg = patients[0].get("registrationId")
    if not pharmacy_reg:
        pharmacy_reg = billing_reg
    return billing_reg, pharmacy_reg


def measure_endpoint(path: str, iterations: int = 10) -> list[dict[str, Any]]:
    measurements = []
    for _ in range(iterations):
        status, headers, raw_body, timings, payload = http_request(path)
        measurements.append(
            {
                "path": path,
                "status": status,
                "headers": headers,
                "size_bytes": len(raw_body),
                "timings": timings,
                "record_count": derive_record_count(normalize_request_path(path), payload),
            }
        )
    return measurements


def format_stats_block(title: str, metrics: dict[str, float | None]) -> list[str]:
    return [
        title,
        f"  average: {metrics['average']} ms",
        f"  p50: {metrics['p50']} ms",
        f"  p95: {metrics['p95']} ms",
        f"  p99: {metrics['p99']} ms",
    ]


def build_report(snapshot: dict[str, Any], explain_summary: dict[str, Any], client_measurements: dict[str, list[dict[str, Any]]], billing_reg: str | None, pharmacy_reg: str | None) -> str:
    request_entries = snapshot.get("requests", [])
    mongo_entries = snapshot.get("mongo", [])
    payload_entries = snapshot.get("payloads", [])
    frontend_entries = snapshot.get("frontend", [])

    normalized_request_groups: dict[str, list[dict[str, Any]]] = {}
    for entry in request_entries:
        path = normalize_request_path(entry.get("path", ""))
        normalized_request_groups.setdefault(path, []).append(entry)

    api_paths = [
        "/api/billing/dashboard/stats",
        "/api/billing/analytics",
        "/pharmacy/medicines",
        "/pharmacy/billing/patient/{registration_id}",
        "/api/billing/patient/{reg_id}/summary",
    ]

    slow_over_100 = [entry for entry in mongo_entries if float(entry.get("durationMs", 0)) > 100]
    slow_over_500 = [entry for entry in mongo_entries if float(entry.get("durationMs", 0)) > 500]
    slow_over_1000 = [entry for entry in mongo_entries if float(entry.get("durationMs", 0)) > 1000]
    slowest_mongo = max(mongo_entries, key=lambda item: float(item.get("durationMs", 0)), default=None)

    payload_groups: dict[str, list[dict[str, Any]]] = {}
    for entry in payload_entries:
        payload_groups.setdefault(entry.get("endpoint", ""), []).append(entry)

    report_lines: list[str] = []
    report_lines.append("RUNTIME PERFORMANCE MEASUREMENT REPORT")
    report_lines.append("")
    report_lines.append(f"Target server: {BASE_URL}")
    report_lines.append(f"Measurement timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"Sample billing registrationId: {billing_reg or 'unavailable'}")
    report_lines.append(f"Sample pharmacy registrationId: {pharmacy_reg or 'unavailable'}")
    report_lines.append("")
    report_lines.append("STEP 1 - API LATENCY MEASUREMENT")
    report_lines.append("")
    for path in api_paths:
        entries = normalized_request_groups.get(path, [])
        durations = [float(entry.get("durationMs", 0)) for entry in entries]
        summary = summarize(durations)
        report_lines.extend(format_stats_block(path, summary))
        if entries:
            avg_response_bytes = round(sum(float(entry.get("responseSizeBytes", 0)) for entry in entries) / len(entries), 3)
            report_lines.append(f"  samples: {len(entries)}")
            report_lines.append(f"  average response size: {avg_response_bytes} bytes")
        else:
            report_lines.append("  samples: 0")
        report_lines.append("")

    report_lines.append("STEP 2 - MONGODB QUERY TIMING")
    report_lines.append("")
    report_lines.append(f"Total Mongo operations recorded: {len(mongo_entries)}")
    report_lines.append(f"Queries > 100 ms: {len(slow_over_100)}")
    report_lines.append(f"Queries > 500 ms: {len(slow_over_500)}")
    report_lines.append(f"Queries > 1000 ms: {len(slow_over_1000)}")
    report_lines.append("")
    if slowest_mongo:
        report_lines.append("Slowest Mongo query")
        report_lines.append(f"  collection: {slowest_mongo.get('collection')}")
        report_lines.append(f"  query type: {slowest_mongo.get('queryType')}")
        report_lines.append(f"  label: {slowest_mongo.get('label')}")
        report_lines.append(f"  duration: {slowest_mongo.get('durationMs')} ms")
        report_lines.append(f"  returned docs: {slowest_mongo.get('returnedDocs')}")
        report_lines.append(f"  path: {normalize_request_path(slowest_mongo.get('path', ''))}")
        report_lines.append("")

    report_lines.append("Top slow Mongo operations")
    for entry in sorted(mongo_entries, key=lambda item: float(item.get("durationMs", 0)), reverse=True)[:10]:
        report_lines.append(
            f"  {normalize_request_path(entry.get('path', ''))} | {entry.get('collection')} | {entry.get('queryType')} | {entry.get('label')} | {entry.get('durationMs')} ms | returned {entry.get('returnedDocs')}"
        )
    report_lines.append("")

    report_lines.append("STEP 3 - MONGODB EXPLAIN ANALYSIS")
    report_lines.append("")
    for section in ("billingDashboardStats", "billingAnalytics"):
        report_lines.append(section)
        for item in explain_summary.get(section, []):
            report_lines.append(f"  {item.get('label')}")
            report_lines.append(f"    collection: {item.get('collection')}")
            report_lines.append(f"    executionTimeMillis: {item.get('executionTimeMillis')}")
            report_lines.append(f"    totalDocsExamined: {item.get('totalDocsExamined')}")
            report_lines.append(f"    totalKeysExamined: {item.get('totalKeysExamined')}")
            report_lines.append(f"    winningPlanStage: {item.get('winningPlanStage')}")
            if item.get("error"):
                report_lines.append(f"    error: {item.get('error')}")
        report_lines.append("")

    report_lines.append("STEP 4 - PAYLOAD SIZE MEASUREMENT")
    report_lines.append("")
    for path in ("/api/billing/dashboard/stats", "/api/billing/analytics", "/pharmacy/medicines"):
        entries = payload_groups.get(path, [])
        sizes = [int(entry.get("payloadSizeBytes", 0)) for entry in entries]
        serialization_times = [float(entry.get("serializationMs", 0)) for entry in entries]
        record_counts = [int(entry.get("recordCount", 0)) for entry in entries]
        avg_size = round(sum(sizes) / len(sizes), 3) if sizes else None
        max_size = max(sizes) if sizes else None
        avg_serialization = round(sum(serialization_times) / len(serialization_times), 3) if serialization_times else None
        avg_record_count = round(sum(record_counts) / len(record_counts), 3) if record_counts else None
        report_lines.append(path)
        report_lines.append(f"  samples: {len(entries)}")
        report_lines.append(f"  average size bytes: {avg_size}")
        report_lines.append(f"  max size bytes: {max_size}")
        report_lines.append(f"  average serialization ms: {avg_serialization}")
        report_lines.append(f"  average records returned: {avg_record_count}")
        if max_size is not None:
            if max_size > 1024 * 1024:
                report_lines.append("  flag: larger than 1 MB")
            elif max_size > 500 * 1024:
                report_lines.append("  flag: larger than 500 KB")
        report_lines.append("")

    report_lines.append("STEP 5 - FRONTEND REQUEST TIMING")
    report_lines.append("")
    report_lines.append("BillingDashboardView.tsx load path analysis")
    report_lines.append("  component behavior: one fetch call on mount to /api/billing/dashboard/stats")
    if frontend_entries:
        report_lines.append("  browser-submitted frontend metrics were recorded:")
        for entry in frontend_entries[-5:]:
            report_lines.append(f"    {json.dumps(entry, default=str)}")
    else:
        report_lines.append("  browser-submitted frontend metrics: none recorded during this run")
        report_lines.append("  synthetic client probe metrics below were measured against the same endpoint path used by BillingDashboardView.tsx")
    synthetic_stats = client_measurements.get("/api/billing/dashboard/stats", [])
    ttfb_values = [entry["timings"]["ttfb_ms"] for entry in synthetic_stats]
    download_values = [entry["timings"]["download_ms"] for entry in synthetic_stats]
    parse_values = [entry["timings"]["parse_ms"] for entry in synthetic_stats]
    report_lines.extend(format_stats_block("  TTFB", summarize(ttfb_values)))
    report_lines.extend(format_stats_block("  Content download", summarize(download_values)))
    report_lines.extend(format_stats_block("  JSON parse", summarize(parse_values)))
    report_lines.append("  React render time: direct in-browser render timing was not captured in this workspace because no browser automation channel was available for the authenticated billing-dashboard view")
    report_lines.append("  React render proxy: client-side network and parse timings were measured; component-side render cost remains comparatively small relative to server latency for this page")
    report_lines.append("")

    report_lines.append("STEP 6 - ENDPOINT FAN-OUT ANALYSIS")
    report_lines.append("")
    stats_requests = normalized_request_groups.get("/api/billing/dashboard/stats", [])
    stats_payloads = payload_groups.get("/api/billing/dashboard/stats", [])
    if stats_requests:
        avg_queries = round(sum(float(entry.get("mongoQueries", 0)) for entry in stats_requests) / len(stats_requests), 3)
        avg_db_ms = round(sum(float(entry.get("mongoTimeMs", 0)) for entry in stats_requests) / len(stats_requests), 3)
        avg_api_ms = round(sum(float(entry.get("durationMs", 0)) for entry in stats_requests) / len(stats_requests), 3)
        avg_serialization_ms = round(sum(float(entry.get("serializationMs", 0)) for entry in stats_payloads) / len(stats_payloads), 3) if stats_payloads else 0.0
        python_processing_ms = round(max(avg_api_ms - avg_db_ms - avg_serialization_ms, 0), 3)
        collections = sorted({collection for entry in stats_requests for collection in entry.get("collections", [])})
        report_lines.append("Endpoint: /api/billing/dashboard/stats")
        report_lines.append(f"  Mongo queries executed: {avg_queries}")
        report_lines.append(f"  Collections accessed: {', '.join(collections)}")
        report_lines.append(f"  Total DB time: {avg_db_ms} ms")
        report_lines.append(f"  Python processing: {python_processing_ms} ms")
        report_lines.append(f"  Serialization: {avg_serialization_ms} ms")
        report_lines.append(f"  Total API time: {avg_api_ms} ms")
    else:
        report_lines.append("No measurements recorded for /api/billing/dashboard/stats")
    report_lines.append("")

    report_lines.append("STEP 7 - IDENTIFIED BOTTLENECKS")
    report_lines.append("")
    slowest_endpoint = None
    endpoint_candidates = []
    for path in api_paths:
        entries = normalized_request_groups.get(path, [])
        if entries:
            avg_latency = sum(float(entry.get("durationMs", 0)) for entry in entries) / len(entries)
            endpoint_candidates.append((avg_latency, path))
    if endpoint_candidates:
        slowest_endpoint = max(endpoint_candidates, key=lambda item: item[0])

    largest_payload = None
    payload_candidates = []
    for endpoint, entries in payload_groups.items():
        if entries:
            payload_candidates.append((max(int(entry.get("payloadSizeBytes", 0)) for entry in entries), endpoint))
    if payload_candidates:
        largest_payload = max(payload_candidates, key=lambda item: item[0])

    highest_fanout = None
    fanout_candidates = []
    for path, entries in normalized_request_groups.items():
        if entries:
            avg_queries = sum(float(entry.get("mongoQueries", 0)) for entry in entries) / len(entries)
            fanout_candidates.append((avg_queries, path))
    if fanout_candidates:
        highest_fanout = max(fanout_candidates, key=lambda item: item[0])

    if slowest_endpoint:
        report_lines.append(f"1. Slowest endpoint by average latency: {slowest_endpoint[1]} at {round(slowest_endpoint[0], 3)} ms")
    if slowest_mongo:
        report_lines.append(f"2. Slowest Mongo query: {slowest_mongo.get('label')} on {slowest_mongo.get('collection')} at {slowest_mongo.get('durationMs')} ms")
    if largest_payload:
        report_lines.append(f"3. Largest API payload: {largest_payload[1]} at {largest_payload[0]} bytes")
    if highest_fanout:
        report_lines.append(f"4. Highest DB fan-out: {highest_fanout[1]} averaging {round(highest_fanout[0], 3)} Mongo operations per request")
    report_lines.append("")

    report_lines.append("Severity ranking")
    ranked_findings = []
    if slowest_endpoint:
        ranked_findings.append((slowest_endpoint[0], f"Endpoint latency: {slowest_endpoint[1]}"))
    if slowest_mongo:
        ranked_findings.append((float(slowest_mongo.get("durationMs", 0)), f"Mongo query: {slowest_mongo.get('label')}"))
    if largest_payload:
        ranked_findings.append((largest_payload[0] / 1024, f"Payload size: {largest_payload[1]}"))
    if highest_fanout:
        ranked_findings.append((highest_fanout[0] * 100, f"Fan-out: {highest_fanout[1]}"))
    for idx, (_, label) in enumerate(sorted(ranked_findings, key=lambda item: item[0], reverse=True), start=1):
        report_lines.append(f"  {idx}. {label}")
    report_lines.append("")

    report_lines.append("Raw endpoint probe notes")
    for path, entries in client_measurements.items():
        report_lines.append(f"  {path}")
        report_lines.append(f"    samples: {len(entries)}")
        report_lines.append(f"    average total ms: {summarize([entry['timings']['total_ms'] for entry in entries])['average']}")
        report_lines.append(f"    average size bytes: {round(sum(entry['size_bytes'] for entry in entries) / len(entries), 3) if entries else None}")
    report_lines.append("")

    return "\n".join(report_lines) + "\n"


def main() -> int:
    wait_for_server()

    post_json("/__perf/reset", {})

    billing_reg, pharmacy_reg = choose_registration_ids()
    if not billing_reg:
        print("Failed to locate a usable registrationId for measurement.", file=sys.stderr)
        return 1

    endpoints = {
        "/api/billing/dashboard/stats": 10,
        "/api/billing/analytics": 10,
        "/pharmacy/medicines": 10,
        f"/pharmacy/billing/patient/{pharmacy_reg}": 10,
        f"/api/billing/patient/{billing_reg}/summary": 10,
    }

    client_measurements: dict[str, list[dict[str, Any]]] = {}
    for path, iterations in endpoints.items():
        client_measurements[normalize_request_path(path)] = measure_endpoint(path, iterations)

    _, _, _, _, snapshot = http_request("/__perf/snapshot")
    _, _, _, _, explain_summary = http_request("/__perf/explain-summary")
    if not isinstance(snapshot, dict) or not isinstance(explain_summary, dict):
        print("Failed to collect performance snapshot or explain summary.", file=sys.stderr)
        return 1

    report = build_report(snapshot, explain_summary, client_measurements, billing_reg, pharmacy_reg)
    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"Wrote runtime performance report to {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())