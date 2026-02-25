"""Agent 2 (Part 2): Runtime knowledge retriever.

Loads the persisted ChromaDB created by knowledge_ingestor.py and returns
relevant textbook/guideline chunks for a query using:
  1. Multi-step medical query expansion (synonym + facet decomposition)
  2. Hybrid search (dense vector + BM25 keyword scoring)
  3. Reciprocal Rank Fusion (RRF) to merge both ranking signals
  4. MMR re-ranking for diversity

Usage:
  from agents.knowledge_retriever import search_knowledge
  chunks = search_knowledge("Interpret IOP and vision trends in glaucoma")
"""

from __future__ import annotations

import math
import os
import re
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]
CHROMA_DIR = BACKEND_DIR / "vector_db" / "book_chunks"
COLLECTION_NAME = "ophthal_book"
MODEL_NAME = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBED_CACHE_DIR = os.getenv("EMBED_CACHE_DIR")
EMBED_OFFLINE = os.getenv("EMBED_OFFLINE", "0") == "1"


_embedder: SentenceTransformer | None = None
_client: chromadb.PersistentClient | None = None
_collection = None


# ── Stopwords ───────────────────────────────────────────────────────────────

_STOPWORDS = {
    "the", "and", "or", "a", "an", "to", "of", "in", "on", "for", "with",
    "is", "are", "was", "were", "be", "as", "by", "at", "from", "that",
    "this", "these", "those", "it", "its", "into", "about", "can", "how",
    "what", "why", "when", "where", "which", "who", "does", "did", "done",
    "should", "would", "could", "using", "use", "also", "may", "include",
}


# ── Medical Synonym / Abbreviation Expansion Map ───────────────────────────
# Keys are lowercased terms found in queries. Values are synonyms/expansions
# that should ALSO be searched so BM25 picks up exact textbook phrasing.

