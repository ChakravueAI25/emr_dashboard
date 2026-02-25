# llm_agent.py

import math
import re
import string
import requests
import json
import os
from pathlib import Path
from pymongo import MongoClient
from agents.inference.clinical_inference import infer_condition


# Local Mongo connection
mongo_client = MongoClient("mongodb://localhost:27017")
feedback_db = mongo_client["hospital-emr"]


def _get_recent_feedback(patient_id: str, limit: int = 3) -> str:
    """
    Fetch last few doctor feedback comments.
    """
    if not patient_id:
        return ""
        
    try:
        docs = list(
            feedback_db["doctor_feedback"]
            .find({"patientId": patient_id})
            .sort("createdAt", -1)
            .limit(limit)
        )

        feedback_texts = [d.get("feedback", "") for d in docs if d.get("feedback")]

        if not feedback_texts:
            return ""

        return "\n".join(feedback_texts)
    except Exception as e:
        print(f"Error fetching feedback: {e}")
        return ""


# import torch
# from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

# ── CONFIGURATION ──
USE_OLLAMA = True
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = "llama3.1:latest"

# MODEL_PATH = str(Path(__file__).resolve().parents[1] / "models" / "deepseek-1.5b")

# bnb_config = BitsAndBytesConfig(
#     load_in_4bit=True,
#     bnb_4bit_compute_dtype=torch.float16,
#     bnb_4bit_quant_type="nf4",
#     bnb_4bit_use_double_quant=True,
# )

# tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, use_fast=True)
# if tokenizer.pad_token is None:
#     tokenizer.pad_token = tokenizer.eos_token

# model = AutoModelForCausalLM.from_pretrained(
#     MODEL_PATH,
#     quantization_config=bnb_config,
#     device_map="auto",
#     torch_dtype=torch.float16
# )
# # Ensure the model is in eval mode
# model.eval()
# model.config.use_cache = True

def _call_ollama(prompt: str, system: str = "", temperature: float = 0.1, stop: list = None) -> str:
    """Call local Ollama API."""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": 400,
            "stop": stop or []
        }
    }
    
    try:
        resp = requests.post(url, json=payload)
        resp.raise_for_status()
        return resp.json().get("response", "")
    except Exception as e:
        print(f"[OLLAMA ERROR] {e}")
        return ""

# ── Paragraph clinical scoring (Patch A1) ──────────────────────────────────

_CLINICAL_KEYWORDS = {
    "iop", "mmhg", "va", "visual acuity", "cup", "disc", "cupping", "field",
    "oct", "gonioscopy", "lpi", "trabeculectomy", "phaco", "recommend", "follow-up",
    "followup", "recommendation", "worse", "worsening", "progression", "escalate",
    "increase", "decrease", "stable", "rx:", "dx:", "→", "->",
    "shallow", "narrow", "angle", "pilocarpine", "glaucoma", "cataract",
    "diabetic", "retinopathy", "fundus", "cornea", "lens", "vitreous",
}


def _score_paragraph_clinicalness(p: str) -> float:
    """Score paragraph by how many clinical keywords it contains (normalized)."""
    if not p or not p.strip():
        return 0.0
    p_low = p.lower()
    tokens = re.split(r"\W+", p_low)
    if not tokens:
        return 0.0
    kw_count = sum(1 for k in _CLINICAL_KEYWORDS if k in p_low)
    num_count = len(re.findall(r"\b\d{1,3}\b", p))
    arrow_count = p.count("→") + p.count("->")
    length_factor = min(1.0, len(tokens) / 20.0)
    score = (kw_count * 2.0) + (num_count * 1.2) + (arrow_count * 2.5)
    
    # Patch 4: Strengthen Paragraph Selector
    if "start with" in p_low or "describe" in p_low or "end with" in p_low:
        score -= 5.0
        
    return score * length_factor


def _pick_best_paragraph(raw: str) -> str:
    """
    Select the most clinically meaningful paragraph from LLM output.
    Explicitly removes instruction / planning / meta reasoning text first.
    """

    if not raw or not raw.strip():
        return raw.strip()

    # Split paragraphs
    paragraphs = [p.strip() for p in re.split(r"\n{1,4}", raw) if p.strip()]
    if not paragraphs:
        return raw.strip()

    # 🔴 STEP 1 — REMOVE instruction/meta paragraphs completely
    CLEANED = []

    BAD_PHRASES = [
        "start by",
        "then discuss",
        "impact of visit",
        "end with",
        "write the paragraph",
        "rules:",
        "paragraph:",
        "step by step",
        "let me",
        "we have",
        "okay",
        "analysis",
        "think",
        "based on the problem",
        "to answer",
    ]

    for p in paragraphs:
        low = p.lower()

        # Skip instruction/planning paragraphs
        if any(bp in low for bp in BAD_PHRASES):
            continue

        # Skip extremely short fragments
        if len(p.split()) < 6:
            continue

        CLEANED.append(p)

    # If everything removed, fallback to original paragraphs
    if not CLEANED:
        CLEANED = paragraphs

    # 🔴 STEP 2 — Score clinical relevance
    def score_para(p: str) -> float:
        p_low = p.lower()

        clinical_score = 0

        # Reward clinical keywords
        for kw in _CLINICAL_KEYWORDS:
            if kw in p_low:
                clinical_score += 2

        # Reward numbers (important for trends)
        clinical_score += len(re.findall(r"\b\d{1,3}\b", p)) * 1.5

        # Reward arrows (trend indicator)
        clinical_score += p.count("→") * 4

        # Penalize narrative fluff
        if any(w in p_low for w in ["patient reports", "it is noted", "appears to"]):
            clinical_score -= 3

        return clinical_score

    best_para = max(CLEANED, key=score_para)

    # FINAL SAFETY FILTER
    BANNED_WORDS = [
        "possible",
        "suggest",
        "likely",
        "diagnosis",
        "consistent with",
        "may indicate",
    ]

    best_para_lower = best_para.lower()
    for word in BANNED_WORDS:
        if word in best_para_lower:
            # Case insensitive replacement wrapper would be better, but user provided simple replace. 
            # I will use re.sub for case insensitivity to be safer and correct.
            best_para = re.sub(re.escape(word), "", best_para, flags=re.IGNORECASE)

    return best_para.strip()


# ── Deterministic rule-based trend summariser (Patch A2) ───────────────────

def _extract_numeric_sequence(values: list[str]) -> list[float]:
    out = []
    for v in values:
        if not isinstance(v, str):
            v = str(v)
        m = re.search(r"(\d+(?:\.\d+)?)", v)
        if m:
            try:
                out.append(float(m.group(1)))
            except Exception:
                continue
    return out


