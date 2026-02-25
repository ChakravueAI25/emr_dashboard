
import requests
import json
import random
from datetime import datetime
from pymongo import MongoClient
import time
import os

# --- CONFIGURE ---
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "chakra_hospital"
API_URL = "http://127.0.0.1:8008/ai/generate-summary" # Trying 8008 as per previous context

# --- CLINICAL TEST CASES (GENERATOR) ---
# We will generate cases for: Cataract, Glaucoma, Diabetic Retinopathy, Normal, Acute Conjunctivitis

def get_base_patient(name, age, sex):
    return {
        "name": name,
        "registrationId": f"TEST-{random.randint(10000,99999)}",
        "demographics": {"age": str(age), "sex": sex, "bloodType": "O+"},
        "contactInfo": {"phone": "555-0000", "email": "test@example.com", "address": "Test City"},
        "emergencyContact": {"name": "Test Contact", "phone": "555-0001"},
        "history": {
            "severity": "", "onset": "", "aggravating": "", "relieving": "", "associated": "",
            "medical": [], "surgical": [], "family": ""
        },
        "encounters": [],
        "created_at": datetime.utcnow()
    }

test_cases = [
    {
        "condition": "Mature Cataract (Right Eye)",
        "patient": get_base_patient("Test Case Cataract", 68, "Female"),
        "complaints": [
            {"complaint": "Blurred vision", "duration": "6 months", "eye": "re", "aggravatingFactors": ["Bright light", "Sunlight"]},
            {"complaint": "Glare", "duration": "2 months", "eye": "re"}
        ],
        "history": {"medical": [{"id": "1", "condition": "Hypertension", "year": "2015", "status": "Controlled"}]},
        "optometry": {
            "vision": {
                "unaided": {"rightEye": "HM", "leftEye": "6/9"},
                "bestCorrected": {"rightEye": "HM", "leftEye": "6/6"}
            }
        },
        "iop": {"re": "14", "le": "15"},
        "exam": {
            "od": {"lens": "Mature Cataract", "pupil": "Sluggish", "fundus": "No glow"},
            "os": {"lens": "NS II", "fundus": "WNL"}
        },
        "diagnosis": "Mature Senile Cataract RE"
    },
    {
        "condition": "Primary Open Angle Glaucoma",
        "patient": get_base_patient("Test Case Glaucoma", 55, "Male"),
        "complaints": [
            {"complaint": "Routine checkup", "duration": "", "eye": "both"},
            {"complaint": "Mild eye pain", "duration": "1 month", "eye": "both"}
        ],
        "history": {"family": "Father had glaucoma"},
        "optometry": {
            "vision": {
                "unaided": {"rightEye": "6/6", "leftEye": "6/6"},
                "bestCorrected": {"rightEye": "6/6", "leftEye": "6/6"}
            }
        },
        "iop": {"re": "28", "le": "30"},
        "exam": {
            "od": {"ac": "Deep", "fundus": "CDR 0.7, Inferior notch"},
            "os": {"ac": "Deep", "fundus": "CDR 0.8, Bayoneting present"}
        },
        "diagnosis": "POAG Both Eyes"
    },
    {
        "condition": "Diabetic Retinopathy (PDR)",
        "patient": get_base_patient("Test Case DR", 45, "Male"),
        "complaints": [
            {"complaint": "Floaters", "duration": "1 week", "eye": "le"},
            {"complaint": "Sudden vision drop", "duration": "2 days", "eye": "le"}
        ],
        "history": {
            "medical": [{"id": "1", "condition": "Diabetes Mellitus Type 2", "year": "2010", "status": "Uncontrolled"}]
        },
        "optometry": {
            "vision": {
                "unaided": {"rightEye": "6/18", "leftEye": "CF 1m"},
                "bestCorrected": {"rightEye": "6/9", "leftEye": "CF 1m"}
            }
        },
        "iop": {"re": "16", "le": "18"},
        "exam": {
            "od": {"fundus": "Hard exudates at macula, multiple dot hemorrhages"},
            "os": {"fundus": "Vitreous hemorrhage, Neovascularization elsewhere (NVE)"}
        },
        "diagnosis": "PDR LE, NPDR RE"
    },
    {
        "condition": "Acute Bacterial Conjunctivitis",
        "patient": get_base_patient("Test Case Conjunctivitis", 12, "Male"),
        "complaints": [
            {"complaint": "Redness", "duration": "2 days", "eye": "re"},
            {"complaint": "Discharge", "duration": "2 days", "eye": "re", "aggravatingFactors": ["Morning"]}
        ],
        "history": {},
        "optometry": {
            "vision": {
                "unaided": {"rightEye": "6/6", "leftEye": "6/6"}
            }
        },
        "iop": {"re": "12", "le": "12"},
        "exam": {
            "od": {"conjunctiva": "Congestion ++", "discharge": "Purulent"},
            "os": {"conjunctiva": "Normal"}
        },
        "diagnosis": "Acute Bacterial Conjunctivitis RE"
    },
    {
        "condition": "Normal Healthy Eye",
        "patient": get_base_patient("Test Case Normal", 25, "Female"),
        "complaints": [
            {"complaint": "Routine checkup", "duration": "", "eye": "both"}
        ],
        "history": {},
        "optometry": {
            "vision": {
                "unaided": {"rightEye": "6/5", "leftEye": "6/5"}
            }
        },
        "iop": {"re": "16", "le": "16"},
        "exam": {
            "od": {"anterior": "WNL", "fundus": "WNL"},
            "os": {"anterior": "WNL", "fundus": "WNL"}
        },
        "diagnosis": "Refractive Error (None)"
    }
]

