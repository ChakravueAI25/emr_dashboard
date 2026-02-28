from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Connect to MongoDB
uri = os.getenv("MONGO_URI")
if not uri:
    uri = "mongodb://localhost:27017"
    
print(f"Connecting to: {uri.split('@')[-1] if '@' in uri else uri}") # Hide credentials
client = MongoClient(uri)
db = client[os.getenv("DATABASE_NAME", "chakra_hospital")]
collection = db["pharmacy_billing"]

print(f"Connected to database: {db.name}")
print(f"Collection: {collection.name}")

# Count total documents
count = collection.count_documents({})
print(f"Total entries: {count}")

# Find last 5 entries
cursor = collection.find().sort("createdAt", -1).limit(5)
print("\n--- Last 5 Pharmacy Bills ---")
for doc in cursor:
    print(f"Bill ID: {doc.get('billId')}")
    print(f"  Date: {doc.get('createdAt')}")
    print(f"  Patient: {doc.get('patientName')} ({doc.get('registrationId')})")
    print(f"  Total Amount: {doc.get('totalAmount')}")
    print(f"  Payment Method: {doc.get('paymentMethod')}")
    if doc.get('paymentMethod') == 'WaveOff':
        print(f"  Wave Off Reason: {doc.get('waveOffReason')}")
        print("  [SUCCESS] Wave Off Bill Found!")
    print("-" * 30)

# Check specifically for Wave Off bills
wave_off_count = collection.count_documents({"paymentMethod": "WaveOff"})
print(f"\nTotal Wave Off Bills found: {wave_off_count}")