def _deterministic_trend_summary(
    visits: list[dict],
    guideline_context_short: str | None = None,
    patient_header: str = "Patient",
    risk_signals: list[str] | None = None,
) -> str | None:
    """If there is a clear numeric trend in IOP or VA, produce a deterministic
    1-2 sentence clinical summary with explicit numbers and a rule-based
    recommendation.  Returns None if no confident deterministic summary.
    """
    iop_re, iop_le, va_re, va_le = [], [], [], []

    for v in visits:
        iop = v.get("iop", {})
        if isinstance(iop, dict):
            re_v = iop.get("re") or iop.get("RE") or iop.get("right") or iop.get("rightEye")
            le_v = iop.get("le") or iop.get("LE") or iop.get("left") or iop.get("leftEye")
            if re_v:
                iop_re.append(str(re_v))
            if le_v:
                iop_le.append(str(le_v))
        vision = v.get("vision", {})
        found_re, found_le = None, None
        for vtype in ["unaided", "withGlass", "bestCorrected", "withPinhole"]:
            vd = vision.get(vtype, {})
            if isinstance(vd, dict):
                found_re = vd.get("rightEye") or vd.get("re") or vd.get("right")
                found_le = vd.get("leftEye") or vd.get("le") or vd.get("left")
                if found_re or found_le:
                    break
        if not found_re and not found_le:
            found_re = vision.get("re") or vision.get("right") or vision.get("RE")
            found_le = vision.get("le") or vision.get("left") or vision.get("LE")
        if found_re:
            va_re.append(str(found_re))
        if found_le:
            va_le.append(str(found_le))

    # ── IOP deterministic rule ──
    iop_re_nums = _extract_numeric_sequence(iop_re)
    if len(iop_re_nums) >= 2:
        arrow = " → ".join(str(int(x)) for x in iop_re_nums)
        last = iop_re_nums[-1]
        first = iop_re_nums[0]
        if last >= 21:
            rec = "Recommend medication escalation and visual field testing."
        elif last > first + 2:
            rec = "Monitor closely; consider therapy if trend continues."
        else:
            rec = "Continue current management and follow-up."
        guid = ""
        if guideline_context_short:
            guid = f" According to retrieved guidelines, {guideline_context_short.split('.')[0]}."
        risk_part = ""
        if risk_signals:
            risk_part = " " + "; ".join(risk_signals) + "."
        summary = f"Over {len(iop_re_nums)} visits, IOP increased from {arrow} mmHg.{guid}{risk_part} {rec}"
        return _strip_patient_name(summary.strip(), patient_header)

    # ── VA deterministic summary ──
    if va_re and len(va_re) >= 2:
        arrow_va_re = " → ".join(va_re)
        arrow_va_le = " → ".join(va_le) if va_le else ""
        summary = f"Over {len(va_re)} visits, VA RE {arrow_va_re}"
        if arrow_va_le:
            summary += f", LE {arrow_va_le}."
        else:
            summary += "."
        risk_part = ""
        if risk_signals:
            risk_part = " " + "; ".join(risk_signals) + "."
        summary += f"{risk_part} Continue refractive correction and follow-up."
        return _strip_patient_name(summary.strip(), patient_header)

    return None


# ── Patient name stripper ──────────────────────────────────────────────────

def _strip_patient_name(text: str, patient_name: str = "") -> str:
    """Remove patient name from output text for privacy."""
    if not text:
        return text
    if patient_name:
        # Remove full name and any name/age/sex header like "Name/Age/Sex:"
        # Handle patterns: "Name/Age/Sex:", "Name:", standalone name
        name_parts = patient_name.split("/")  # e.g. "Priya Verma/12/Female"
        actual_name = name_parts[0].strip()
        if actual_name:
            # Remove "Name/Age/Sex:" pattern
            text = re.sub(re.escape(patient_name) + r"\s*:?\s*", "", text)
            # Remove standalone name
            text = re.sub(r"\b" + re.escape(actual_name) + r"\b\s*", "", text, flags=re.IGNORECASE)
    # Generic: strip any "Mr./Mrs./Ms./Dr." + capitalized name pattern
    text = re.sub(r"\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Smt\.?|Shri\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*", "", text)
    # Clean up leading punctuation/whitespace artifacts
    text = re.sub(r"^[\s:,;./-]+", "", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def _generate(prompt_text: str, max_tokens: int = 300) -> str:
    """
    Deterministic clinical text generation + aggressive cleaning.
    """
    if USE_OLLAMA:
        SYSTEM_PROMPT = """
You are a STRICT clinical summarization engine.

RULES (NON-NEGOTIABLE):
1. ONLY use information explicitly provided in the signals.
2. NEVER add new diagnoses or diseases.
3. NEVER speculate or infer.
4. DO NOT suggest possible conditions.
5. DO NOT interpret beyond the given facts.
6. If a condition is not explicitly present, DO NOT mention it.
7. Output must be factual and concise.

Your task:
Summarize the clinical signals into a short objective paragraph.
"""
        raw = _call_ollama(
            prompt_text,
            system=SYSTEM_PROMPT,
            temperature=0.1
        )
    else:
        # Fallback to old behavior if somehow switched back (though imports are commented out)
        return "Ollama not configured and local model disabled."

    # HARD GROUNDING CHECK
    if len(raw.split()) > 80:
        raw = "Summary could not be generated from provided clinical signals."

    print(f"\n[LLM RAW OUTPUT] ({len(raw.split())} words):\n{raw}\n")

    # 🔴 STEP 1 — Pick best clinical paragraph
    cleaned = _pick_best_paragraph(raw)

    # 🔴 STEP 2 — Remove chain-of-thought remnants
    cleaned = re.sub(r"<.*?>", "", cleaned)
    cleaned = re.sub(r"</?think>", "", cleaned, flags=re.IGNORECASE)

    # 🔴 STEP 3 — Remove common LLM garbage patterns
    GARBAGE = [
        r"^analysis.*",
        r"^let me.*",
        r"^okay.*",
        r"^to answer.*",
        r"^based on.*",
        r"^here is.*",
        r"^in summary.*",
    ]

    for pat in GARBAGE:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE)

    # 🔴 STEP 4 — Collapse into single paragraph
    cleaned = " ".join(cleaned.split())

    # 🔴 STEP 5 — Hard enforce 4–6 sentences max
    sentences = re.split(r'(?<=[.])\s+', cleaned)
    if len(sentences) > 6:
        cleaned = " ".join(sentences[:6])

    # 🔴 STEP 6 — Final whitespace cleanup
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()

    print(f"[LLM CLEANED OUTPUT] ({len(cleaned.split())} words):\n{cleaned}\n")

    return cleaned


