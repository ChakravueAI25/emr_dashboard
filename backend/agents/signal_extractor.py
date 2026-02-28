"""
Agent 2: Clinical Signal Extractor (Refactored for Signal-Prioritized Engine)

Purpose:
Accept the FULL raw MongoDB patient document from retrival_agent1
and produce a list of discrete, clinically meaningful Signal Objects.

This agent acts as a strict filter:
1. Filters out ALL "Normal", "WNL", "Quiet" findings.
2. Normalizes raw clinical text into standard queries (e.g., "IOP 26" -> "high iop management").
3. Merges bilateral findings into single signals.

Input:  dict  → raw patient document from MongoDB
Output: dict[str, list[dict]] → grouped Signal Objects
"""

import re

# =========================
# CONSTANTS & CONFIG
# =========================

NORMAL_TERMS = {
    "wnl", "normal", "clear", "quiet", "within normal limits", 
    "soft", "nad", "none", "nil", "n/a", "not significant", "no complaints",
    "norml", "nmrl", "nml" # Common typos
}

# Mapping specific findings to Knowledge Base queries
QUERY_MAP = {
    "elevated iop": "management of elevated intraocular pressure glaucoma",
    "shallow ac": "angle closure glaucoma risk assessment management",
    "cataract": "cataract surgery indications and management techniques",
    "pco": "posterior capsular opacification yag kapsulotomy",
    "diabetic retinopathy": "diabetic retinopathy screening and management guidelines",
    "glaucoma suspect": "glaucoma suspect workup and monitoring",
    "hypertension": "hypertensive retinopathy classification",
    "hypotony": "management of ocular hypotony",
    "corneal edema": "management of corneal edema",
    "mydriasis": "causes and management of mydriasis"
}

def _is_abnormal(value: str) -> bool:
    """Strict filter for abnormal findings only."""
    if not value or not isinstance(value, str):
        return False
    v = value.strip().lower()
    
    # 1. Check exact blocklist (fast)
    if v in NORMAL_TERMS: return False
    
    # 2. Check substring presence relative to "Normal"
    # This catches "Normal (RE)", "Cornea: Normal", "Quiet AC"
    if "normal" in v or "wnl" in v or "quiet" in v or "clear" in v:
        return False
        
    return True


def _create_signal(text: str, query_hint: str = "", severity: str = "medium", category: str = "finding") -> dict:
    """
    Factory for Signal Objects.
    Normalization logic: uses specific map if key exists, else uses text.
    """
    # Auto-normalize query
    normalized = text.lower()
    if query_hint:
        normalized = query_hint.lower()
    
    # Check if we have a better specific query in our map
    for trigger, manual_query in QUERY_MAP.items():
        if trigger in normalized:
            normalized = manual_query
            break
            
    return {
        "original_text": text,
        "normalized_query": normalized,
        "severity": severity,
        "category": category
    }

# =========================
# VISIT EXTRACTION HELPERS
# =========================