_MEDICAL_SYNONYMS: dict[str, list[str]] = {
    # Measurements & exams
    "iop": ["intraocular pressure", "tonometry", "applanation"],
    "intraocular pressure": ["iop", "tonometry"],
    "va": ["visual acuity", "snellen", "logmar"],
    "visual acuity": ["va", "snellen", "best corrected"],
    "bcva": ["best corrected visual acuity", "visual acuity"],
    "refraction": ["autorefraction", "retinoscopy", "spherical equivalent"],
    "oct": ["optical coherence tomography", "retinal thickness"],
    "fundus": ["fundoscopy", "ophthalmoscopy", "posterior segment"],
    "slit lamp": ["biomicroscopy", "anterior segment examination"],
    "gonioscopy": ["angle assessment", "trabecular meshwork", "iridocorneal angle"],
    "perimetry": ["visual field", "humphrey", "field loss"],
    "visual field": ["perimetry", "humphrey field", "scotoma"],
    "pachymetry": ["corneal thickness", "cct"],

    # Diagnoses
    "glaucoma": ["optic neuropathy", "raised iop", "visual field loss", "disc cupping"],
    "poag": ["primary open angle glaucoma", "open angle glaucoma"],
    "pacg": ["primary angle closure glaucoma", "angle closure", "narrow angle"],
    "cataract": ["lens opacity", "phacoemulsification", "pciol", "iol implant"],
    "phaco": ["phacoemulsification", "cataract surgery", "lens extraction"],
    "pciol": ["posterior chamber intraocular lens", "iol implant"],
    "diabetic retinopathy": ["dr", "npdr", "pdr", "diabetic maculopathy", "microaneurysm"],
    "npdr": ["non proliferative diabetic retinopathy", "background retinopathy"],
    "pdr": ["proliferative diabetic retinopathy", "neovascularization"],
    "armd": ["age related macular degeneration", "amd", "drusen", "choroidal neovascularization"],
    "amd": ["age related macular degeneration", "armd", "drusen"],
    "dry eye": ["keratoconjunctivitis sicca", "tear film dysfunction", "meibomian"],
    "uveitis": ["iritis", "iridocyclitis", "anterior uveitis", "intraocular inflammation"],
    "keratitis": ["corneal ulcer", "corneal infection", "microbial keratitis"],
    "conjunctivitis": ["pink eye", "conjunctival inflammation", "allergic conjunctivitis"],
    "retinal detachment": ["rd", "rhegmatogenous", "tractional detachment"],
    "pterygium": ["conjunctival growth", "nasal pterygium", "pterygium excision"],
    "strabismus": ["squint", "esotropia", "exotropia", "ocular misalignment"],
    "amblyopia": ["lazy eye", "amblyopic eye", "deprivation amblyopia"],
    "blepharitis": ["lid margin disease", "meibomian gland dysfunction", "mgd"],
    "chalazion": ["meibomian cyst", "lid lump", "internal hordeolum"],
    "optic neuritis": ["optic nerve inflammation", "papillitis", "demyelination"],

    # Systemic conditions affecting eyes
    "diabetes": ["diabetic", "dm", "hyperglycemia", "hba1c", "blood sugar"],
    "hypertension": ["high blood pressure", "htn", "systemic hypertension", "bp"],
    "thyroid": ["graves", "thyroid eye disease", "proptosis", "exophthalmos"],

    # Procedures
    "lasik": ["laser refractive surgery", "keratomileusis", "excimer laser"],
    "trabeculectomy": ["filtration surgery", "glaucoma surgery", "bleb"],
    "vitrectomy": ["pars plana vitrectomy", "ppv", "posterior vitrectomy"],
    "yag": ["yag laser", "capsulotomy", "posterior capsulotomy"],
    "prp": ["panretinal photocoagulation", "laser photocoagulation", "scatter laser"],
    "intravitreal": ["intravitreal injection", "anti vegf", "avastin", "lucentis"],

    # Medications
    "timolol": ["beta blocker", "timolol maleate", "antiglaucoma"],
    "latanoprost": ["prostaglandin analogue", "xalatan", "antiglaucoma"],
    "brimonidine": ["alpha agonist", "alphagan", "antiglaucoma"],
    "dorzolamide": ["carbonic anhydrase inhibitor", "trusopt", "antiglaucoma"],
    "pilocarpine": ["miotic", "cholinergic", "pilocarpine drops"],
    "atropine": ["cycloplegic", "mydriatic", "atropine sulphate"],
    "prednisolone": ["steroid", "pred forte", "corticosteroid eye drop"],
    "moxifloxacin": ["fluoroquinolone", "vigamox", "antibiotic eye drop"],
    "artificial tears": ["lubricant", "tear substitute", "carboxymethylcellulose"],
}


def _tokenize(text: str) -> set[str]:
    """Split text into a set of meaningful lowercase tokens."""
    if not text:
        return set()
    tokens = re.split(r"\W+", text.lower())
    return {t for t in tokens if len(t) >= 2 and t not in _STOPWORDS}


def _jaccard(a: set[str], b: set[str]) -> float:
    """Jaccard similarity between two token sets."""
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


# ── Medical Query Expansion ────────────────────────────────────────────────

def _expand_medical_terms(query: str) -> str:
    """Expand a query by appending medical synonyms for recognised terms.

    E.g. "IOP trends in glaucoma" →
         "IOP intraocular pressure tonometry applanation trends in glaucoma
          optic neuropathy raised iop visual field loss disc cupping"
    """
    query_lower = query.lower()
    tokens = set(re.split(r"\W+", query_lower))
    expansions: list[str] = []

    # Also check bigrams/trigrams for multi-word keys
    for term, synonyms in _MEDICAL_SYNONYMS.items():
        if term in query_lower or term in tokens:
            for syn in synonyms:
                if syn.lower() not in query_lower:
                    expansions.append(syn)

    if expansions:
        return query + " " + " ".join(expansions[:12])  # cap expansion length
    return query


