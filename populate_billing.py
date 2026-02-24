from backend.database import patient_collection
from datetime import datetime, timedelta

reg_id = 'REG-2025-370784'
p = patient_collection.find_one({'registrationId': reg_id})

if p:
    name = p.get('patientDetails', {}).get('name', 'Unknown')
    print(f'Patient found: {name}')
    billing = p.get('billing', {})
    print(f'Billing data exists: {bool(billing)}')
    print(f'Invoices: {len(billing.get("invoices", []))}')
    print(f'Payments: {len(billing.get("payments", []))}')
    
    # If no billing data, create sample invoices
    if not billing or len(billing.get('invoices', [])) == 0:
        print('\nCreating sample billing data...')
        
        sample_invoices = [
            {
                "id": "INV-2025-001",
                "date": "2025-10-15",
                "service": "Comprehensive Eye Exam",
                "amount": 4200,
                "insuranceCovered": 3360,
                "patientResponsibility": 840,
                "status": "paid",
                "notes": "",
                "createdAt": datetime.utcnow().isoformat()
            },
            {
                "id": "INV-2025-002",
                "date": "2025-12-04",
                "service": "OCT Scan - Bilateral",
                "amount": 7500,
                "insuranceCovered": 6000,
                "patientResponsibility": 1500,
                "status": "pending",
                "notes": "",
                "createdAt": datetime.utcnow().isoformat()
            },
            {
                "id": "INV-2025-003",
                "date": "2025-12-05",
                "service": "Visual Field Test",
                "amount": 3000,
                "insuranceCovered": 2400,
                "patientResponsibility": 600,
                "status": "pending",
                "notes": "",
                "createdAt": datetime.utcnow().isoformat()
            }
        ]
        
        sample_payments = [
            {
                "id": "PAY-001",
                "date": "2025-10-16",
                "amount": 840,
                "method": "Credit Card",
                "invoiceId": "INV-2025-001",
                "notes": "",
                "createdAt": datetime.utcnow().isoformat()
            }
        ]
        
        sample_insurance = {
            "provider": "Blue Cross Blue Shield",
            "policyNumber": "BCBS-123456789",
            "groupNumber": "GRP-987654",
            "coverageType": "PPO",
            "copay": "500",
            "deductible": "25000",
            "deductibleMet": 14500,
            "outOfPocketMax": "85000",
            "outOfPocketMet": 20000,
            "effectiveDate": "2025-01-01",
            "expirationDate": "2025-12-31",
            "coverageVerified": True,
            "lastVerified": "2025-10-01"
        }
        
        patient_collection.update_one(
            {'registrationId': reg_id},
            {'$set': {
                'billing': {
                    'invoices': sample_invoices,
                    'payments': sample_payments,
                    'insurance': sample_insurance,
                    'claims': []
                }
            }}
        )
        
        print('✓ Sample billing data created!')
else:
    print('Patient not found')
