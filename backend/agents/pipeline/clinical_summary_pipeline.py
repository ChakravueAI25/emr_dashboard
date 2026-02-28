import traceback
from agents.signal_extractor import extract_signals, extract_context
from agents.inference.clinical_ranker import rank_clinical_signals
from agents.inference.clinical_inference import infer_condition
from agents.knowledge_retriever import search_knowledge
from agents.llm_agent import _call_ollama

_TAG = "[AI-PIPELINE]"

_POINT4_CHAR_THRESHOLD = 50   # if point 4 text exceeds this, split into Dx/Advise


# ── helpers ────────────────────────────────────────────────────────────────

def _format_point4(raw: str) -> str:
    """Parse Ollama output into a compact Dx / Advise format.

    If the model already returned 'Dx: …\nAdvise: …' lines, use them.
    Otherwise, if the text is short (≤ _POINT4_CHAR_THRESHOLD), keep as-is.
    If long, try to split into Dx + Advise heuristically.
    """
    import re as _re
    cleaned = raw.replace("\n", " ").strip()

    # Try to parse structured Dx: / Advise: lines from model output
    dx_match = _re.search(r"(?:Dx|Diagnosis|Likely)[:\s]+(.+?)(?:\.|$)", cleaned, _re.IGNORECASE)
    adv_match = _re.search(r"(?:Advise|Advice|Recommend(?:ation)?|Next step)[:\s]+(.+?)(?:\.|$)", cleaned, _re.IGNORECASE)

    if dx_match and adv_match:
        dx = dx_match.group(1).strip().rstrip(".")
        adv = adv_match.group(1).strip().rstrip(".")
        return f"Likely Dx: {dx}. Advise: {adv}."

    # Short enough → keep as-is (single-line)
    if len(cleaned) <= _POINT4_CHAR_THRESHOLD:
        if not cleaned.endswith("."):
            cleaned += "."
        return cleaned

    # Long unstructured → take first two sentences
    sentences = [s.strip() for s in cleaned.split(". ") if s.strip()]
    text = ". ".join(sentences[:2])
    if not text.endswith("."):
        text += "."
    return text


def _build_points_1_to_3(ranked: list[str], context: dict) -> list[str]:
    """Always return exactly 3 finding/contextual strings.

    Strategy:
      • Use ranked clinical findings first.
      • If fewer than 3, pad with context_lines (IOP/VA trends, meds, etc.).
    """
    points: list[str] = []

    # Add ranked findings
    for sig in ranked:
        if len(points) >= 3:
            break
        points.append(sig)

    # Pad from context_lines (trends, meds, history, demographics)
    used_texts = set(p.lower() for p in points)
    for line in context.get("context_lines", []):
        if len(points) >= 3:
            break
        if line.lower() not in used_texts:
            points.append(line)
            used_texts.add(line.lower())

    # Last-resort padding
    while len(points) < 3:
        points.append("No additional clinical data recorded for this visit")

    return points[:3]


def _build_ollama_prompt(ranked: list[str], context: dict, kb_excerpts: list[str]) -> str:
    """Build a prompt for Ollama to generate clinical inference (point 4)."""

    # Patient context block
    parts = []
    age = context.get("demographics", {}).get("age", "")
    sex = context.get("demographics", {}).get("sex", "")
    if age or sex:
        parts.append(f"Patient: {age} {sex}".strip())

    if context.get("iop_trend_re") or context.get("iop_trend_le"):
        iop_parts = []
        if context.get("iop_trend_re"):
            iop_parts.append(f"RE {context['iop_trend_re']}")
        if context.get("iop_trend_le"):
            iop_parts.append(f"LE {context['iop_trend_le']}")
        parts.append(f"IOP: {', '.join(iop_parts)}")

    if context.get("vision_trend_re") or context.get("vision_trend_le"):
        va_parts = []
        if context.get("vision_trend_re"):
            va_parts.append(f"RE {context['vision_trend_re']}")
        if context.get("vision_trend_le"):
            va_parts.append(f"LE {context['vision_trend_le']}")
        parts.append(f"VA: {', '.join(va_parts)}")

    if context.get("medications"):
        parts.append(f"Current medications: {', '.join(context['medications'][:6])}")

    if context.get("medical_conditions"):
        parts.append(f"Systemic conditions: {', '.join(context['medical_conditions'])}")

    if context.get("surgical_history"):
        parts.append(f"Past surgeries: {', '.join(context['surgical_history'])}")

    if context.get("diagnoses"):
        parts.append(f"Diagnoses: {', '.join(context['diagnoses'][:4])}")

    patient_block = "\n".join(parts) if parts else "No additional patient context."

    # Clinical findings block
    findings_block = "\n".join(f"- {s}" for s in ranked[:5]) if ranked else "No abnormal signals detected."

    # Knowledge base block
    if kb_excerpts:
        kb_block = "\n---\n".join(kb_excerpts[:3])
    else:
        kb_block = "No relevant textbook excerpts found."

    prompt = f"""### Clinical Findings
{findings_block}

### Patient Context
{patient_block}

### Textbook Reference
{kb_block}

### Task
Based on the clinical findings, patient context, and textbook reference above, respond in EXACTLY this format (no extra text):
Dx: <most likely diagnosis in ≤10 words>
Advise: <recommended next step in ≤12 words>
Do NOT repeat the findings."""

    return prompt


