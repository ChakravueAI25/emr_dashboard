from backend.database import patient_collection
import json
from bson import json_util

# Find a patient with surgery bills
patient = patient_collection.find_one({"billing.surgeryBills": {"$exists": True, "$not": {"$size": 0}}})

if patient:
    bills = patient.get("billing", {}).get("surgeryBills", [])
    print(json_util.dumps(bills, indent=2))
else:
    print("No patient with surgery bills found.")