def expand_query_multistep(query: str, patient_context: dict | None = None) -> list[str]:
    """Multi-step query expansion: decompose a clinical query into precise sub-queries.

    Step 1: Extract clinical facets (diagnosis, examination, management, prognosis)
    Step 2: Expand medical synonyms/abbreviations for each facet
    Step 3: Optionally inject patient-specific context (diagnosis, medications)

    Returns 2-4 sub-queries that together cover the clinical breadth.
    """
    query_clean = query.strip()
    if not query_clean:
        return [query]

    # ── Step 1: facet decomposition ──
    # Detect if query mentions specific clinical aspects
    query_lower = query_clean.lower()

    sub_queries: list[str] = []

    # Always include the original (expanded) as the primary query
    sub_queries.append(_expand_medical_terms(query_clean))

    # Facet: diagnosis / condition identification
    diagnosis_keywords = [
        "diagnosis", "diagnose", "assessment", "clinical features",
        "signs", "symptoms", "presentation", "findings",
    ]
    management_keywords = [
        "management", "treatment", "therapy", "guideline", "protocol",
        "procedure", "surgery", "medication", "drug", "drops",
    ]
    prognosis_keywords = [
        "prognosis", "outcome", "complication", "risk", "progression",
        "follow up", "monitoring",
    ]

    has_diagnosis = any(k in query_lower for k in diagnosis_keywords)
    has_management = any(k in query_lower for k in management_keywords)
    has_prognosis = any(k in query_lower for k in prognosis_keywords)

    # Extract the core medical entity from the query (largest non-stopword phrase)
    # Simple heuristic: take key medical terms from the query
    medical_terms = []
    for term in _MEDICAL_SYNONYMS:
        if term in query_lower:
            medical_terms.append(term)

    # If no specific medical term found, use the whole query minus common verbs
    entity_phrase = " ".join(medical_terms) if medical_terms else query_clean

    # Add missing facets as sub-queries
    if not has_diagnosis:
        sub_queries.append(
            _expand_medical_terms(
                f"clinical features diagnosis signs of {entity_phrase}"
            )
        )

    if not has_management:
        sub_queries.append(
            _expand_medical_terms(
                f"treatment management guidelines for {entity_phrase}"
            )
        )

    if not has_prognosis and len(sub_queries) < 4:
        sub_queries.append(
            _expand_medical_terms(
                f"complications prognosis follow up {entity_phrase}"
            )
        )

    # ── Step 2: patient-context injection ──
    if patient_context:
        dx = patient_context.get("diagnosis", "")
        meds = patient_context.get("medications", [])
        conditions = patient_context.get("conditions", [])

        if dx and dx.lower() not in query_lower:
            sub_queries.append(
                _expand_medical_terms(f"{dx} ophthalmic management clinical approach")
            )

        if conditions:
            cond_str = " ".join(conditions[:3])
            if cond_str.lower() not in query_lower:
                sub_queries.append(
                    _expand_medical_terms(
                        f"ocular implications of {cond_str} on eye surgery"
                    )
                )

    # Deduplicate and limit to 4 sub-queries
    seen = set()
    unique: list[str] = []
    for q in sub_queries:
        q_key = q.lower().strip()
        if q_key not in seen:
            seen.add(q_key)
            unique.append(q)
        if len(unique) >= 4:
            break

    return unique


# ── ChromaDB / Embedding singletons ────────────────────────────────────────

def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        if EMBED_OFFLINE:
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

        kwargs = {}
        if EMBED_CACHE_DIR:
            kwargs["cache_folder"] = EMBED_CACHE_DIR

        _embedder = SentenceTransformer(MODEL_NAME, **kwargs)
    return _embedder


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection

    _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    _collection = _client.get_or_create_collection(name=COLLECTION_NAME)
    return _collection


# ── BM25 keyword scoring (lightweight, no external deps) ───────────────────