def _extract_visits(patient: dict) -> list[dict]:
    """Extract all visits from the raw document."""
    visits_raw = patient.get("visits", [])
    if not isinstance(visits_raw, list):
        visits_raw = []

    extracted = []
    
    # Process visits array (multi-visit structure)
    for v in visits_raw:
        stages = v.get("stages", {})

        # --- NEW encounter-based structure (stages.reception/opd/doctor) ---
        if stages:
            reception = stages.get("reception", {}).get("data", {})
            opd_data = stages.get("opd", {}).get("data", {})
            optometry = opd_data.get("optometry", {})
            doc_data = stages.get("doctor", {}).get("data", {})

            visit = {
                "visitDate": v.get("visitDate", ""),
                "vitals": reception.get("vitalSigns", reception.get("vitals", {})),
                "medicalHistory": reception.get("medicalHistory", {}),
                "drugHistory": reception.get("drugHistory", {}),
                "presentingComplaints": reception.get("presentingComplaints", {}),
                "vision": optometry.get("vision", {}),
                "iop": opd_data.get("iop", optometry.get("iop", {})),
                "autoRefraction": optometry.get("autoRefraction", {}),
                "// system": opd_data.get("systemicInvestigations", {}),
                "diagnosis": doc_data.get("diagnosis", ""),
                "prescription": doc_data.get("prescription", {}).get("items", []) if isinstance(doc_data.get("prescription"), dict) else doc_data.get("prescription", []),
                "notes": doc_data.get("notes", ""),
                "followUp": doc_data.get("followUp", ""),
                "ophthalmologistExam": doc_data.get("ophthalmologistExam", {}),
                "investigationsSurgeries": doc_data.get("investigationsSurgeries", {}),
            }
        else:
            # --- LEGACY flat visit structure (data directly on visit object) ---
            # IOP may be an array of {rightEye, leftEye} dicts — normalise to flat dict
            raw_iop = v.get("iop", {})
            if isinstance(raw_iop, list):
                iop_dict = {}
                if raw_iop and isinstance(raw_iop[0], dict):
                    iop_dict = {"re": raw_iop[0].get("rightEye", ""), "le": raw_iop[0].get("leftEye", "")}
                raw_iop = iop_dict

            # diagnosis may be list — join to string
            raw_dx = v.get("diagnosis", "")
            if isinstance(raw_dx, list):
                raw_dx = ", ".join(str(d.get("diagnosis", d) if isinstance(d, dict) else d) for d in raw_dx if d)

            visit = {
                "visitDate": v.get("visitDate", ""),
                "vitals": v.get("vitalSigns", v.get("vitals", {})),
                "medicalHistory": v.get("medicalHistory", {}),
                "drugHistory": v.get("drugHistory", {}),
                "presentingComplaints": v.get("presentingComplaints", {}),
                "vision": v.get("vision", {}),
                "iop": raw_iop,
                "autoRefraction": v.get("autoRefraction", {}),
                "diagnosis": raw_dx,
                "prescription": v.get("prescription", []),
                "notes": v.get("notes", ""),
                "followUp": v.get("followUp", ""),
                "ophthalmologistExam": v.get("ophthalmologistExam", {}),
                "investigationsSurgeries": v.get("investigationsSurgeries", {}),
            }

        extracted.append(visit)

    # Fallback: Flat structure (single visit patients)
    if not extracted:
        optom = patient.get("optometry", {})
        visit = {
            "visitDate": patient.get("lastUpdated", "current"),
            "vitals": patient.get("vitalSigns", patient.get("vitals", {})),
            "medicalHistory": patient.get("medicalHistory", patient.get("history", {})),
            "drugHistory": patient.get("drugHistory", {}),
            "presentingComplaints": patient.get("presentingComplaints", {}),
            "vision": optom.get("vision", {}),
            "iop": patient.get("iop", optom.get("iop", {})),
            "autoRefraction": optom.get("autoRefraction", {}),
            "diagnosis": patient.get("diagnosis", ""),
            "prescription": patient.get("prescription", []),
            "notes": patient.get("notes", ""),
            "followUp": patient.get("followUp", ""),
            "ophthalmologistExam": patient.get("ophthalmologistExam", {}),
            "investigationsSurgeries": patient.get("investigationsSurgeries", {}),
        }
        extracted.append(visit)

    return extracted


# =========================
# SIGNAL LOGIC
# =========================

def _signals_iop(visits: list[dict]) -> list[dict]:
    """IOP: High, Asymmetry, Rising."""
    signals = []
    iop_re_vals = []
    iop_le_vals = []

    for v in visits:
        iop = v.get("iop", {})
        if not isinstance(iop, dict): continue
        
        re_v = iop.get("re", iop.get("right", iop.get("RE", iop.get("rightEye", ""))))
        le_v = iop.get("le", iop.get("left", iop.get("LE", iop.get("leftEye", ""))))
        
        if re_v: 
            try: iop_re_vals.append(float(re_v))
            except: pass
        if le_v:
            try: iop_le_vals.append(float(le_v))
            except: pass

    # 1. High IOP / Hypertensive
    re_high = any(x > 21 for x in iop_re_vals)
    le_high = any(x > 21 for x in iop_le_vals)

    if re_high and le_high:
        max_re = max(iop_re_vals) if iop_re_vals else 0
        max_le = max(iop_le_vals) if iop_le_vals else 0
        signals.append(_create_signal(
            f"Bilateral Elevated IOP (RE: {int(max_re)}, LE: {int(max_le)} mmHg)",
            "management of bilateral glaucoma ocular hypertension", "high", "finding"
        ))
    elif re_high:
        signals.append(_create_signal(
            f"Elevated IOP RE: {int(max(iop_re_vals))} mmHg",
            "unilateral elevated iop management", "high", "finding"
        ))
    elif le_high:
        signals.append(_create_signal(
            f"Elevated IOP LE: {int(max(iop_le_vals))} mmHg",
            "unilateral elevated iop management", "high", "finding"
        ))

    # 2. Asymmetry (only if not already flagged as high bilateral)
    if iop_re_vals and iop_le_vals:
        curr_re = iop_re_vals[-1]
        curr_le = iop_le_vals[-1]
        diff = abs(curr_re - curr_le)
        if diff >= 4 and not (re_high or le_high):
            signals.append(_create_signal(
                f"Significant IOP Asymmetry ({int(diff)} mmHg)",
                "iop asymmetry differential diagnosis", "medium", "finding"
            ))

    return signals