def _enforce_word_limit(text: str, limit: int) -> str:
    """Hard-truncate output to *limit* words, finishing on a clean sentence."""
    words = text.split()
    if len(words) <= limit:
        return text
    truncated = " ".join(words[:limit])
    # Try to end on a sentence boundary
    for sep in (".", ",", ";"):
        idx = truncated.rfind(sep)
        if idx > len(truncated) // 2:
            return truncated[: idx + 1]
    return truncated + "."


def _format_eye_visit(v: dict) -> str:
    """Compact single-line formatting for one visit's eye data — used by legacy callers."""
    from agents.retrival_agent1 import _extract_vision_line, _extract_iop_line
    vis_str = _extract_vision_line(v.get("vision", {})) or "VA:N/R"
    iop_str = _extract_iop_line(v.get("iop", {})) or "IOP:N/R"
    dx = v.get("diagnosis", "")
    rx = v.get("prescription", [])
    rx_names = ", ".join(
        m.get("name", str(m)) if isinstance(m, dict) else str(m) for m in rx[:4]
    ) if rx else "nil"
    parts = [vis_str, iop_str]
    if dx:
        parts.append(f"Dx:{dx}")
    parts.append(f"Rx:[{rx_names}]")
    return " | ".join(parts)


def _format_systemic_visit(v: dict) -> str:
    """Legacy compact systemic formatter — kept for backward compat."""
    meds = v.get("medications", [])
    med_names = ", ".join(
        m.get("name", str(m)) if isinstance(m, dict) else str(m) for m in meds[:4]
    ) if meds else ""
    conditions = v.get("conditions", [])
    cond_str = ", ".join(
        c if isinstance(c, str) else (c.get("condition", c.get("name", str(c))) if isinstance(c, dict) else str(c))
        for c in conditions
    ) if conditions else ""
    parts = []
    if cond_str:
        parts.append(f"PMH:[{cond_str}]")
    if med_names:
        parts.append(f"Meds:[{med_names}]")
    return " | ".join(parts) if parts else ""


def _format_clinical_note(v: dict) -> str:
    """Format one visit into clean doctor-to-doctor clinical shorthand.
    
    Only includes fields that have actual data. Skips empty/N/R fields entirely.
    """
    from agents.retrival_agent1 import _extract_vision_line, _extract_iop_line

    sections = []

    # 1. Chief complaint
    cc = v.get("complaints", "")
    if cc:
        sections.append(f"C/C: {cc}")

    # 2. Vision
    vis = _extract_vision_line(v.get("vision", {}))
    if vis:
        sections.append(f"VA: {vis}")

    # 3. IOP
    iop = _extract_iop_line(v.get("iop", {}))
    if iop:
        sections.append(iop)

    # 4. Slit lamp / Ophthalmologist exam
    slit = v.get("slit_lamp", "")
    if slit:
        sections.append(f"SLE: {slit}")

    # 5. Diagnosis
    dx = v.get("diagnosis", "")
    if dx:
        sections.append(f"Dx: {dx}")

    # 6. Rx (prescription)
    rx = v.get("prescription", [])
    if rx:
        rx_parts = []
        for m in rx[:6]:
            if isinstance(m, dict):
                name = m.get("name", m.get("medicine", ""))
                dose = m.get("dosage", m.get("dose", ""))
                freq = m.get("frequency", "")
                eye = m.get("eye", "")
                p = name
                if dose:
                    p += f" {dose}"
                if freq:
                    p += f" {freq}"
                if eye:
                    p += f" ({eye})"
                rx_parts.append(p)
            elif isinstance(m, str) and m:
                rx_parts.append(m)
        if rx_parts:
            sections.append(f"Rx: {'; '.join(rx_parts)}")

    # 7. PMH (medical conditions)
    conditions = v.get("conditions", [])
    if conditions:
        sections.append(f"PMH: {', '.join(conditions)}")

    # 8. Surgical history
    surgeries = v.get("surgeries", [])
    if surgeries:
        sections.append(f"PSH: {', '.join(surgeries)}")

    # 9. Family history
    fhx = v.get("family_history", "")
    if fhx:
        sections.append(f"FHx: {fhx}")

    # 10. Current medications
    meds = v.get("medications", [])
    if meds:
        med_strs = []
        for m in meds[:6]:
            if isinstance(m, str):
                med_strs.append(m)
            elif isinstance(m, dict):
                med_strs.append(m.get("name", str(m)))
            else:
                med_strs.append(str(m))
        if med_strs:
            sections.append(f"CurrentMeds: {', '.join(med_strs)}")

    # 11. Vitals (BP, pulse, temp)
    vitals = v.get("vitals", {})
    if vitals and isinstance(vitals, dict):
        vparts = []
        bp = vitals.get("bloodPressure", vitals.get("bp", {}))
        if isinstance(bp, dict) and bp.get("systolic"):
            vparts.append(f"BP:{bp['systolic']}/{bp.get('diastolic','')}")
        elif bp and str(bp).strip():
            vparts.append(f"BP:{bp}")
        pulse = vitals.get("pulse", {})
        if isinstance(pulse, dict) and pulse.get("value"):
            vparts.append(f"Pulse:{pulse['value']}")
        elif pulse and str(pulse).strip():
            vparts.append(f"Pulse:{pulse}")
        if vparts:
            sections.append(" ".join(vparts))

    # 12. Follow-up
    fu = v.get("followUp", v.get("notes", ""))
    if fu:
        sections.append(f"F/U: {fu}")

    return "\n".join(sections)