def _bm25_score_batch(
    query_tokens: set[str],
    doc_token_lists: list[list[str]],
    k1: float = 1.5,
    b: float = 0.75,
) -> list[float]:
    """Score documents against query using BM25.

    Operates only on the candidate set (not the full 26K corpus).
    Uses document-frequency computed over the candidate batch itself,
    which is statistically valid when candidates are pre-filtered by
    the dense vector search (they're all topically related).
    """
    n = len(doc_token_lists)
    if n == 0:
        return []
    if not query_tokens:
        return [0.0] * n

    # Average document length
    doc_lengths = [len(dl) for dl in doc_token_lists]
    avg_dl = sum(doc_lengths) / n if n > 0 else 1.0

    # Document frequency for each query token
    df: dict[str, int] = {}
    for qt in query_tokens:
        df[qt] = sum(1 for dl in doc_token_lists if qt in dl)

    scores: list[float] = []
    for i, dl in enumerate(doc_token_lists):
        score = 0.0
        dl_len = doc_lengths[i]
        # Term frequency in this doc
        tf_counts: dict[str, int] = {}
        for t in dl:
            tf_counts[t] = tf_counts.get(t, 0) + 1

        for qt in query_tokens:
            if qt not in tf_counts:
                continue
            tf = tf_counts[qt]
            doc_freq = df.get(qt, 0)
            # IDF with smoothing
            idf = math.log((n - doc_freq + 0.5) / (doc_freq + 0.5) + 1.0)
            # BM25 TF normalization
            tf_norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl_len / avg_dl))
            score += idf * tf_norm

        scores.append(score)

    return scores


# ── Reciprocal Rank Fusion ──────────────────────────────────────────────────

def _reciprocal_rank_fusion(
    rank_lists: list[list[int]],
    k: int = 60,
) -> list[tuple[int, float]]:
    """Merge multiple ranked lists using RRF.

    Args:
        rank_lists: Each list contains document indices ordered by rank.
        k:          RRF constant (default 60, standard in literature).

    Returns:
        List of (doc_index, rrf_score) sorted descending by score.
    """
    scores: dict[int, float] = {}
    for ranked in rank_lists:
        for rank_pos, doc_idx in enumerate(ranked):
            scores[doc_idx] = scores.get(doc_idx, 0.0) + 1.0 / (k + rank_pos + 1)

    # Sort by RRF score descending
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


# ── MMR re-ranking ──────────────────────────────────────────────────────────

def _mmr_rerank(
    query: str,
    texts: list[str],
    scores: list[float],
    k: int,
    lambda_param: float = 0.7,
) -> list[int]:
    """Pick k indices from texts using Maximal Marginal Relevance."""
    if not texts:
        return []

    n = len(texts)
    k = min(k, n)

    # Normalise scores to [0, 1]
    min_s = min(scores)
    max_s = max(scores)
    if max_s - min_s > 0:
        norm = [(s - min_s) / (max_s - min_s) for s in scores]
    else:
        norm = [1.0] * n

    token_sets = [_tokenize(t) for t in texts]

    remaining = list(range(n))
    selected: list[int] = []

    # First pick: highest score
    first = max(remaining, key=lambda i: norm[i])
    selected.append(first)
    remaining.remove(first)

    # Subsequent picks: MMR
    while len(selected) < k and remaining:
        best_idx = None
        best_mmr = -float("inf")
        for idx in remaining:
            max_sim = max(_jaccard(token_sets[idx], token_sets[s]) for s in selected)
            mmr = lambda_param * norm[idx] - (1 - lambda_param) * max_sim
            if mmr > best_mmr:
                best_mmr = mmr
                best_idx = idx
        if best_idx is None:
            break
        selected.append(best_idx)
        remaining.remove(best_idx)

    return selected


# ── Public API ──────────────────────────────────────────────────────────────