def _signals_vision(visits: list[dict]) -> list[dict]:
    """Vision: Only significantly reduced visual acuity."""
    signals = []
    # Vision thresholds that trigger concern (exact match after normalisation)
    ABNORMAL_VA_EXACT = {"6/18", "6/24", "6/36", "6/60", "3/60", "1/60", "CF", "HM", "PL", "NPL"}
    # Prefix/substring patterns that indicate poor vision regardless of suffix
    ABNORMAL_VA_PREFIXES = ("CF", "HM", "PL", "NPL", "1/60", "3/60", "6/60", "6/36", "6/24", "6/18")

    def _is_va_abnormal(va_str: str) -> bool:
        """Check if a VA string indicates reduced vision, handling legacy formats like Cf3mt, CF @ 3 M, 6/18P."""
        if not va_str:
            return False
        cleaned = va_str.upper().replace(" ", "")
        # Exact match
        if cleaned in ABNORMAL_VA_EXACT:
            return True
        # Remove trailing letters like P (partial) — "6/18P" → "6/18"
        stripped = re.sub(r'[A-Z]$', '', cleaned)
        if stripped in ABNORMAL_VA_EXACT:
            return True
        # Prefix check — "CF3MT", "CF@3M" etc. all start with "CF"
        for prefix in ABNORMAL_VA_PREFIXES:
            if cleaned.startswith(prefix):
                return True
        return False

    last_visit = visits[-1] if visits else {}
    vision = last_visit.get("vision", {})
    if not isinstance(vision, dict): return []

    # Helper to find best VA
    def get_va(side_keys):
        # Check aided/best corrected first
        for mode in ["bestCorrected", "withGlass", "withPinhole", "unaided"]:
            vd = vision.get(mode, {})
            if isinstance(vd, dict):
                for k in side_keys:
                    val = vd.get(k)
                    if val: return str(val).strip().upper()
        # Fallback flat
        for k in side_keys:
            val = vision.get(k)
            if val: return str(val).strip().upper()
        return ""

    va_re = get_va(["re", "right", "rightEye", "RE"])
    va_le = get_va(["le", "left", "leftEye", "LE"])

    re_bad = _is_va_abnormal(va_re)
    le_bad = _is_va_abnormal(va_le)

    if re_bad and le_bad:
        signals.append(_create_signal(
            f"Bilateral Reduced Vision (RE: {va_re}, LE: {va_le})",
            "differential diagnosis bilateral visual loss", "high", "complaint"
        ))
    elif re_bad:
        signals.append(_create_signal(
            f"Reduced Vision RE: {va_re}",
            "differential diagnosis unilateral visual loss", "medium", "complaint"
        ))
    elif le_bad:
        signals.append(_create_signal(
            f"Reduced Vision LE: {va_le}",
            "differential diagnosis unilateral visual loss", "medium", "complaint"
        ))

    return signals


