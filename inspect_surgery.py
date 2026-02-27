
from backend.database import patient_collection
import json

# Fetch distinct statuses
statuses = patient_collection.distinct("billing.surgeryBills.status")
print("--- SURGERY BILL STATUSES ---")
print(statuses)