def _summarize_to_80_words(full_text: str, name: str, max_tokens: int = 300) -> str:
    """Second prompt: condense a full clinical text into a narrative trend-aware paragraph."""
    print(f"\n[PROMPT 2 INPUT] Summarizing {len(full_text.split())} words...")

    # --- Clinical inference injection ---
    signals = [line.strip() for line in full_text.split("\n") if line.strip()]
    inf = infer_condition(signals)

    reasoning_block = ""
    inference_line = ""
    if inf and inf.get("condition"):
        cond = inf['condition']
        conf = inf.get('confidence', 'medium')
        inference_line = f"4. Findings suggest {cond} ({conf} confidence)."
        reasoning_block = f"""
Clinical reasoning:
Condition: {cond}
Evidence: {', '.join(inf.get('evidence', []))}
Confidence: {conf}
"""

    template = """
CLINICAL FINDINGS (FACTS ONLY):
{text}

{reasoning}

IMPORTANT RULES:
- Generate exactly 4 numbered bullet points based on the most critical findings.
- 1 = most important finding
- 2 = second strongest finding
- 3 = third strongest finding
- 4 = fourth strongest finding (or additional context)
- Use ONLY the findings above.
- Do NOT add any new disease names.
- Do NOT explain medical theory.
- Write only factual observations.
- Only mention abnormal or critical findings.

OUTPUT FORMAT:
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]
4. [Finding 4]
"""
    prompt = PromptTemplate(
        input_variables=["name", "text", "reasoning"],
        template=template,
    ).format(name=name, text=full_text, reasoning=reasoning_block)
    
    result = _generate(prompt, max_tokens)
    
    # Post-Processing to align with doctor requirements
    result = re.sub(r'<think>.*?</think>', '', result, flags=re.DOTALL)
    
    # USER REQUEST: Prefer RAW output (cleaned of conversational filler) 
    # to avoid regex stripping valid points.
    
    lines = [line.strip() for line in result.split('\n') if line.strip()]
    cleaned_lines = []
    
    started_content = False
    
    for line in lines:
        lower_line = line.lower()
        
        # Skip conversational headers until we hit content
        # Content usually starts with a number, bullet, or is not a known garbage phrase
        if not started_content:
            if (
                "here is" in lower_line 
                or "following is" in lower_line 
                or "based on" in lower_line 
                or lower_line == "summary:"
                or lower_line == "clinical summary:"
                or "**clinical summary**" in lower_line
                or (lower_line.endswith(":") and len(lower_line.split()) < 5)
            ):
                continue
            else:
                started_content = True
        
        cleaned_lines.append(line)
            
    final_text = "\n".join(cleaned_lines)
    
    # Append inference line logic
    if inference_line:
        # Heuristic: If we already have a list, try to continue numbering?
        # For simplicity/safety, just append. 
        # If the LLM gave 4 points, this will be a 5th item.
        # We replace the hardcoded "4." if we can guess better, otherwise keep it or drop number.
        
        # Check if last line starts with a number
        last_num = 0
        if cleaned_lines:
            last_line = cleaned_lines[-1]
            match = re.match(r'^(\d+)\.', last_line)
            if match:
                last_num = int(match.group(1))
        
        if last_num > 0:
            new_prefix = f"{last_num + 1}. "
            # Replace "4. " from inference_line with new number
            final_text += f"\n{inference_line.replace('4. ', new_prefix)}"
        else:
            # If no numbering detected, just append as is
            final_text += f"\n{inference_line}"
    
    if not final_text:
        final_text = "Findings noted; clinical correlation recommended."
        
    print(f"[FINAL SUMMARY] ({len(final_text.split())} words):\n{final_text}\n")
    return final_text


def _extract_trends(visits: list[dict]) -> str:
    """Extract clinical trends across visits for the LLM prompt.

    For multiple visits, returns a high-level trend string like:
      'Over 3 visits: IOP RE 14→18→23 mmHg (rising). VA RE 6/6→6/9→6/12.'

    For a single visit, returns a compact snapshot without forcing "trend" wording.
    """

    n = len(visits)
    if n == 0:
        return ""

    parts: list[str] = []
    if n > 1:
        parts.append(f"Over {n} visits")

    # --- IOP trend ---
    iop_re_vals, iop_le_vals = [], []
    for v in visits:
        iop = v.get("iop", {})
        if not iop or not isinstance(iop, dict):
            continue
        re_v = iop.get("re", iop.get("right", iop.get("RE", iop.get("rightEye", ""))))
        le_v = iop.get("le", iop.get("left", iop.get("LE", iop.get("leftEye", ""))))
        if re_v:
            try: iop_re_vals.append((str(re_v), float(re_v)))
            except (ValueError, TypeError): iop_re_vals.append((str(re_v), None))
        if le_v:
            try: iop_le_vals.append((str(le_v), float(le_v)))
            except (ValueError, TypeError): iop_le_vals.append((str(le_v), None))

    def _trend_word(nums: list) -> str:
        floats = [x for _, x in nums if x is not None]
        if len(floats) < 2:
            return ""
        if floats[-1] > floats[0] + 1:
            return "rising"
        if floats[-1] < floats[0] - 1:
            return "declining"
        return "stable"

    if iop_re_vals:
        arrow = " → ".join(s for s, _ in iop_re_vals)
        tw = _trend_word(iop_re_vals)
        iop_part = f"IOP RE {arrow} mmHg"
        if iop_le_vals:
            arrow_le = " → ".join(s for s, _ in iop_le_vals)
            iop_part += f", LE {arrow_le} mmHg"
        if tw:
            iop_part += f" ({tw})"
        parts.append(iop_part)

    # --- VA trend ---
    va_re_vals, va_le_vals = [], []
    for v in visits:
        vision = v.get("vision", {})
        if not vision or not isinstance(vision, dict):
            continue
        # Try nested structure first, then flat
        for vtype in ["unaided", "withGlass", "bestCorrected", "withPinhole"]:
            vd = vision.get(vtype, {})
            if isinstance(vd, dict):
                re_v = vd.get("rightEye", vd.get("re", vd.get("right", "")))
                le_v = vd.get("leftEye", vd.get("le", vd.get("left", "")))
                if re_v:
                    va_re_vals.append(str(re_v))
                if le_v:
                    va_le_vals.append(str(le_v))
                if re_v or le_v:
                    break
        else:
            re_v = vision.get("re", vision.get("right", vision.get("RE", "")))
            le_v = vision.get("le", vision.get("left", vision.get("LE", "")))
            if re_v:
                va_re_vals.append(str(re_v))
            if le_v:
                va_le_vals.append(str(le_v))

    if va_re_vals:
        va_part = f"VA RE {' → '.join(va_re_vals)}"
        if va_le_vals:
            va_part += f", LE {' → '.join(va_le_vals)}"
        parts.append(va_part)

    # --- Diagnosis trend ---
    diagnoses = [v.get("diagnosis", "") for v in visits if v.get("diagnosis")]
    if diagnoses:
        if len(set(diagnoses)) == 1 and n > 1:
            parts.append(f"Dx: {diagnoses[0]} (consistent)")
        else:
            parts.append(f"Dx: {' → '.join(diagnoses)}")

    if not parts:
        return ""
    text = ". ".join(parts)
    if n > 1 and not text.endswith("."):
        text += "."
    return text