def _signals_anterior_segment(visits: list[dict]) -> list[dict]:
    """Slit Lamp: Structural abnormalities only."""
    signals = []
    
    # We only care about the latest status mostly
    last_visit = visits[-1] if visits else {}
    exam = last_visit.get("ophthalmologistExam", {})
    if not isinstance(exam, dict): return []

    abnormalities = {} # Key: specific finding (e.g., 'cataract'), Value: list of eyes ['RE', 'LE']

    for eye_key, eye_label in [("od", "RE"), ("os", "LE")]:
        eye_data = exam.get(eye_key, {})
        if not isinstance(eye_data, dict): continue

        for structure, finding in eye_data.items():
            if not _is_abnormal(finding): continue
            
            f_lower = finding.lower()
            s_lower = structure.lower()
            
            # Normalize finding type
            key_type = f"{structure}: {finding}" # default
            query_hint = finding

            if "cataract" in f_lower or "opacity" in f_lower:
                key_type = "Cataract"
                query_hint = "cataract management"
            elif "shallow" in f_lower and ("ac" in s_lower or "chamber" in s_lower):
                key_type = "Shallow AC"
                query_hint = "angle closure glaucoma management"
            elif "edema" in f_lower:
                key_type = "Corneal Edema"
                query_hint = "corneal edema causes"
            
            if key_type not in abnormalities:
                abnormalities[key_type] = {"eyes": [], "raw": [], "query": query_hint}
            
            abnormalities[key_type]["eyes"].append(eye_label)
            abnormalities[key_type]["raw"].append(finding)

    # Convert merged abnormalities to signals
    for k, data in abnormalities.items():
        eyes = data["eyes"]
        query = data["query"]
        severity = "high" if "Shallow" in k or "Edema" in k else "medium"

        if len(eyes) == 2:
            txt = f"Bilateral {k}"
            signals.append(_create_signal(txt, query, severity, "finding"))
        else:
            txt = f"{k} ({eyes[0]})"
            signals.append(_create_signal(txt, query, severity, "finding"))

    return signals


def _signals_medical_hx(visits: list[dict], patient: dict) -> list[dict]:
    """Medical conditions and important family history."""
    signals = []
    
    # 1. Family History
    fhx_sources = []
    # check latest visit
    if visits:
        mh = visits[-1].get("medicalHistory", {})
        if mh.get("familyHistory"): fhx_sources.append(mh.get("familyHistory"))
    # check global
    mh_top = patient.get("medicalHistory", patient.get("history", {}))
    if isinstance(mh_top, dict) and mh_top.get("familyHistory"):
        fhx_sources.append(mh_top.get("familyHistory"))

    fhx_str = " ".join(fhx_sources).lower()
    
    if "glaucoma" in fhx_str:
        signals.append(_create_signal("Family History of Glaucoma", "glaucoma genetics risk", "high", "risk"))
    if "blindness" in fhx_str:
        signals.append(_create_signal("Family History of Blindness", "hereditary eye diseases", "medium", "risk"))

    # 2. Systemic Conditions (Diabetes/HTN)
    conds = []
    # Collect from last visit medical history or global
    mh_meds = []
    if visits:
        m = visits[-1].get("medicalHistory", {}).get("medical", [])
        if isinstance(m, list): mh_meds.extend(m)
    
    for c in mh_meds:
        c_name = c.get("condition", c) if isinstance(c, dict) else c
        if c_name: conds.append(str(c_name).lower())

    cond_str = " ".join(conds)
    if "diabetes" in cond_str or "dm" in cond_str:
        signals.append(_create_signal("Systemic Diabetes Mellitus", "diabetic retinopathy guidelines", "high", "systemic"))
    if "hypertension" in cond_str or "htn" in cond_str:
        signals.append(_create_signal("Systemic Hypertension", "hypertensive retinopathy", "medium", "systemic"))

    return signals


def _signals_medications(visits: list[dict]) -> list[dict]:
    """Current Ocular Meds."""
    signals = []
    if not visits: return []
    
    # Only care about active meds (latest visit or prescription)
    last_visit = visits[-1]
    
    meds = []
    # Check 'medications' (current) and 'prescription' (new)
    sources = [last_visit.get("drugHistory", {}).get("medications", []), last_visit.get("prescription", [])]
    
    for source in sources:
        if isinstance(source, list):
            for m in source:
                name = m.get("name", m.get("medicine", "")) if isinstance(m, dict) else str(m)
                if name: meds.append(name.lower())

    # Filter for key classes
    dedupe_meds = set(meds)
    
    for m in dedupe_meds:
        if "timolol" in m:
            signals.append(_create_signal("On Timolol (Beta Blocker)", "timolol contraindications asthma", "medium", "systemic"))
        elif "travoprost" in m or "lantanoprost" in m or "bimatoprost" in m:
            signals.append(_create_signal("On Prostaglandin Analogs", "prostaglandin analogs side effects", "medium", "systemic"))
        elif "brimonidine" in m:
             signals.append(_create_signal("On Brimonidine (Alpha Agonist)", "brimonidine safety profile", "medium", "systemic"))
        elif "pilocarpine" in m:
            signals.append(_create_signal("On Pilocarpine", "pilocarpine indications", "medium", "systemic"))
        elif "prednisolone" in m or "dexamethasone" in m:
            signals.append(_create_signal("On Topical Steroids", "steroid induced glaucoma", "high", "systemic"))

    return signals


