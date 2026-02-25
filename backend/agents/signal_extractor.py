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
            "// system": opd_data.get("systemicInvestigations", {}), # Renamed to avoid key confusion
            "diagnosis": doc_data.get("diagnosis", ""),
            "prescription": doc_data.get("prescription", {}).get("items", []) if isinstance(doc_data.get("prescription"), dict) else doc_data.get("prescription", []),
            "notes": doc_data.get("notes", ""),
            "followUp": doc_data.get("followUp", ""),
            "ophthalmologistExam": doc_data.get("ophthalmologistExam", {}),
            "investigationsSurgeries": doc_data.get("investigationsSurgeries", {}),
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
        
        re_v = iop.get("re", iop.get("right", iop.get("RE", "")))
        le_v = iop.get("le", iop.get("left", iop.get("LE", "")))
        
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
    # Vision thresholds that trigger concern
    ABNORMAL_VA = {"6/18", "6/24", "6/36", "6/60", "3/60", "1/60", "CF", "HM", "PL", "NPL"}
    
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

    re_bad = va_re in ABNORMAL_VA
    le_bad = va_le in ABNORMAL_VA

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