"""Agent 2 (Part 1): Knowledge ingestion (one-time).

Loads an ophthalmology reference PDF (or .txt), chunks it, embeds chunks,
tags each chunk with an ophthalmic specialty, and stores them in a
persistent Chroma vector DB.

Run (from backend/ dir):
  python agents/knowledge_ingestor.py

Or from repo root:
  python backend/agents/knowledge_ingestor.py
"""

from __future__ import annotations

import os
import re
import hashlib
from pathlib import Path
from typing import Iterable, List, Tuple

import chromadb
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer


# --- Paths / constants ---
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]

CHROMA_DIR = REPO_ROOT / "vector_db" / "book_chunks"
COLLECTION_NAME = "ophthal_book"
# Must match the model used in knowledge_retriever.py for compatible embeddings
MODEL_NAME = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBED_CACHE_DIR = os.getenv("EMBED_CACHE_DIR")
EMBED_OFFLINE = os.getenv("EMBED_OFFLINE", "0") == "1"

# Default source PDF
DEFAULT_SOURCE = Path(r"C:\Users\susha\Downloads\Ophthalmology_Myron_Yanoff_&_Jay.pdf")
FALLBACK_SOURCE = BACKEND_DIR / "data" / "ophthalmology_reference.pdf"


# --- Specialty classifier ---
# Keywords (lowercased) that map a chunk to an ophthalmic specialty
_SPECIALTY_KEYWORDS: dict[str, list[str]] = {
    "glaucoma": [
        "glaucoma", "iop", "intraocular pressure", "trabeculectomy",
        "trabecular", "aqueous", "angle closure", "open angle", "optic disc",
        "cup disc", "cup-to-disc", "visual field", "perimetry", "gonioscopy",
        "timolol", "latanoprost", "brimonidine", "dorzolamide", "pilocarpine",
        "tube shunt", "ahmed valve", "bleb", "tonometry", "applanation",
        "nerve fiber layer", "rnfl", "ganglion cell",
    ],
    "retina": [
        "retina", "retinal", "macula", "macular", "vitreous", "vitrectomy",
        "detachment", "diabetic retinopathy", "proliferative", "non-proliferative",
        "npdr", "pdr", "csme", "clinically significant macular edema",
        "anti-vegf", "vegf", "bevacizumab", "ranibizumab", "aflibercept",
        "photocoagulation", "laser", "epiretinal membrane", "oct", "fundus",
        "choroid", "choroidal", "rpe", "retinal pigment", "armd", "amd",
        "age-related macular", "drusen", "cnv", "retinal vein", "retinal artery",
        "branch retinal", "central retinal",
    ],
    "cornea": [
        "cornea", "corneal", "keratitis", "keratoconus", "keratoplasty",
        "endothelium", "epithelium", "stroma", "descemets", "bowmans",
        "fuchs", "bullous keratopathy", "pterygium", "pinguecula",
        "dry eye", "tear film", "meibomian", "blepharitis",
        "conjunctivitis", "conjunctival", "trachoma", "ulcer",
        "herpetic", "herpes", "acanthamoeba", "fungal keratitis",
    ],
    "cataract": [
        "cataract", "phacoemulsification", "phaco", "lens", "intraocular lens",
        "iol", "posterior capsule", "anterior capsule", "capsulotomy",
        "pseudophakia", "aphakia", "aciol", "pciol", "cortical cataract",
        "nuclear sclerosis", "posterior subcapsular", "mature cataract",
        "hypermature", "intumescent", "morgagnian",
    ],
    "neuro": [
        "optic nerve", "optic neuritis", "papilledema", "papilloedema",
        "nystagmus", "cranial nerve", "pupil", "afferent pupillary",
        "rapd", "visual pathway", "chiasm", "hemianopia",
        "homonymous", "bitemporal", "diplopia", "strabismus",
        "esotropia", "exotropia", "sixth nerve", "third nerve",
        "fourth nerve", "myasthenia", "giant cell arteritis",
        "temporal arteritis", "ischemic optic neuropathy",
    ],
    "oculoplastics": [
        "eyelid", "ptosis", "ectropion", "entropion", "chalazion",
        "dacryocystitis", "lacrimal", "nasolacrimal", "orbit",
        "orbital", "proptosis", "exophthalmos", "enucleation",
        "evisceration", "thyroid eye", "graves", "blow-out fracture",
        "dermoid", "hemangioma", "lid", "tarsorrhaphy", "blepharoplasty",
    ],
    "uveitis": [
        "uveitis", "anterior uveitis", "posterior uveitis", "panuveitis",
        "intermediate uveitis", "iritis", "iridocyclitis", "choroiditis",
        "vitritis", "hypopyon", "keratic precipitates", "synechiae",
        "sarcoidosis", "behcet", "vogt-koyanagi", "sympathetic ophthalmia",
        "toxoplasmosis", "cmv retinitis", "hla-b27",
    ],
    "pediatric": [
        "pediatric", "paediatric", "retinoblastoma", "amblyopia",
        "congenital", "rop", "retinopathy of prematurity",
        "infantile", "childhood", "nasolacrimal duct obstruction",
        "congenital cataract", "congenital glaucoma", "buphthalmos",
        "leukocoria",
    ],
}