def _signals_complaints(visits: list[dict]) -> list[dict]:
    """Presenting Complaints."""
    signals = []
    if not visits: return []
    
    pc = visits[-1].get("presentingComplaints", {})
    complaints = pc.get("complaints", []) if isinstance(pc, dict) else []
    if isinstance(pc, list): complaints = pc

    for c in complaints:
        text = c.get("complaint", "") if isinstance(c, dict) else str(c)
        if text:
            signals.append(_create_signal(f"Complaint: {text}", f"symptoms {text} differential diagnosis", "medium", "complaint"))
    
    return signals


def _signals_diagnosis(visits: list[dict]) -> list[dict]:
    """Doctor Diagnosis."""
    signals = []
    if not visits: return []
    
    dx = visits[-1].get("diagnosis", "")
    if dx:
        signals.append(_create_signal(f"Diagnosed: {dx}", f"{dx} treatment guidelines", "high", "finding"))
    
    return signals

# =========================
# MAIN ENTRY POINT
# =========================

def extract_signals(patient: dict) -> dict[str, list[dict]]:
    """
    Extracts purely high-signal clinical features for reasoning.
    Ignores normals. Merges bilateral. Normalizes queries.
    """
    visits = _extract_visits(patient)
    if not visits: return {}

    # Extract
    signals = []
    signals.extend(_signals_complaints(visits))
    signals.extend(_signals_vision(visits))
    signals.extend(_signals_iop(visits))
    signals.extend(_signals_anterior_segment(visits))
    signals.extend(_signals_diagnosis(visits))
    signals.extend(_signals_medical_hx(visits, patient))
    signals.extend(_signals_medications(visits))

    # Categorize
    output = {
        "complaints": [],
        "findings": [],
        "systemic": [],
        "risks": []
    }

    # Deduplicate logic based on 'original_text'
    seen = set()
    
    for s in signals:
        key = s["original_text"].lower()
        if key in seen: continue
        seen.add(key)
        
        # Sort into output buckets
        cat = s.get("category", "findings")
        if cat in output:
            output[cat].append(s)
        else:
            output["findings"].append(s) # Default fallback

    # Remove empty keys
    return {k: v for k, v in output.items() if v}


# =========================
# CONTEXT EXTRACTION (for padding & LLM)
# =========================

# VA ranking for trend analysis (higher number = worse vision)
_VA_RANK = {
    "6/6": 1, "6/6P": 2, "6/9": 3, "6/9P": 4, "6/12": 5, "6/12P": 6,
    "6/18": 7, "6/18P": 8, "6/24": 9, "6/24P": 10, "6/36": 11, "6/36P": 12,
    "6/60": 13, "3/60": 14, "1/60": 15, "CF": 16, "HM": 17, "PL": 18, "NPL": 19,
}


def _normalize_va(raw: str) -> str:
    """Normalize legacy VA strings for display: 'Cf3mt' → 'CF', 'CF @ 3 M' → 'CF', '6/18P' → '6/18P'."""
    if not raw:
        return ""
    cleaned = raw.strip().upper().replace(" ", "")
    # Check if it starts with a known prefix and normalize
    for prefix in ("NPL", "PL", "HM", "CF"):
        if cleaned.startswith(prefix):
            return prefix
    # Handle Snellen fractions — keep as-is (e.g., "6/18P")
    if re.match(r"^\d+/\d+", cleaned):
        return cleaned
    return raw.strip().upper()


def _va_sort_key(va: str) -> int:
    """Return numeric rank for sorting (higher = worse). Unknown → 0."""
    norm = _normalize_va(va)
    # Try exact match first
    if norm in _VA_RANK:
        return _VA_RANK[norm]
    # Try without trailing P
    stripped = re.sub(r'[A-Z]$', '', norm)
    if stripped in _VA_RANK:
        return _VA_RANK[stripped]
    return 0


def _classify_trend(values: list[float]) -> str:
    """Classify a numeric trend: rising / falling / stable / single."""
    if len(values) <= 1:
        return "single"
    diffs = [values[i+1] - values[i] for i in range(len(values) - 1)]
    avg_diff = sum(diffs) / len(diffs)
    if avg_diff > 1.0:
        return "rising"
    elif avg_diff < -1.0:
        return "falling"
    return "stable"


