from backend.database import patient_collection

p = patient_collection.find_one({'registrationId': 'REG-2025-370784'})
if p:
    encs = p.get('encounters', [])
    print(f'Total encounters: {len(encs)}')
    for i, e in enumerate(encs):
        date = e.get('date', 'unknown')
        enc_type = e.get('type', 'unknown')
        print(f'{i+1}. date={date}, type={enc_type}')
else:
    print('Patient not found')