# --- MAIN SCRIPT ---

def build_full_record(case):
    """Integrate clinical data into the patient record structure used by the app."""
    p = case["patient"]
    
    # 1. Reception Data (Encounter 1)
    reception_enc = {
        "date": datetime.utcnow(),
        "doctor": "Reception",
        "details": {
            "presentingComplaints": {
                "complaints": case["complaints"],
                "history": case["history"]
            }
        }
    }
    
    # 2. Doctor/Clinical Data (Encounter 2 or merged fields)
    # We populate the root fields that the summary agent looks at.
    p["presentingComplaints"] = {"complaints": case["complaints"], "history": case["history"]}
    p["medicalHistory"] = case["history"]
    p["optometry"] = case["optometry"]
    p["iop"] = case["iop"]
    p["doctor"] = {
        "ophthalmologistExam": case["exam"],
        "diagnosis": case["diagnosis"]
    }
    p["ophthalmologistExam"] = case["exam"] # Root level usage sometimes
    
    # Add encounters
    p["encounters"].append(reception_enc)
    
    return p

def run_tests():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    patients_col = db["patients"]
    
    clinical_values_log = []
    ai_summary_log = []

    print("--- STARTING OPHTHALMOLOGY AI SUMMARY TEST ---")
    
    for idx, case in enumerate(test_cases):
        case_id = f"CASE-{idx+1}"
        condition = case["condition"]
        print(f"\nProcessing {case_id}: {condition}")
        
        # 1. Prepare and Insert Data
        full_patient = build_full_record(case)
        result = patients_col.insert_one(full_patient)
        mongo_id = str(result.inserted_id)
        
        # 2. Log Clinical Values
        clinical_text = f"ID: {case_id}\nCondition: {condition}\n"
        clinical_text += f"Complaints: {json.dumps(case['complaints'], indent=2)}\n"
        clinical_text += f"Vision: {json.dumps(case['optometry']['vision'], indent=2)}\n"
        clinical_text += f"IOP: {json.dumps(case['iop'], indent=2)}\n"
        clinical_text += f"Exam: {json.dumps(case['exam'], indent=2)}\n"
        clinical_text += "-" * 40
        clinical_values_log.append(clinical_text)
        
        # 3. Request AI Summary
        try:
            print(f"   -> Sending API request for {case_id}...")
            # Real API call to the running backend
            resp = requests.post(API_URL, json={"patientId": mongo_id})
            
            if resp.status_code == 200:
                summary = resp.json().get("summary", "No summary key returned")
            else:
                summary = f"API Error {resp.status_code}: {resp.text}"
                print(f"   -> API Error: {resp.text}")
                
        except Exception as e:
            summary = f"Request Failed: {str(e)}"
            print(f"   -> Request Exception: {e}")
            
        # 4. Log AI Summary
        ai_text = f"ID: {case_id}\nTarget Condition: {condition}\n"
        ai_text += f"AI SUMMARY:\n{summary}\n"
        ai_text += "-" * 40
        ai_summary_log.append(ai_text)
        
        # 5. Cleanup (Optional - keep for now or delete)
        # patients_col.delete_one({"_id": result.inserted_id}) 

        # --- WRITE PROGRESSIVELY ---
        with open("clinical_values.txt", "a", encoding="utf-8") as f:
            f.write(clinical_text + "\n\n")

        with open("ai_summaries.txt", "a", encoding="utf-8") as f:
            f.write(ai_text + "\n\n")

    print("\n--- TEST COMPLETE ---")
    print("Files generated:")
    print("1. clinical_values.txt")
    print("2. ai_summaries.txt")

if __name__ == "__main__":
    # Clear files
    open("clinical_values.txt", "w").close()
    open("ai_summaries.txt", "w").close()
    
    run_tests()