def search_knowledge(
    query: str,
    top_k: int = 3,
    patient_context: dict | None = None,
) -> list[str]:
    """Retrieve top_k relevant and diverse knowledge chunks for a query.

    Full pipeline:
      1. Multi-step query expansion (medical synonyms + facet decomposition)
      2. For each sub-query:
         a. Dense vector search → candidate chunks
         b. BM25 keyword scoring on candidates
         c. RRF fusion of dense rank + BM25 rank
      3. Union + deduplicate all sub-query results
      4. MMR re-rank for diversity → return top_k
    """
    if not query or not query.strip():
        return []

    embedder = _get_embedder()
    collection = _get_collection()
    
    # [Optional Upgrade] Auto-detect specialty from query if not provided
    if not patient_context:
        patient_context = {}
        
    if not patient_context.get("specialty"):
        q_lower = query.lower()
        if any(w in q_lower for w in ["iop", "cup", "disc", "glaucoma", "angle"]):
             patient_context["specialty"] = "glaucoma"
        elif any(w in q_lower for w in ["macula", "retina", "vitreous", "detach", "diabetic", "pdr", "npdr"]):
             patient_context["specialty"] = "retina"
        elif any(w in q_lower for w in ["cornea", "conjunctiva", "ulcer", "edema", "hyphema"]):
             patient_context["specialty"] = "cornea"
        elif "cataract" in q_lower or "iol" in q_lower or "lens" in q_lower:
             patient_context["specialty"] = "cataract"

    # ── Step 1: Multi-step query expansion ──
    sub_queries = expand_query_multistep(query.strip(), patient_context)

    # Accumulate candidate texts with their best RRF score
    candidate_scores: dict[str, float] = {}  # text -> best RRF score
    fetch_per_query = max(top_k * 4, 12)

    for sq in sub_queries:
        # ── Step 2a: Dense vector search with metadata filtering ──
        embedding = embedder.encode(sq).tolist()
        
        # [Step - New] Apply metadata filter if context provided
        filter_dict = None
        if patient_context:
            specialty = patient_context.get("specialty")
            chapter = patient_context.get("chapter")
            
            if specialty:
                filter_dict = {"specialty": specialty}
            elif chapter:
                filter_dict = {"chapter": chapter}

        results = collection.query(
            query_embeddings=[embedding],
            n_results=fetch_per_query,
            where=filter_dict,
            include=["documents", "distances"],
        )

        all_docs = results.get("documents", [])
        if not all_docs:
            continue
        docs = all_docs[0]

        all_dists = results.get("distances", [])
        distances = all_dists[0] if all_dists else []

        if not docs:
            continue

        # Dense ranking (lower distance = better rank)
        dense_rank = list(range(len(docs)))  # already sorted by ChromaDB

        # ── Step 2b: BM25 scoring on candidates ──
        expanded_query = _expand_medical_terms(sq)
        query_tokens = _tokenize(expanded_query)
        doc_token_lists = [list(re.split(r"\W+", d.lower())) for d in docs]

        bm25_scores = _bm25_score_batch(query_tokens, doc_token_lists)

        # BM25 ranking (sort indices by score descending)
        bm25_rank = sorted(range(len(docs)), key=lambda i: bm25_scores[i], reverse=True)

        # ── Step 2c: RRF fusion ──
        rrf_results = _reciprocal_rank_fusion([dense_rank, bm25_rank], k=60)

        # Store best RRF score per unique text
        for doc_idx, rrf_score in rrf_results:
            text = docs[doc_idx]
            if text not in candidate_scores or rrf_score > candidate_scores[text]:
                candidate_scores[text] = rrf_score

    if not candidate_scores:
        return []

    # ── Step 3: Collect unique candidates sorted by RRF score ──
    sorted_candidates = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)
    top_texts = [t for t, _ in sorted_candidates]
    top_scores = [s for _, s in sorted_candidates]

    # ── Step 4: MMR re-rank for diversity ──
    selected_indices = _mmr_rerank(query, top_texts, top_scores, k=top_k, lambda_param=0.7)

    # Return scored dicts so callers can apply a relevance threshold
    results = [
        {"text": top_texts[i], "score": candidate_scores[top_texts[i]]}
        for i in selected_indices
    ]
    return results


def search_per_signal(
    signals: list[dict] | list[str],
    top_k_per_signal: int = 2,
) -> dict[str, list[dict]]:
    """Retrieve evidence for each clinical signal independently.

    Args:
        signals: List of Signal Objects (dict) OR strings (legacy).
                 Signal Object: {"original_text": "...", "normalized_query": "..."}
        top_k_per_signal: How many evidence chunks per signal.

    Returns:
        Dict mapping signal['original_text'] → list of {"text": ..., "score": ...} evidence chunks.
    """
    if not signals:
        return {}

    result: dict[str, list[dict]] = {}

    for signal in signals:
        # Handle both SignalObject dict and legacy string
        if isinstance(signal, dict):
            query = signal.get("normalized_query", "")
            key = signal.get("original_text", "")
        else:
            query = str(signal)
            key = str(signal)
            
        if not query or not query.strip():
            continue
            
        chunks = search_knowledge(query.strip(), top_k=top_k_per_signal)
        if chunks:
            result[key] = chunks

    return result
