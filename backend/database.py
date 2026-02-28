import os
from pymongo import MongoClient
import certifi
from dotenv import load_dotenv

load_dotenv()

# Fallback to local if MONGO_URI (Atlas) is not set
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    MONGO_URI = os.getenv("MONGO_URI_LOCAL", "mongodb://localhost:27017")

DATABASE_NAME = os.getenv("DATABASE_NAME", "chakra_hospital")

if not MONGO_URI or not DATABASE_NAME:
    # This shouldn't happen with defaults above, but good for safety
    print("Warning: Database config missing, defaulting to localhost/chakra_hospital")
    MONGO_URI = "mongodb://localhost:27017"
    DATABASE_NAME = "chakra_hospital"

# Use certifi for SSL certificates only for Atlas connections to avoid handshake errors on Windows
# Local MongoDB usually doesn't use SSL by default
client_kwargs = {}
if "mongodb.net" in MONGO_URI or "mongodb+srv://" in MONGO_URI:
    client_kwargs["tlsCAFile"] = certifi.where()

client = MongoClient(MONGO_URI, **client_kwargs)
db = client[DATABASE_NAME]

# Collections
patient_collection = db["patients"]
patient_queue_collection = db["patient_queue"]
user_collection = db["users"]
pharmacy_collection = db["pharmacy_medicines"]
pharmacy_billing_collection = db["pharmacy_billing"]
coupon_quota_collection = db["coupon_quotas"]
billing_cases_collection = db["billing_cases"]
surgery_packages_collection = db["surgery_packages"]
billing_invoices_collection = db["billing_invoices"]
initial_surgery_bills_collection = db["initial_surgery_bills"]
final_surgery_bills_collection = db["final_surgery_bills"]
slit_lamp_collection = db["slit_lamp_images"]
doctor_feedback_collection = db["doctor_feedback"]