def _shorten_guidelines(chunks: list[str], max_sentences: int = 3) -> str:
    """Compress raw guideline chunks to a few sentences for small models."""
    if not chunks:
        return ""

    sentences: list[str] = []
    for chunk in chunks:
        if not chunk:
            continue
        for s in re.split(r"(?<=[.!?])\s+", chunk.strip()):
            s_clean = s.strip()
            if s_clean:
                sentences.append(s_clean)
            if len(sentences) >= max_sentences:
                break
        if len(sentences) >= max_sentences:
            break

    return " ".join(sentences[:max_sentences])


def _extract_risk_signals(visits: list[dict]) -> list[str]:
    """Extract structural risk signals from clinical data (Patch: Risk Inference)."""
    risks = []
    
    # Scan all visits to catch history/risk factors
    has_shallow_ac = False
    has_fhx_glaucoma = False
    on_pilocarpine = False

    for v in visits:
        # Check Structure (AC depth)
        slit = v.get("slit_lamp", "").lower()
        if "shallow" in slit or "narrow" in slit:
             has_shallow_ac = True

        # Check Family History
        fhx = v.get("family_history", "").lower()
        if "glaucoma" in fhx:
            has_fhx_glaucoma = True

        # Check Meds (Pilocarpine)
        meds = " ".join(
            (m.get("name", m) if isinstance(m, dict) else str(m))
            for m in v.get("medications", [])
        ).lower()
        rx = " ".join(
            (m.get("name", m) if isinstance(m, dict) else str(m))
            for m in v.get("prescription", [])
        ).lower()
        if "pilocarpine" in meds or "pilocarpine" in rx:
            on_pilocarpine = True
    
    if has_shallow_ac:
        risks.append("Shallow anterior chamber suggesting narrow-angle risk")
    if has_fhx_glaucoma:
        risks.append("Positive family history of glaucoma")
    if on_pilocarpine:
        risks.append("On pilocarpine therapy (miotic)")
        
    return risks


# ── Input normalisation helpers (Patches 1, 6, 8) ──────────────────────────

def _detect_primary_focus(visits: list[dict]) -> str:
    """Infer a clinical focus label from the available visit data.

    This anchors the LLM so it knows *what disease* to summarise about,
    preventing hallucination when no explicit Dx is present.
    """
    # 1. Use the most recent explicit diagnosis
    for v in reversed(visits):
        dx = v.get("diagnosis", "")
        if dx:
            return dx

    # 2. Heuristic fall-backs based on available data
    for v in visits:
        conditions = " ".join(v.get("conditions", [])).lower()
        meds = " ".join(
            (m.get("name", m) if isinstance(m, dict) else str(m))
            for m in v.get("medications", [])
        ).lower()
        rx = " ".join(
            (m.get("name", m) if isinstance(m, dict) else str(m))
            for m in v.get("prescription", [])
        ).lower()
        combined = f"{conditions} {meds} {rx}"

        if any(k in combined for k in ("glaucoma", "timolol", "latanoprost", "pilocarpine", "brimonidine", "dorzolamide")):
            return "glaucoma evaluation"
        if any(k in combined for k in ("diabetes", "diabetic", "metformin", "insulin")):
            return "diabetes ocular evaluation"
        if any(k in combined for k in ("cataract", "phaco", "pciol")):
            return "cataract evaluation"
        if v.get("iop"):
            return "IOP evaluation"

    return "general ophthalmic evaluation"


def _build_explicit_negatives(visits: list[dict]) -> list[str]:
    """Generate explicit negative statements so the LLM doesn't hallucinate pathology.

    E.g. if a diabetic patient has no fundus findings → state "No documented
    diabetic retinopathy findings."
    """
    negatives: list[str] = []
    conditions_all = " ".join(
        " ".join(v.get("conditions", [])) for v in visits
    ).lower()
    has_fundus = any(v.get("slit_lamp") for v in visits)
    has_iop = any(v.get("iop") for v in visits)

    if "diabetes" in conditions_all or "diabetic" in conditions_all:
        if not has_fundus:
            negatives.append("No documented diabetic retinopathy findings.")

    if not has_iop:
        negatives.append("IOP not recorded.")

    return negatives


def _build_key_points(visits: list[dict], primary_focus: str) -> list[str]:
    """Pre-compute key clinical points to reduce LLM cognitive load.

    Returns a short bullet list the LLM can directly narrate.
    """
    points: list[str] = []
    points.append(f"Primary focus: {primary_focus}")

    for v in visits:
        # Structural findings
        slit = v.get("slit_lamp", "")
        if slit:
            points.append(f"SLE: {slit}")

        # PMH
        for c in v.get("conditions", []):
            points.append(c)

        # Medications / Rx
        for m in v.get("medications", []):
            name = m.get("name", m) if isinstance(m, dict) else str(m)
            if name:
                points.append(f"On {name}")
        for m in v.get("prescription", []):
            name = m.get("name", m) if isinstance(m, dict) else str(m)
            if name:
                points.append(f"Rx: {name}")

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for p in points:
        if p.lower() not in seen:
            seen.add(p.lower())
            unique.append(p)
    return unique[:8]


# ── Summary-mode classifier (Patch from Suggestion 2) ──────────────────────

def _classify_summary_mode(patient_summary: dict) -> str:
    """Classify the patient case into a summary mode.

    Modes
    -----
    registration          – 0 visits, no clinical data at all
    optometry_snapshot    – 1 visit, no diagnosis (data-collection stage)
    single_visit_diagnosed – 1 visit with a diagnosis (reasoning appropriate)
    trend_case            – 2+ visits (full RAG + trend engine)
    """
    visits = patient_summary.get("visits", [])
    if not visits:
        return "registration"

    v = visits[-1]
    has_dx = bool(v.get("diagnosis"))

    if len(visits) == 1 and not has_dx:
        return "optometry_snapshot"
    if len(visits) == 1 and has_dx:
        return "single_visit_diagnosed"
    if len(visits) > 1:
        return "trend_case"

    return "optometry_snapshot"


