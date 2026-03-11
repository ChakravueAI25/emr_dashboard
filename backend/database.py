import os
from pymongo import MongoClient
from pymongo.errors import OperationFailure
from motor.motor_asyncio import AsyncIOMotorClient
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
# Increase connection pool size to handle higher load (default is 100)
client_kwargs = {"maxPoolSize": 200}

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
presets_collection = db["presets"]
vendors_collection = db["vendors"]
purchase_invoices_collection = db["purchase_invoices"]
vendor_payments_collection = db["vendor_payments"]
patient_documents_collection = db["patient_documents"]


def _create_index_safe(collection, keys, **kwargs):
    """Create an index without failing when an equivalent index already exists."""
    try:
        collection.create_index(keys, **kwargs)
    except OperationFailure as exc:
        message = str(exc).lower()
        if "already exists" in message or "equivalent index" in message:
            return
        raise


def _ensure_billing_indexes():
    # billing_invoices indexes
    _create_index_safe(billing_invoices_collection, [("invoiceId", 1)], unique=True)
    _create_index_safe(billing_invoices_collection, [("registrationId", 1)])
    _create_index_safe(billing_invoices_collection, [("status", 1)])
    _create_index_safe(billing_invoices_collection, [("createdAt", -1)])

    # initial_surgery_bills indexes
    _create_index_safe(initial_surgery_bills_collection, [("billId", 1)], unique=True)
    _create_index_safe(initial_surgery_bills_collection, [("registrationId", 1)])
    _create_index_safe(initial_surgery_bills_collection, [("status", 1)])
    _create_index_safe(initial_surgery_bills_collection, [("createdAt", -1)])

    # final_surgery_bills indexes
    _create_index_safe(final_surgery_bills_collection, [("billId", 1)], unique=True)
    _create_index_safe(final_surgery_bills_collection, [("registrationId", 1)])
    _create_index_safe(final_surgery_bills_collection, [("status", 1)])
    _create_index_safe(final_surgery_bills_collection, [("createdAt", -1)])

    # pharmacy_billing indexes
    _create_index_safe(pharmacy_billing_collection, [("registrationId", 1)])
    _create_index_safe(pharmacy_billing_collection, [("status", 1)])
    _create_index_safe(pharmacy_billing_collection, [("billDate", -1)])

    # patient_documents indexes
    _create_index_safe(patient_documents_collection, [("registrationId", 1)])
    _create_index_safe(patient_documents_collection, [("fileId", 1)], unique=True)
    _create_index_safe(patient_documents_collection, [("uploadedDate", -1)])


_ensure_billing_indexes()

# Async Client (Motor) for non-blocking I/O
async_client = AsyncIOMotorClient(MONGO_URI, **client_kwargs)
async_db = async_client[DATABASE_NAME]

# Async Collections (Lazy load as needed or define here)
async_patient_collection = async_db["patients"]
async_patient_queue_collection = async_db["patient_queue"]
