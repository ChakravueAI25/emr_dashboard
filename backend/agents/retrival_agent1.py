# retrieval_agent_1.py

import os
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# Use MongoDB Atlas for data retrieval.
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://dashboard:chakravueai2025@cluster0.jrdj4oh.mongodb.net/chakra_hospital?retryWrites=true&w=majority&appName=Cluster0",
)
DB_NAME = os.getenv("DATABASE_NAME", "chakra_hospital")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]
patients = db["patients"]


def _coerce_object_id(value):
    if isinstance(value, ObjectId):
        return value
    if isinstance(value, str) and ObjectId.is_valid(value):
        return ObjectId(value)
    return None

def _normalize_numeric_text(s: str) -> str:
    """Clean unicode anomalies and whitespace from numeric clinical strings."""
    if not s:
        return s
    s = s.replace("\u2013", "-").replace("\xa0", " ").strip()
    return s


def _extract_conditions(med_hist: dict) -> list[str]:
    """Extract medical conditions as clean strings from various formats."""
    medical = med_hist.get("medical", [])
    if not isinstance(medical, list):
        return []
    out = []
    for c in medical:
        if isinstance(c, dict):
            name = c.get("condition", c.get("name", ""))
            year = c.get("year", "")
            status = c.get("status", "")
            if name:
                parts = [name]
                if year:
                    parts.append(f"{year}yr")
                if status and status.lower() != "active":
                    parts.append(f"({status})")
                out.append(" ".join(parts))
        elif isinstance(c, str) and c:
            out.append(c)
    return out


def _extract_surgeries(med_hist: dict) -> list[str]:
    """Extract surgical history as clean strings."""
    surgical = med_hist.get("surgical", [])
    if not isinstance(surgical, list):
        return []
    out = []
    for s in surgical:
        if isinstance(s, dict):
            proc = s.get("procedure", s.get("name", ""))
            year = s.get("year", "")
            if proc:
                out.append(f"{proc} ({year}yr ago)" if year else proc)
        elif isinstance(s, str) and s:
            out.append(s)
    return out


def _extract_vision_line(vision: dict) -> str:
    """Extract vision as compact clinical string from nested structure."""
    if not vision or not isinstance(vision, dict):
        return ""
    # Handle nested structure: unaided.rightEye / leftEye
    parts = []
    for vtype in ["unaided", "withGlass", "bestCorrected", "withPinhole"]:
        v = vision.get(vtype, {})
        if not isinstance(v, dict):
            continue
        re_val = _normalize_numeric_text(str(v.get("rightEye", v.get("re", v.get("right", v.get("RE", ""))))))
        le_val = _normalize_numeric_text(str(v.get("leftEye", v.get("le", v.get("left", v.get("LE", ""))))))
        if re_val or le_val:
            label = {"unaided": "Unaided", "withGlass": "c̄ Glass", "bestCorrected": "BCVA", "withPinhole": "PH"}[vtype]
            parts.append(f"{label} RE:{re_val} LE:{le_val}")
    # Fallback: flat structure (re/le keys directly)
    if not parts:
        re_val = _normalize_numeric_text(str(vision.get("re", vision.get("right", vision.get("RE", "")))))
        le_val = _normalize_numeric_text(str(vision.get("le", vision.get("left", vision.get("LE", "")))))
        if re_val or le_val:
            parts.append(f"VA RE:{re_val} LE:{le_val}")
    return " | ".join(parts)


def _extract_iop_line(iop: dict) -> str:
    """Extract IOP as compact clinical string."""
    if not iop or not isinstance(iop, dict):
        return ""
    re_val = _normalize_numeric_text(str(iop.get("re", iop.get("right", iop.get("RE", iop.get("rightEye", ""))))))
    le_val = _normalize_numeric_text(str(iop.get("le", iop.get("left", iop.get("LE", iop.get("leftEye", ""))))))
    if re_val or le_val:
        return f"IOP RE:{re_val} LE:{le_val} mmHg"
    return ""


