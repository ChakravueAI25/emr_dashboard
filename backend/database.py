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
insurance_companies_collection = db["insurance_companies"]
billing_advances_collection = db["billing_advances"]
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
employees_collection = db["employees"]
payroll_records_collection = db["payroll_records"]
inventory_invoices_collection = db["inventory_invoices"]
inventory_items_collection = db["inventory_items"]
lens_serial_inventory_collection = db["lens_serial_inventory"]
inventory_stock_collection = db["stock_collection"]
lens_usage_collection = db["lens_usage"]
inventory_usage_collection = db["inventory_usage"]
inventory_stock_ledger_collection = db["inventory_stock_ledger"]
expenses_collection = db["expenses"]


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
    # insurance companies indexes
    _create_index_safe(insurance_companies_collection, [("name_lower", 1)], unique=True)
    _create_index_safe(insurance_companies_collection, [("name", 1)])

    # billing_advances indexes
    _create_index_safe(billing_advances_collection, [("advance_id", 1)], unique=True)
    _create_index_safe(billing_advances_collection, [("registration_id", 1)])
    _create_index_safe(billing_advances_collection, [("status", 1)])
    _create_index_safe(billing_advances_collection, [("date", -1)])

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
    _create_index_safe(patient_documents_collection, [("category", 1)])
    _create_index_safe(patient_documents_collection, [("uploadedDate", -1)])

    # payroll indexes
    _create_index_safe(employees_collection, [("employeeId", 1)], unique=True)
    _create_index_safe(employees_collection, [("createdAt", -1)])
    _create_index_safe(payroll_records_collection, [("employeeId", 1), ("month", 1)], unique=True)
    _create_index_safe(payroll_records_collection, [("month", 1)])
    _create_index_safe(payroll_records_collection, [("createdAt", -1)])

    # inventory indexes
    _create_index_safe(inventory_invoices_collection, [("invoice_id", 1)], unique=True)
    _create_index_safe(inventory_invoices_collection, [("vendor", 1)])
    _create_index_safe(inventory_invoices_collection, [("invoice_number", 1)])
    _create_index_safe(inventory_invoices_collection, [("invoice_date", -1)])
    _create_index_safe(inventory_invoices_collection, [("created_at", -1)])

    _create_index_safe(inventory_items_collection, [("invoice_id", 1)])
    _create_index_safe(inventory_items_collection, [("description", 1)])
    _create_index_safe(inventory_items_collection, [("is_serial_tracked", 1)])
    _create_index_safe(inventory_items_collection, [("created_at", -1)])

    _create_index_safe(lens_serial_inventory_collection, [("serial_number", 1)], unique=True)
    _create_index_safe(lens_serial_inventory_collection, [("lens_model", 1)])
    _create_index_safe(lens_serial_inventory_collection, [("status", 1)])
    _create_index_safe(lens_serial_inventory_collection, [("invoice_id", 1)])

    _create_index_safe(inventory_stock_collection, [("description", 1)], unique=True)
    _create_index_safe(inventory_stock_collection, [("last_updated", -1)])
    _create_index_safe(inventory_stock_collection, [("item_type", 1)])
    _create_index_safe(inventory_stock_collection, [("minimum_stock_level", 1)])

    _create_index_safe(lens_usage_collection, [("serial_number", 1)], unique=True)
    _create_index_safe(lens_usage_collection, [("patient_id", 1)])
    _create_index_safe(lens_usage_collection, [("surgery_date", -1)])

    _create_index_safe(inventory_usage_collection, [("description", 1)])
    _create_index_safe(inventory_usage_collection, [("department", 1)])
    _create_index_safe(inventory_usage_collection, [("date", -1)])

    _create_index_safe(inventory_stock_ledger_collection, [("description", 1)])
    _create_index_safe(inventory_stock_ledger_collection, [("movement_type", 1)])
    _create_index_safe(inventory_stock_ledger_collection, [("date", -1)])
    _create_index_safe(inventory_stock_ledger_collection, [("reference_id", 1)])

    # expenses indexes
    _create_index_safe(expenses_collection, [("expense_id", 1)], unique=True)
    _create_index_safe(expenses_collection, [("date", -1)])
    _create_index_safe(expenses_collection, [("payment_mode", 1)])
    _create_index_safe(expenses_collection, [("category", 1)])


_ensure_billing_indexes()

# Async Client (Motor) for non-blocking I/O
async_client = AsyncIOMotorClient(MONGO_URI, **client_kwargs)
async_db = async_client[DATABASE_NAME]

# Async Collections (Lazy load as needed or define here)
async_patient_collection = async_db["patients"]
async_patient_queue_collection = async_db["patient_queue"]