def _classify_specialty(text: str) -> str:
    """Classify a text chunk into an ophthalmic specialty based on keyword density."""
    lower = text.lower()
    scores: dict[str, int] = {}
    for specialty, keywords in _SPECIALTY_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in lower)
        if count > 0:
            scores[specialty] = count
    if not scores:
        return "general"
    return max(scores, key=scores.get)  # type: ignore[arg-type]


# --- Lazy singletons (avoid heavy downloads at import time) ---
_embedder: SentenceTransformer | None = None
_chroma_client: chromadb.PersistentClient | None = None
_collection = None


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        if EMBED_OFFLINE:
            # Force HuggingFace/Transformers to stay offline.
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

        kwargs = {}
        if EMBED_CACHE_DIR:
            kwargs["cache_folder"] = EMBED_CACHE_DIR

        _embedder = SentenceTransformer(MODEL_NAME, **kwargs)
    return _embedder


def _get_collection():
    global _chroma_client, _collection
    if _collection is not None:
        return _collection

    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    _chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    # We handle embeddings ourselves (SentenceTransformer), so disable
    # Chroma's built-in default embedding function.
    _collection = _chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=None,
    )
    return _collection


def _get_chroma_max_batch_size(collection) -> int:
    """Return Chroma's internal max batch size.

    Chroma enforces a hard max batch size on upserts. We discover it via
    whatever API surface is available for the installed Chroma version.
    """

    candidates = []
    # Newer clients sometimes expose it directly.
    candidates.append(lambda: collection._client.get_max_batch_size())  # type: ignore[attr-defined]
    # Some versions nest the rust client.
    candidates.append(lambda: collection._client._client.get_max_batch_size())  # type: ignore[attr-defined]
    # Others expose a server/api object.
    candidates.append(lambda: collection._client._server.get_max_batch_size())  # type: ignore[attr-defined]
    candidates.append(lambda: collection._client._api.get_max_batch_size())  # type: ignore[attr-defined]

    for fn in candidates:
        try:
            value = fn()
            if isinstance(value, int) and value > 0:
                return value
        except Exception:
            continue

    # Safe fallback (must be <= real max); avoids hardcoding user's specific limit.
    return 5000


def _batched_upsert(collection, *, documents, metadatas, embeddings, ids) -> None:
    max_batch = _get_chroma_max_batch_size(collection)
    total = len(ids)
    if total == 0:
        return

    print(f"Chroma max batch size: {max_batch}. Upserting {total} chunks...")
    for start in range(0, total, max_batch):
        end = min(start + max_batch, total)
        collection.upsert(
            documents=documents[start:end],
            metadatas=metadatas[start:end],
            embeddings=embeddings[start:end],
            ids=ids[start:end],
        )
        print(f"  Upserted {end}/{total}")