def _extract_slit_lamp(exam: dict) -> str:
    """Extract ophthalmologist slit lamp exam as compact clinical string."""
    if not exam or not isinstance(exam, dict):
        return ""
    lines = []
    for eye_key, eye_label in [("od", "OD"), ("os", "OS")]:
        eye = exam.get(eye_key, {})
        if not isinstance(eye, dict):
            continue
        abnormal = []
        for finding, value in eye.items():
            if not value or not isinstance(value, str):
                continue
            val_lower = value.strip().lower()
            # Skip normal/WNL findings — only report what's abnormal or notable
            if val_lower in ("normal", "wnl", "wml", "clear", ""):
                continue
            abnormal.append(f"{finding}:{value}")
        if abnormal:
            lines.append(f"{eye_label}: {', '.join(abnormal)}")
    return " | ".join(lines)


def _extract_complaints(data: dict) -> str:
    """Extract presenting complaints as compact clinical string."""
    pc = data.get("presentingComplaints", {})
    if isinstance(pc, dict):
        complaints_list = pc.get("complaints", [])
    elif isinstance(pc, list):
        complaints_list = pc
    else:
        return ""
    if not complaints_list:
        return ""
    parts = []
    for c in complaints_list:
        if isinstance(c, dict):
            comp = c.get("complaint", "")
            dur = c.get("duration", "")
            unit = c.get("durationUnit", "")
            eye = c.get("eye", "")
            if comp:
                s = comp
                # Patch 6: Clean Complaint Formatting
                if dur and unit:
                    s += f" for {dur} {unit}"
                elif dur:
                    s += f" for {dur}"
                if eye:
                    s += f" ({eye.upper()})"
                parts.append(s)
        elif isinstance(c, str) and c:
            parts.append(c)
    return "; ".join(parts)


def _extract_meds(drug_hist: dict) -> list[str]:
    """Extract current medications as clean strings."""
    meds = drug_hist.get("currentMeds", [])
    if not isinstance(meds, list):
        return []
    out = []
    for m in meds:
        if isinstance(m, dict):
            name = m.get("name", "")
            dosage = m.get("dosage", "")
            if name:
                out.append(f"{name} {dosage}".strip() if dosage else name)
        elif isinstance(m, str) and m:
            out.append(m)
    return out


def extract_summary_from_visit(visit):
    visit_summary = {
        "visitDate": visit.get("visitDate"),
        "iop": {},
        "vision": {},
        "refraction": {},
        "diagnosis": "",
        "prescription": [],
        "notes": "",
        "vitals": {},
        "systemic_investigations": {},
        "medical_history": {},
        "medications": [],
        # New fields for complete clinical picture
        "complaints": "",
        "slit_lamp": "",
        "conditions": [],
        "surgeries": [],
        "family_history": "",
        "followUp": "",
        "investigations_surgeries": {},
    }

    stages = visit.get("stages", {})

    # ── Reception data ──
    reception = stages.get("reception", {}).get("data", {})
    visit_summary["vitals"] = reception.get("vitalSigns", reception.get("vitals", {}))
    med_hist = reception.get("medicalHistory", {})
    visit_summary["medical_history"] = med_hist
    visit_summary["conditions"] = _extract_conditions(med_hist)
    visit_summary["surgeries"] = _extract_surgeries(med_hist)
    visit_summary["family_history"] = med_hist.get("familyHistory", "")
    drug_hist = reception.get("drugHistory", {})
    visit_summary["medications"] = _extract_meds(drug_hist)
    visit_summary["complaints"] = _extract_complaints(reception)

    # ── OPD / Optometry data ──
    opd_data = stages.get("opd", {}).get("data", {})
    optometry = opd_data.get("optometry", {})
    visit_summary["vision"] = optometry.get("vision", {})
    visit_summary["iop"] = opd_data.get("iop", optometry.get("iop", {}))
    visit_summary["refraction"] = optometry.get("autoRefraction", {})
    visit_summary["systemic_investigations"] = opd_data.get("systemicInvestigations", {})

    # ── Doctor data ──
    doc_data = stages.get("doctor", {}).get("data", {})
    visit_summary["diagnosis"] = doc_data.get("diagnosis", "")
    visit_summary["prescription"] = doc_data.get("prescription", {}).get("items", []) if isinstance(doc_data.get("prescription"), dict) else doc_data.get("prescription", [])
    visit_summary["notes"] = doc_data.get("notes", "")
    visit_summary["followUp"] = doc_data.get("followUp", "")
    visit_summary["slit_lamp"] = _extract_slit_lamp(doc_data.get("ophthalmologistExam", {}))
    visit_summary["investigations_surgeries"] = doc_data.get("investigationsSurgeries", {})

    return visit_summary