def extract_context(patient: dict) -> dict:
    """Extract comprehensive clinical context from ALL visits for padding and LLM input.

    Returns dict with keys:
      - iop_trend_re, iop_trend_le: "14 → 16 → 18 (rising)" or "14 (single visit)"
      - iop_values_re, iop_values_le: raw float lists
      - vision_trend_re, vision_trend_le: "6/18 → 6/36 → CF (declining)" 
      - vision_latest_re, vision_latest_le: latest VA string
      - medications: list of current medication names
      - medical_conditions: list of systemic conditions
      - surgical_history: list of past procedures
      - diagnoses: list of all diagnoses across visits
      - demographics: {age, sex}
      - visit_count: int
      - context_lines: pre-formatted strings suitable for padding points 1-3
    """
    visits = _extract_visits(patient)
    ctx = {
        "iop_trend_re": "", "iop_trend_le": "",
        "iop_values_re": [], "iop_values_le": [],
        "vision_trend_re": "", "vision_trend_le": "",
        "vision_latest_re": "", "vision_latest_le": "",
        "medications": [],
        "medical_conditions": [],
        "surgical_history": [],
        "diagnoses": [],
        "demographics": {},
        "visit_count": len(visits),
        "context_lines": [],
    }

    if not visits:
        return ctx

    # ── Demographics ──
    demo = patient.get("demographics", {})
    if isinstance(demo, dict):
        ctx["demographics"] = {
            "age": demo.get("age", patient.get("age", "")),
            "sex": demo.get("sex", patient.get("sex", "")),
        }
    else:
        ctx["demographics"] = {"age": patient.get("age", ""), "sex": patient.get("sex", "")}

    # ── IOP across visits ──
    iop_re_list = []
    iop_le_list = []
    for v in visits:
        iop = v.get("iop", {})
        if not isinstance(iop, dict):
            continue
        re_v = iop.get("re", iop.get("right", iop.get("RE", iop.get("rightEye", ""))))
        le_v = iop.get("le", iop.get("left", iop.get("LE", iop.get("leftEye", ""))))
        try:
            if re_v:
                iop_re_list.append(float(re_v))
        except (ValueError, TypeError):
            pass
        try:
            if le_v:
                iop_le_list.append(float(le_v))
        except (ValueError, TypeError):
            pass

    ctx["iop_values_re"] = iop_re_list
    ctx["iop_values_le"] = iop_le_list

    if iop_re_list:
        trend = _classify_trend(iop_re_list)
        arrow_str = " → ".join(str(int(v)) for v in iop_re_list)
        ctx["iop_trend_re"] = f"{arrow_str} ({trend})" if len(iop_re_list) > 1 else f"{int(iop_re_list[0])} mmHg"
    if iop_le_list:
        trend = _classify_trend(iop_le_list)
        arrow_str = " → ".join(str(int(v)) for v in iop_le_list)
        ctx["iop_trend_le"] = f"{arrow_str} ({trend})" if len(iop_le_list) > 1 else f"{int(iop_le_list[0])} mmHg"

    # ── Vision across visits ──
    va_re_list = []
    va_le_list = []
    for v in visits:
        vision = v.get("vision", {})
        if not isinstance(vision, dict):
            continue
        # Check unaided first, then withGlass
        for mode in ["unaided", "withGlass", "bestCorrected"]:
            vd = vision.get(mode, {})
            if isinstance(vd, dict):
                re_val = vd.get("rightEye", vd.get("re", vd.get("RE", "")))
                le_val = vd.get("leftEye", vd.get("le", vd.get("LE", "")))
                if re_val and not va_re_list or (re_val and mode == "unaided"):
                    norm = _normalize_va(str(re_val))
                    if norm:
                        va_re_list.append(norm)
                if le_val and not va_le_list or (le_val and mode == "unaided"):
                    norm = _normalize_va(str(le_val))
                    if norm:
                        va_le_list.append(norm)
                if va_re_list and va_le_list:
                    break

    if va_re_list:
        ctx["vision_latest_re"] = va_re_list[-1]
        if len(va_re_list) > 1:
            ranks = [_va_sort_key(v) for v in va_re_list]
            non_zero = [r for r in ranks if r > 0]
            if non_zero and non_zero[-1] > non_zero[0]:
                trend_label = "declining"
            elif non_zero and non_zero[-1] < non_zero[0]:
                trend_label = "improving"
            else:
                trend_label = "stable"
            ctx["vision_trend_re"] = " → ".join(va_re_list) + f" ({trend_label})"
        else:
            ctx["vision_trend_re"] = va_re_list[0]

    if va_le_list:
        ctx["vision_latest_le"] = va_le_list[-1]
        if len(va_le_list) > 1:
            ranks = [_va_sort_key(v) for v in va_le_list]
            non_zero = [r for r in ranks if r > 0]
            if non_zero and non_zero[-1] > non_zero[0]:
                trend_label = "declining"
            elif non_zero and non_zero[-1] < non_zero[0]:
                trend_label = "improving"
            else:
                trend_label = "stable"
            ctx["vision_trend_le"] = " → ".join(va_le_list) + f" ({trend_label})"
        else:
            ctx["vision_trend_le"] = va_le_list[0]

    # ── Medications (from latest visit) ──
    last = visits[-1]
    med_sources = [
        last.get("drugHistory", {}).get("medications", []) if isinstance(last.get("drugHistory"), dict) else [],
        last.get("prescription", []),
    ]
    med_names = []
    for source in med_sources:
        if isinstance(source, list):
            for m in source:
                name = m.get("medicineName", m.get("name", m.get("medicine", ""))) if isinstance(m, dict) else str(m)
                if name and name.strip():
                    med_names.append(name.strip())
    ctx["medications"] = list(dict.fromkeys(med_names))  # dedupe preserving order

    # ── Medical conditions ──
    conditions = []
    for v in visits:
        mh = v.get("medicalHistory", {})
        if isinstance(mh, dict):
            med_list = mh.get("medical", [])
            if isinstance(med_list, list):
                for c in med_list:
                    cname = c.get("condition", c) if isinstance(c, dict) else str(c)
                    if cname:
                        conditions.append(str(cname).strip())
    # Also check top-level
    mh_top = patient.get("medicalHistory", patient.get("history", {}))
    if isinstance(mh_top, dict):
        for c in mh_top.get("medical", []):
            cname = c.get("condition", c) if isinstance(c, dict) else str(c)
            if cname:
                conditions.append(str(cname).strip())
    ctx["medical_conditions"] = list(dict.fromkeys(conditions))

    # ── Surgical history ──
    surgicals = []
    if isinstance(mh_top, dict):
        for s in mh_top.get("surgical", []):
            sname = s.get("procedure", s) if isinstance(s, dict) else str(s)
            if sname:
                surgicals.append(str(sname).strip())
    ctx["surgical_history"] = list(dict.fromkeys(surgicals))

    # ── Diagnoses across visits ──
    dx_list = []
    for v in visits:
        dx = v.get("diagnosis", "")
        if dx and isinstance(dx, str) and dx.strip():
            dx_list.append(dx.strip())
    ctx["diagnoses"] = list(dict.fromkeys(dx_list))

    # ── Build context_lines for padding (priority order) ──
    lines = []
    if ctx["iop_trend_re"] or ctx["iop_trend_le"]:
        parts = []
        if ctx["iop_trend_re"]:
            parts.append(f"RE: {ctx['iop_trend_re']}")
        if ctx["iop_trend_le"]:
            parts.append(f"LE: {ctx['iop_trend_le']}")
        lines.append(f"IOP Trend — {', '.join(parts)}")

    if ctx["vision_trend_re"] or ctx["vision_trend_le"]:
        parts = []
        if ctx["vision_trend_re"]:
            parts.append(f"RE: {ctx['vision_trend_re']}")
        if ctx["vision_trend_le"]:
            parts.append(f"LE: {ctx['vision_trend_le']}")
        lines.append(f"VA Trend — {', '.join(parts)}")

    if ctx["medications"]:
        lines.append(f"Current Rx: {', '.join(ctx['medications'][:5])}")

    if ctx["medical_conditions"]:
        lines.append(f"Systemic: {', '.join(ctx['medical_conditions'])}")

    if ctx["surgical_history"]:
        lines.append(f"Surgical Hx: {', '.join(ctx['surgical_history'])}")

    if ctx["diagnoses"]:
        lines.append(f"Past Dx: {', '.join(ctx['diagnoses'][:3])}")

    age = ctx["demographics"].get("age", "")
    sex = ctx["demographics"].get("sex", "")
    if age or sex:
        lines.append(f"Demographics: {age} {sex}".strip())

    ctx["context_lines"] = lines
    return ctx