# --- Loading ---
def load_pdf_pages(path: Path) -> List[Tuple[int, str]]:
    reader = PdfReader(str(path))
    pages: List[Tuple[int, str]] = []
    for idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = text.strip()
        if text:
            pages.append((idx, text))
    return pages


def load_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


# --- Chunking (no langchain dependency) ---
def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")
    if chunk_overlap < 0:
        raise ValueError("chunk_overlap must be >= 0")
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be < chunk_size")

    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    chunks: List[str] = []
    start = 0
    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(cleaned):
            break
        start = end - chunk_overlap

    return chunks


def _stable_chunk_id(source_path: Path, page: int | None, chunk_index: int, chunk: str) -> str:
    page_part = f"p{page}" if page is not None else "p0"
    raw = f"{source_path.as_posix()}|{page_part}|{chunk_index}|{chunk}".encode("utf-8", errors="ignore")
    digest = hashlib.sha1(raw).hexdigest()
    return f"chunk-{page_part}-{chunk_index}-{digest[:12]}"


def _iter_chunks(source_path: Path) -> Iterable[Tuple[str, dict, str]]:
    suffix = source_path.suffix.lower()

    if suffix == ".pdf":
        for page_num, page_text in load_pdf_pages(source_path):
            for i, chunk in enumerate(chunk_text(page_text), start=0):
                metadata = {
                    "source": source_path.as_posix(),
                    "page": page_num,
                    "chunk_index": i,
                    "specialty": _classify_specialty(chunk),
                }
                chunk_id = _stable_chunk_id(source_path, page_num, i, chunk)
                yield chunk, metadata, chunk_id
        return

    if suffix in {".txt", ".md"}:
        text = load_text_file(source_path)
        for i, chunk in enumerate(chunk_text(text), start=0):
            metadata = {
                "source": source_path.as_posix(),
                "page": 0,
                "chunk_index": i,
                "specialty": _classify_specialty(chunk),
            }
            chunk_id = _stable_chunk_id(source_path, None, i, chunk)
            yield chunk, metadata, chunk_id
        return

    raise ValueError(f"Unsupported file type: {source_path.suffix} (use .pdf or .txt)")


def ingest_book(source_path: str | Path) -> None:
    source_path = Path(source_path)
    if not source_path.exists():
        raise FileNotFoundError(f"Reference file not found: {source_path}")

    print(f"Reading: {source_path}")

    chunks: List[str] = []
    metadatas: List[dict] = []
    ids: List[str] = []

    for chunk, metadata, chunk_id in _iter_chunks(source_path):
        chunks.append(chunk)
        metadatas.append(metadata)
        ids.append(chunk_id)

    if not chunks:
        print("No text extracted; nothing to ingest.")
        return

    # Print specialty distribution
    from collections import Counter
    spec_counts = Counter(m.get("specialty", "unknown") for m in metadatas)
    print(f"Chunked into {len(chunks)} segments. Specialty distribution:")
    for spec, count in spec_counts.most_common():
        print(f"  {spec}: {count} chunks")

    print("Embedding...")
    embedder = _get_embedder()
    embeddings = embedder.encode(chunks, show_progress_bar=True)
    embeddings_list = [e.tolist() for e in embeddings]

    print("Storing in Chroma...")
    collection = _get_collection()
    # Upsert makes reruns safe.
    _batched_upsert(
        collection,
        documents=chunks,
        metadatas=metadatas,
        embeddings=embeddings_list,
        ids=ids,
    )

    print(f"Done. Ingested {len(chunks)} chunks into: {CHROMA_DIR}")


def _resolve_default_source() -> Path:
    if DEFAULT_SOURCE.exists():
        return DEFAULT_SOURCE
    if FALLBACK_SOURCE.exists():
        return FALLBACK_SOURCE
    return DEFAULT_SOURCE


if __name__ == "__main__":
    source = DEFAULT_SOURCE if DEFAULT_SOURCE.exists() else FALLBACK_SOURCE
    print(f"Source: {source}")
    ingest_book(source)