_SYSTEM_PROMPT = (
    "You are an experienced ophthalmologist reviewing a patient chart. "
    "Always reply in exactly two lines: Dx: ... and Advise: ... "
    "Be concise. No disclaimers."
)


# ── main entry ─────────────────────────────────────────────────────────────

def generate_final_summary(patient_doc: dict) -> str:
    """Generate a 4-point clinical summary:
       Points 1-3: Top ranked clinical findings (padded with context if needed)
       Point 4:    AI inference from Ollama + ChromaDB knowledge base
    """

    pid = patient_doc.get("_id", patient_doc.get("registrationId", "?"))
    name = patient_doc.get("name", "?")
    print(f"{_TAG} ▶ START  patient={pid}  name={name}")

    # ── Step 1: Extract signals ──
    signal_groups = extract_signals(patient_doc)
    total_signals = sum(len(g) for g in signal_groups.values())
    print(f"{_TAG}   Step 1a — extract_signals → {total_signals} signal(s)")
    for grp, items in signal_groups.items():
        for s in items:
            txt = s.get("original_text", s) if isinstance(s, dict) else s
            print(f"{_TAG}     [{grp}] {txt}")

    # ── Step 1b: Extract context ──
    context = extract_context(patient_doc)
    print(f"{_TAG}   Step 1b — extract_context → {context.get('visit_count', 0)} visit(s), "
          f"{len(context.get('context_lines', []))} context line(s)")
    for cl in context.get("context_lines", []):
        print(f"{_TAG}     ctx: {cl}")

    # Flatten signals
    flat_signals = []
    for group in signal_groups.values():
        for s in group:
            if isinstance(s, dict):
                flat_signals.append(s.get("original_text", ""))
            else:
                flat_signals.append(str(s))
    flat_signals = [s for s in flat_signals if s]

    # ── Step 2: Rank signals ──
    ranked = rank_clinical_signals(flat_signals) if flat_signals else []
    print(f"{_TAG}   Step 2 — ranked {len(ranked)} signal(s)")
    for i, r in enumerate(ranked):
        print(f"{_TAG}     {i+1}. {r}")

    # ── Step 3: Build points 1–3 (always exactly 3) ──
    points_1_to_3 = _build_points_1_to_3(ranked, context)
    print(f"{_TAG}   Step 3 — points 1-3:")
    for i, p in enumerate(points_1_to_3, 1):
        print(f"{_TAG}     {i}. {p}")

    # ── Step 4: Build point 4 — AI inference (ChromaDB + Ollama) ──
    inference_text = ""
    try:
        # 4a: Query ChromaDB with top signals
        query_text = "; ".join(ranked[:3]) if ranked else "; ".join(context.get("context_lines", [])[:2])
        if query_text:
            print(f"{_TAG}   Step 4a — ChromaDB query: {query_text[:100]}...")
            kb_results = search_knowledge(query_text, top_k=3)
            kb_texts = [r["text"] if isinstance(r, dict) else str(r) for r in kb_results]
            print(f"{_TAG}   Step 4a — got {len(kb_texts)} knowledge chunk(s)")
            for i, t in enumerate(kb_texts):
                print(f"{_TAG}     KB[{i}]: {t[:80]}...")
        else:
            kb_texts = []
            print(f"{_TAG}   Step 4a — no query text, skipping ChromaDB")

        # 4b: Call Ollama for inference
        prompt = _build_ollama_prompt(ranked, context, kb_texts)
        print(f"{_TAG}   Step 4b — calling Ollama...")
        raw_response = _call_ollama(prompt, system=_SYSTEM_PROMPT, temperature=0.2)
        raw_response = raw_response.strip()
        print(f"{_TAG}   Step 4b — Ollama response: {raw_response[:200]}")

        if raw_response and len(raw_response) > 10:
            inference_text = _format_point4(raw_response)
        else:
            print(f"{_TAG}   Step 4b — Ollama response too short, falling back to deterministic")

    except Exception as e:
        print(f"{_TAG}   Step 4 — Ollama/ChromaDB error: {e}")
        traceback.print_exc()

    # 4c: Fallback to deterministic inference if Ollama failed
    if not inference_text:
        print(f"{_TAG}   Step 4c — using deterministic fallback")
        inf = infer_condition(ranked if ranked else flat_signals)
        if inf and inf.get("condition"):
            cond = inf["condition"]
            conf = inf.get("confidence", "moderate")
            inference_text = f"Findings suggest {cond} ({conf} confidence)"
            print(f"{_TAG}   Step 4c — fallback inference: {inference_text}")
        else:
            inference_text = "Clinical correlation and follow-up recommended"
            print(f"{_TAG}   Step 4c — no condition matched, using generic recommendation")

    # ── Step 5: Assemble final 4-point summary ──
    lines = []
    for i, finding in enumerate(points_1_to_3, 1):
        lines.append(f"{i}. {finding}")
    lines.append(f"4. {inference_text}")

    summary = "\n".join(lines)
    print(f"{_TAG}   Final summary:\n{summary}")
    print(f"{_TAG} ◀ DONE")
    return summary