def _generate_optometry_summary(patient_summary: dict) -> str:
    """Deterministic, no-LLM summary for an optometry-only snapshot.

    Avoids hallucination entirely — just reports what was recorded.
    """
    from agents.retrival_agent1 import _extract_vision_line, _extract_iop_line

    v = patient_summary["visits"][-1]
    name = patient_summary.get("name", "Patient")
    age = patient_summary.get("age", "")
    sex = patient_summary.get("sex", "")

    header = name
    if age:
        header += f"/{age}"
    if sex:
        header += f"/{sex}"

    pieces: list[str] = ["Single visit with optometry findings."]

    cc = v.get("complaints", "")
    if cc:
        pieces.append(f"Complaints: {cc}.")

    vis = _extract_vision_line(v.get("vision", {}))
    if vis:
        pieces.append(f"{vis}.")

    iop = _extract_iop_line(v.get("iop", {}))
    if iop:
        pieces.append(f"{iop}.")

    # Conditions / meds
    conditions = v.get("conditions", [])
    if conditions:
        pieces.append(f"PMH: {', '.join(conditions)}.")

    meds = v.get("medications", [])
    if meds:
        med_names = ", ".join(
            m.get("name", str(m)) if isinstance(m, dict) else str(m)
            for m in meds[:4]
        )
        pieces.append(f"Current medications: {med_names}.")

    slit = v.get("slit_lamp", "")
    if slit:
        pieces.append(f"SLE: {slit}.")

    # Include risk signals in optometry snapshot
    risk_signals = _extract_risk_signals(patient_summary.get("visits", []))
    if risk_signals:
        pieces.append("Risk signals: " + "; ".join(risk_signals) + ".")

    pieces.append("No diagnosis documented yet. Recommend complete ophthalmologist evaluation.")

    result = " ".join(pieces)
    result = _strip_patient_name(result, header)
    print(f"\n[MODE: optometry_snapshot] Deterministic summary:\n{result}\n")
    return result


# ── Main entry point (rewritten with mode branching) ───────────────────────

def run_single_summary(patient_summary: dict, knowledge_chunks: list, max_tokens: int = 250) -> str:
    """State-aware clinical summarisation engine.

    Mode 1  registration          → deterministic one-liner, no LLM
    Mode 2  optometry_snapshot    → deterministic structured report, no LLM
    Mode 3  single_visit_diagnosed → minimal RAG + LLM
    Mode 4  trend_case            → full RAG + trend engine + LLM
    """
    if not isinstance(patient_summary, dict) or patient_summary.get("error"):
        return f"Error: {patient_summary.get('error', 'invalid data')}"
    if "visits" not in patient_summary:
        return "Error: patient summary missing visits"

    # ── Classify mode ──
    mode = _classify_summary_mode(patient_summary)
    print(f"\n[SUMMARY MODE] {mode}")

    # --- Mode 1: Registration only ---
    if mode == "registration":
        return "New patient registered. No clinical examination recorded yet. Awaiting ophthalmic evaluation."

    # --- Mode 2: Optometry snapshot (no Dx, no reasoning needed) ---
    if mode == "optometry_snapshot":
        return _generate_optometry_summary(patient_summary)

    # ── From here on we use the LLM (modes 3 & 4) ──

    visits = patient_summary["visits"]

    # Detect clinical focus anchor (Patch 1)
    primary_focus = _detect_primary_focus(visits)

    # Build explicit negatives (Patch 6)
    negatives = _build_explicit_negatives(visits)

    # Build clinical risk signals (Patch: Risk Inference)
    risk_signals = _extract_risk_signals(visits)

    # Build pre-computed key points (Patch 8)
    key_points = _build_key_points(visits, primary_focus)

    # Format clinical notes (existing)
    clinical_notes = []
    for i, v in enumerate(visits):
        note = _format_clinical_note(v)
        if note.strip():
            header = f"Visit {i+1} ({v.get('visitDate', 'unknown date')}):"
            clinical_notes.append(f"{header}\n{note}")
    clinical_text = "\n\n".join(clinical_notes) if clinical_notes else "No clinical data recorded."

    # Trend extraction — only meaningful for multi-visit
    if mode == "trend_case":
        trend_summary = _extract_trends(visits)
    else:
        trend_summary = "Single visit; no longitudinal trend available."

    # ── Guideline context with relevance threshold (Patch 2) ──
    RELEVANCE_THRESHOLD = 0.015
    relevant_chunks: list[str] = []
    for c in (knowledge_chunks or []):
        if isinstance(c, dict):
            if c.get("score", 0) >= RELEVANCE_THRESHOLD:
                relevant_chunks.append(c["text"])
        elif isinstance(c, str):
            relevant_chunks.append(c)

    context = _shorten_guidelines(relevant_chunks)

    # ── Build patient header ──
    name = patient_summary.get("name", "Patient")
    age = patient_summary.get("age", "")
    sex = patient_summary.get("sex", "")
    patient_header = name
    if age:
        patient_header += f"/{age}"
    if sex:
        patient_header += f"/{sex}"

    # ── Patch 1: Disable Deterministic Auto-Return ──
    # Deterministic summary retained for logging but NOT auto-returned
    det_summary = _deterministic_trend_summary(
        visits,
        guideline_context_short=context if context else None,
        patient_header=patient_header,
        risk_signals=risk_signals,
    )

    if det_summary:
        print(f"[INFO] Deterministic candidate (not auto-returned): {det_summary}")

    # ── Build prompt sections (Patch 5: Always Pass Structured Risk Signals) ──
    risk_block = "\n".join(f"- {r}" for r in risk_signals) if risk_signals else "None"

    # ── Patch 2: Force Clean Clinical Prompt Structure ──
    template = """You are a Senior Ophthalmologist writing a concise clinical update to a colleague.

Rules:
- Write 4–6 short clinical sentences.
- Use only provided data.
- If multiple visits, describe trends using arrows (→).
- If single visit, describe findings objectively.
- Mention diagnosis evolution if present.
- End with a clear management or follow-up recommendation.
- No headers. No explanation. No meta-commentary.

Clinical Data:
{clinical_data}

Trends:
{trends}

Risk Signals:
{risk_signals}

Guideline Context (if relevant):
{guidelines}

Write the paragraph:"""

    prompt = PromptTemplate(
        input_variables=["clinical_data", "trends", "risk_signals", "guidelines"],
        template=template,
    ).format(
        clinical_data=clinical_text,
        trends=trend_summary,
        risk_signals=risk_block,
        guidelines=context if context else "None relevant",
    )

    print(f"\n{'='*60}\n[PROMPT] Mode={mode} | Focus={primary_focus} | {patient_header}\n{'='*60}")
    print(f"[KEY POINTS]: {key_points}")
    if risk_signals:
        print(f"[RISK SIGNALS]: {risk_signals}")
    if negatives:
        print(f"[EXPLICIT NEGATIVES]: {negatives}")
    print(f"[CLINICAL DATA FED TO LLM]:\n{clinical_text}\n")
    if trend_summary:
        print(f"[TRENDS]:\n{trend_summary}\n")
    if context:
        print(f"[GUIDELINES FED TO LLM]:\n{context}\n")

    result = _generate(prompt, max(max_tokens, 400))
    result = _enforce_word_limit(result, 110)
    result = _strip_patient_name(result, patient_header)

    print(f"\n{'='*60}\n[FINAL RESULT RETURNED TO FRONTEND]\n{result}\n{'='*60}\n")
    return result


