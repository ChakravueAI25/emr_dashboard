from backend.main import patient_visits

result = patient_visits('REG-2025-370784')
print('Visits by month:')
for item in result:
    print(f'  {item}')
    
dec_visits = sum(v['visits'] for v in result if v['month'] == '2025-12')
print(f'Total unique visit dates in Dec: {dec_visits}')