def _build_current_visit_from_document(patient: dict) -> dict:
    """Build a synthetic visit from top-level patient document fields.
    
    When visits[] is empty, clinical data is stored flat on the document.
    """
    # Optometry / IOP
    optometry = patient.get("optometry", {})
    iop_data = patient.get("iop", optometry.get("iop", {}))
    vision = optometry.get("vision", {})
    refraction = optometry.get("autoRefraction", {})

    # Doctor data
    ophth_exam = patient.get("ophthalmologistExam", {})
    diagnosis = patient.get("diagnosis", "")
    prescription_items = patient.get("prescription", {})
    if isinstance(prescription_items, dict):
        prescription_items = prescription_items.get("items", [])
    notes = patient.get("notes", "")
    followUp = patient.get("followUp", "")

    # Reception-level data
    vitals_data = patient.get("vitalSigns", patient.get("vitals", {}))
    med_hist = patient.get("medicalHistory", patient.get("history", {}))
    drug_hist = patient.get("drugHistory", {})

    # Systemic investigations
    systemic = patient.get("systemicInvestigations", patient.get("systemic", {}))

    # Complaints
    complaints = _extract_complaints(patient)

    return {
        "visitDate": patient.get("lastUpdated", "current"),
        "iop": iop_data,
        "vision": vision,
        "refraction": refraction,
        "diagnosis": diagnosis,
        "prescription": prescription_items if isinstance(prescription_items, list) else [],
        "notes": notes,
        "followUp": followUp,
        "vitals": vitals_data,
        "systemic_investigations": systemic,
        "medical_history": med_hist,
        "medications": _extract_meds(drug_hist),
        "complaints": complaints,
        "slit_lamp": _extract_slit_lamp(ophth_exam),
        "conditions": _extract_conditions(med_hist),
        "surgeries": _extract_surgeries(med_hist),
        "family_history": med_hist.get("familyHistory", "") if isinstance(med_hist, dict) else "",
        "investigations_surgeries": patient.get("investigationsSurgeries", {}),
    }


def get_patient_summary(patient_id, max_visits=3):
    """Legacy curated summary — kept for backward compat."""
    oid = _coerce_object_id(patient_id)
    if oid is not None:
        patient = patients.find_one({"_id": oid})
    else:
        patient = patients.find_one({"_id": patient_id})

    if not patient:
        return { "error": "Patient not found" }

    summary = {
        "name": patient.get("name"),
        "registrationId": patient.get("registrationId"),
        "sex": patient.get("demographics", {}).get("sex", ""),
        "age": patient.get("demographics", {}).get("age", ""),
        "visits": []
    }

    visits = patient.get("visits", [])[-max_visits:]
    summary["visits"] = [extract_summary_from_visit(v) for v in visits]

    # If no visits in history, build a synthetic visit from top-level document fields
    if not summary["visits"]:
        current_visit = _build_current_visit_from_document(patient)
        # Only add if there's at least some meaningful data
        has_data = any([
            current_visit.get("iop"),
            current_visit.get("vision"),
            current_visit.get("diagnosis"),
            current_visit.get("vitals"),
            current_visit.get("medications"),
            current_visit.get("medical_history"),
        ])
        if has_data:
            summary["visits"].append(current_visit)
        else:
            # Even with no clinical data, include a stub so the LLM gets patient context
            summary["visits"].append(current_visit)

    return summary


def get_raw_patient(patient_id: str) -> dict:
    """Fetch the FULL raw MongoDB patient document.

    Returns the complete document with _id converted to string.
    Downstream agents (signal_extractor) decide what is clinically relevant.
    Supports both standard ObjectId and legacy string _id values.
    """
    # Try ObjectId first, then fall back to plain string _id
    oid = _coerce_object_id(patient_id)
    if oid is not None:
        patient = patients.find_one({"_id": oid})
    else:
        # Legacy SQL-imported patients have plain string _id (e.g. "10", "1002")
        patient = patients.find_one({"_id": patient_id})

    if not patient:
        return {"error": "Patient not found"}

    # Convert ObjectId to string for JSON safety
    patient["_id"] = str(patient["_id"])

    return patient