# ── NEW: Signal-driven clinical RAG interpretation ─────────────────────────

RELEVANCE_THRESHOLD = 0.012


def _format_structured_output(
    signals_map: dict[str, list[str]],
    evidence_map: dict[str, list[dict]],
) -> str:
    """Format the FULL final output report (Deterministic Sections + Placeholder for LLM).

    Returns the string that will be passed to the LLM as context,
    but we also want to return this STRUCTURE to the frontend.
    
    Actually, the tool logic is:
      1. This function builds the 'context' text for the LLM.
      2. The LLM generates the 'Interpretation' part.
      3. We stitch them together.
    """
    
    sections = []

    # 1. Deterministic Signal Sections
    # Map internal keys to display headers
    HEADERS = {
        "complaints": "COMPLAINTS",
        "findings": "CLINICAL FINDINGS",
        "systemic": "SYSTEMIC CONTEXT",
        "risks": "RISK SIGNALS",
        "notes": "NOTES"
    }
    
    ORDER = ["complaints", "findings", "systemic", "risks", "notes"]

    for key in ORDER:
        if key in signals_map and signals_map[key]:
            lines = [f"• {s}" for s in signals_map[key]]
            sections.append(f"{HEADERS[key]}:\n" + "\n".join(lines))

    # 2. Evidence Section
    evidence_lines = []
    # Gather evidence for ALL signals present in the map
    all_signals = []
    for sig_list in signals_map.values():
        all_signals.extend(sig_list)

    for sig in all_signals:
        chunks = evidence_map.get(sig, [])
        # Find best chunk
        best_chunk = None
        for c in chunks:
            if isinstance(c, dict) and c.get("score", 0) >= RELEVANCE_THRESHOLD:
                best_chunk = c["text"]
                break
            elif isinstance(c, str):
                best_chunk = c
                break
        
        if best_chunk:
            # Clean and truncate
            clean_text = " ".join(best_chunk.split())
            if len(clean_text) > 120:
                clean_text = clean_text[:120] + "..."
            evidence_lines.append(f"• {sig}: \"{clean_text}\"")

    if evidence_lines:
        sections.append("RELEVANT EVIDENCE GUIDELINES:\n" + "\n".join(evidence_lines))

    return "\n\n".join(sections)


def run_clinical_interpretation(
    signals_map: dict[str, list[dict]],
    evidence_map: dict[str, list[dict]],
    patient_header: str = "Patient",
    max_tokens: int = 150,
    patient_id: str = None,
    inference_result: dict = None
) -> str:
    """2-Pass clinical reasoning engine.

    Pass 1: Signals → LLM → factual findings paragraph (digest)
    Pass 2: Findings paragraph + textbook context + inference → 4 structured points

    Output format (fixed):
      1. Strongest risk factor
      2. Strongest clinical finding
      3. Second strongest clinical finding
      4. Inference/suggestion with confidence
    """

    # ── 1. Flatten signals into a concise list ──
    findings_list = []

    for category, signals in signals_map.items():
        if not signals:
            continue
        for s in signals:
            if isinstance(s, dict):
                text = s.get("original_text", "")
                sev = s.get("severity", "medium").upper()
                findings_list.append(f"- [{sev}] {text}")
            else:
                findings_list.append(f"- {str(s)}")

    if not findings_list:
        return (
            "1. No significant risk factors identified.\n"
            "2. Vision and intraocular pressure within normal limits.\n"
            "3. No abnormal clinical findings detected.\n"
            "4. Patient stable on current management (strong confidence)."
        )

    # Filter out benign/routine signals
    meaningful = [f for f in findings_list if not any(
        x in f.lower() for x in ["routine checkup", "condition stable", "checkup", "consultation"]
    )]
    if not meaningful:
        return (
            "1. No significant risk factors identified.\n"
            "2. Vision and intraocular pressure within normal limits.\n"
            "3. No abnormal clinical findings detected.\n"
            "4. Patient stable on current management (strong confidence)."
        )

    findings_block = "\n".join(findings_list)

    # ── 2. Flatten textbook evidence from knowledge_retriever ──
    textbook_lines = []
    seen_chunks = set()
    for _, chunks in evidence_map.items():
        if not chunks:
            continue
        for c in chunks:
            if isinstance(c, dict) and c.get("text"):
                text = c["text"]
                key = text[:80]
                if key not in seen_chunks:
                    seen_chunks.add(key)
                    clean = " ".join(text.split())
                    if len(clean) > 250:
                        clean = clean[:250] + "..."
                    textbook_lines.append(f"- {clean}")
    textbook_context = "\n".join(textbook_lines) if textbook_lines else "No relevant guidelines retrieved."

    # ── 3. Build inference block from clinical_inference engine ──
    inference_block = "No specific condition inferred."
    inference_cond = None
    inference_conf = None
    if inference_result and inference_result.get("condition"):
        inference_cond = inference_result["condition"]
        inference_conf = inference_result.get("confidence", "moderate")
        evidence_str = ", ".join(inference_result.get("evidence", []))
        inference_block = f"Condition: {inference_cond}\nEvidence: {evidence_str}\nConfidence: {inference_conf}"

    # ══════════════════════════════════════════════════════════════
    # PASS 1: Signals → LLM → factual findings paragraph (digest)
    # ══════════════════════════════════════════════════════════════
    pass1_prompt = f"""Read the following clinical signals and write a concise factual paragraph summarizing the key clinical picture. Only use the information provided. Do not add diagnoses or speculate.

CLINICAL SIGNALS:
{findings_block}

Write a concise clinical summary paragraph (4-6 sentences max):"""

    pass1_system = (
        "You are a strict clinical summarization engine. "
        "Report ONLY the facts presented. Do NOT speculate or add diagnoses."
    )

    print(f"\n{'='*60}")
    print(f"[PASS 1] Generating findings digest for: {patient_header}")
    print(f"{'='*60}")

    pass1_output = _call_ollama(pass1_prompt, system=pass1_system, temperature=0.1)

    # Clean pass 1
    pass1_output = re.sub(r'<think>.*?</think>', '', pass1_output, flags=re.DOTALL)
    pass1_output = _pick_best_paragraph(pass1_output)
    pass1_output = " ".join(pass1_output.split())

    if not pass1_output or len(pass1_output.split()) < 5:
        pass1_output = findings_block  # fallback: raw signals

    print(f"[PASS 1 OUTPUT] ({len(pass1_output.split())} words):\n{pass1_output}\n")

    # ══════════════════════════════════════════════════════════════
    # PASS 2: Digest + Textbook context + Inference → 4 points
    # ══════════════════════════════════════════════════════════════
    pass2_prompt = f"""Given the clinical summary and textbook guidelines below, produce EXACTLY 4 numbered points.

CLINICAL SUMMARY:
{pass1_output}

TEXTBOOK GUIDELINES:
{textbook_context}

CLINICAL INFERENCE:
{inference_block}

FORMAT (strict):
1. [Strongest RISK FACTOR from the findings — e.g. elevated IOP, family history, systemic condition]
2. [Most important clinical FINDING]
3. [Second most important clinical FINDING]
4. [Inference/suggestion sentence — MUST include confidence: strong, moderate, or weak]

RULES:
- Use ONLY information from the clinical summary and guidelines above.
- Point 1 MUST be a risk factor.
- Points 2-3 MUST be factual clinical findings.
- Point 4 MUST be an inference with a confidence level in parentheses.
- Do NOT add diseases not supported by findings.
- Do NOT write explanations, headers, or commentary.
- Output ONLY the 4 numbered lines.

OUTPUT:"""

    pass2_system = (
        "You are a senior ophthalmologist producing a structured clinical assessment. "
        "Output ONLY 4 numbered points. No headers, no explanations."
    )

    print(f"\n{'='*60}")
    print(f"[PASS 2] Structuring with textbook context + inference")
    print(f"{'='*60}")
    if textbook_lines:
        print(f"[TEXTBOOK CONTEXT] {len(textbook_lines)} chunks fed to LLM")
    print(f"[INFERENCE] {inference_block}")

    pass2_output = _call_ollama(pass2_prompt, system=pass2_system, temperature=0.1)

    # Clean pass 2
    pass2_output = re.sub(r'<think>.*?</think>', '', pass2_output, flags=re.DOTALL)

    # ── Parse into exactly 4 structured lines ──
    lines = [line.strip() for line in pass2_output.split('\n') if line.strip()]
    formatted_lines = []
    count = 1
    for line in lines:
        lower_line = line.lower()
        # Skip filler / headers
        if any(x in lower_line for x in [
            "here are", "following are", "based on", "clinical findings",
            "output:", "format:", "assessment:", "critical findings"
        ]) or (lower_line.endswith(":") and len(lower_line.split()) < 5):
            continue
        clean_line = re.sub(r'^\d+\.\s*', '', line)
        if clean_line and count <= 4:
            formatted_lines.append(f"{count}. {clean_line}")
            count += 1

    # ── Guarantee point 4 is always the inference ──
    # If LLM produced fewer than 4 points, or point 4 is missing inference,
    # inject the deterministic inference from clinical_inference engine.
    if inference_cond and inference_conf:
        deterministic_p4 = f"Findings suggest {inference_cond} ({inference_conf} confidence)."
        if len(formatted_lines) >= 4:
            # Replace point 4 with grounded inference if LLM's version lacks confidence
            p4_text = formatted_lines[3].lower()
            if "confidence" not in p4_text:
                formatted_lines[3] = f"4. {deterministic_p4}"
        else:
            # Pad missing points
            while len(formatted_lines) < 3:
                formatted_lines.append(f"{len(formatted_lines)+1}. Clinical correlation recommended.")
            formatted_lines.append(f"4. {deterministic_p4}")
    else:
        # No inference available — pad to 4 points
        while len(formatted_lines) < 4:
            formatted_lines.append(f"{len(formatted_lines)+1}. Clinical correlation recommended.")

    # Trim to exactly 4
    formatted_lines = formatted_lines[:4]

    final_text = "\n".join(formatted_lines)

    print(f"\n{'='*60}")
    print(f"[FINAL 4-POINT OUTPUT]")
    print(final_text)
    print(f"{'='*60}\n")

    return final_text



# Keep old functions as thin wrappers for backward compatibility
def run_ophthal_summary(patient_summary: dict, knowledge_chunks: list[str], max_tokens: int = 150) -> str:
    return run_single_summary(patient_summary, knowledge_chunks, max_tokens)

def run_systemic_summary(patient_summary: dict, knowledge_chunks: list[str], max_tokens: int = 150) -> str:
    return ""

def run_combined_summary(ophthal_text: str, systemic_text: str, patient_summary: dict, max_tokens: int = 200) -> str:
    # When called from old 3-step chain, ophthal_text already has the full result
    return ophthal_text


def run_summary_llm(patient_summary, knowledge_chunks, max_tokens=200):
    """Legacy summary — redirects to new single-prompt pipeline."""
    return run_single_summary(patient_summary, knowledge_chunks or [], max_tokens)


def run_chat_llm(context_text, user_query, max_tokens=250):
    """
    Generates a chat response based on context and user query.
    """
    template = """
### Instruction
You are an expert ophthalmology AI assistant named Chakravue AI.
Answer the question below utilizing the provided Context.
If the answer is not in the context, use your general medical knowledge but prioritize the context.
Keep the answer professional, concise, and safe.

### Context
{context}

### Question
{query}

### Answer:
"""
    
    prompt_template = PromptTemplate(
        input_variables=["context", "query"],
        template=template
    )

    final_prompt = prompt_template.format(
        context=context_text,
        query=user_query
    )

    if USE_OLLAMA:
        raw_response = _call_ollama(final_prompt, temperature=0.4)
    else:
        raw_response = "Ollama not configured."

    # inputs = tokenizer(final_prompt, return_tensors="pt").to(model.device)

    # outputs = model.generate(
    #     **inputs,
    #     max_new_tokens=max_tokens,
    #     temperature=0.4,
    #     top_p=0.9,
    #     do_sample=True,
    #     eos_token_id=tokenizer.eos_token_id,
    #     pad_token_id=tokenizer.eos_token_id
    # )

    # raw_response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
    
    # Clean output
    cleaned_response = raw_response
    if "</think>" in cleaned_response:
        cleaned_response = cleaned_response.split("</think>")[-1]
    
    return cleaned_response.strip()
