# Insurance Data Architecture - Complete Guide

## Overview

The EMR Dashboard tracks insurance at **two levels**:
1. **Patient-Level Insurance**: Policy information (what the patient has)
2. **Bill-Level Insurance**: Approval information (what insurers approved for specific procedures)

---

## 1. Patient-Level Insurance (Policy Information)

### Storage Location
```
patients collection → billing.insurance object
```

### Data Structure
Patient insurance is stored as an embedded object within each patient's billing record:

```json
{
  "registrationId": "REG-2025-123456",
  "name": "John Doe",
  "billing": {
    "insurance": {
      "provider": "Star Health Insurance",
      "policyNumber": "SH123456789",
      "groupNumber": "GRP789",
      "coverageType": "Cashless",
      "copay": 500,
      "deductible": 5000,
      "deductibleMet": 3500,
      "outOfPocketMax": 10000,
      "outOfPocketMet": 2000,
      "effectiveDate": "2025-01-01",
      "expirationDate": "2025-12-31",
      "coverageVerified": true,
      "lastVerified": "2025-03-15T10:30:00"
    }
  }
}
```

### Field Descriptions

| Field | Type | Purpose |
|-------|------|---------|
| `provider` | string | Insurance company name (e.g., "Star Health Insurance", "ICICI Lombard") |
| `policyNumber` | string | Unique policy identifier for the patient |
| `groupNumber` | string | Group policy number (if employer-based insurance) |
| `coverageType` | string | Type of coverage (e.g., "Cashless", "Reimbursement", "Hybrid") |
| `copay` | float | Fixed amount patient pays per visit/procedure |
| `deductible` | float | Amount patient must pay before insurance covers (annual) |
| `deductibleMet` | float | Amount of deductible already met this year |
| `outOfPocketMax` | float | Maximum patient pays out-of-pocket annually |
| `outOfPocketMet` | float | Amount of out-of-pocket maximum already met |
| `effectiveDate` | date | Policy coverage start date (YYYY-MM-DD format) |
| `expirationDate` | date | Policy coverage end date |
| `coverageVerified` | boolean | Whether coverage was verified with insurer |
| `lastVerified` | datetime | When coverage was last verified |

### API Endpoints for Patient Insurance

**GET** `/api/billing/patient/{registrationId}/insurance`
```
Returns: {
  "provider": "Star Health",
  "policyNumber": "SH123456789",
  "groupNumber": "GRP789",
  ...all 12 fields above...
}
```

**PUT** `/api/billing/patient/{registrationId}/insurance`
```
Body: { ...insurance fields... }
Returns: { "status": "success", "message": "Insurance information updated" }
```

### Update Workflow (Patient Insurance)

```
Frontend Insurance Form
  ↓
PUT /api/billing/patient/{regId}/insurance
  ↓
main.py: update_patient_insurance()
  ↓
Execute: db.patients.update_one(
    {"registrationId": regId},
    {"$set": {"billing.insurance": insurance_data}}
)
  ↓
Patient record updated ✓
```

---

## 2. Bill-Level Insurance (Approval Information)

### Storage Location
```
final_surgery_bills collection (standalone)
```

### Data Structure
Insurance approval details are stored **directly on each surgery bill**:

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "registrationId": "REG-2025-123456",
  "patientName": "John Doe",
  "billId": "BILL-2025-001",
  "surgeryName": "Cataract Surgery with IOL",
  "surgeryDate": "2025-03-10",
  "patientTotalShare": 15000,
  "balancePayable": 0,
  "status": "settled",
  
  // INSURANCE FIELDS (Level 1 - Approval)
  "insuranceCompany": "Star Health Insurance",
  "insuranceApprovedAmount": 25000,
  "insuranceApprovalDate": "2025-03-08T14:30:00",
  "insuranceClaimReference": "CLM-SH-2025-45678",
  
  "createdAt": "2025-03-10T09:00:00"
}
```

### Field Descriptions

| Field | Type | Purpose |
|-------|------|---------|
| `insuranceCompany` | string | Insurance provider approved this claim (can be null if no insurance) |
| `insuranceApprovedAmount` | float | Amount the insurer approved for reimbursement (₹0 if not approved) |
| `insuranceApprovalDate` | date/datetime | Date insurer approved the claim (YYYY-MM-DD or ISO format) |
| `insuranceClaimReference` | string | Claim ID/reference number from the insurance company |

### Important Notes

**Null Handling in Analytics:**
- Only bills with `insuranceCompany != null AND insuranceApprovedAmount > 0` appear in insurance analytics
- If `insuranceApprovalDate` is missing/invalid, falls back to bill's `createdAt` date
- This ensures only approved claims are counted in "Approved Insurance Receivable"

**Relationship to Patient Insurance:**
- Patient insurance policy (e.g., Star Health with ₹5000 deductible) is **policy info**
- Surgery bill insurance (₹25000 approved for this specific surgery) is **approval info**
- They live in separate places: patient.billing.insurance vs final_surgery_bills.insuranceXXX

---

## 3. Insurance Analytics (Dashboard)

### Collection: `final_surgery_bills`

**Pipeline Location:** [backend/main.py line 4317-4340](backend/main.py#L4317-L4340)

```python
analytics_insurance_pipeline = [
    {"$match": {
        "insuranceCompany": {"$nin": [None, ""]},
        "insuranceApprovedAmount": {"$gt": 0}
    }},
    {"$project": {
        "date": {
            "$cond": [
                # If insuranceApprovalDate exists and is valid date string
                {"$and": [
                    {"$ne": [{"$ifNull": ["$insuranceApprovalDate", ""]}, ""]},
                    {"$gte": [{"$strLenCP": {"$ifNull": ["$insuranceApprovalDate", ""]}}, 10]}
                ]},
                # Use approval date (first 10 chars: YYYY-MM-DD)
                {"$substr": ["$insuranceApprovalDate", 0, 10]},
                # Otherwise fall back to creation date
                {"$substr": ["$createdAt", 0, 10]}
            ]
        },
        "registrationId": {"$ifNull": ["$registrationId", "$registrationId"]},
        "patientName": "$patientName",
        "insuranceCompany": "$insuranceCompany",
        "amount": "$insuranceApprovedAmount",
        "surgeryName": "$surgeryName",
        "billId": "$billId",
        "claimReference": "$insuranceClaimReference"
    }}
]
```

### Pipeline Output Structure

Raw records (one per approved claim):

```json
{
  "date": "2025-03-08",
  "registrationId": "REG-2025-123456",
  "patientName": "John Doe",
  "insuranceCompany": "Star Health Insurance",
  "amount": 25000,
  "surgeryName": "Cataract Surgery with IOL",
  "billId": "BILL-2025-001",
  "claimReference": "CLM-SH-2025-45678"
}
```

No grouping in pipeline; frontend later groups these by company:

```json
{
  "totalApprovedInsurance": 238656,
  "insuranceApprovedRecords": [
    {record 1},
    {record 2},
    ...
  ],
  "insuranceCompanies": {
    "Star Health Insurance": {
      "total": 208635,
      "patientCount": 12,
      "records": [...]
    },
    "ICICI Lombard": {
      "total": 29998,
      "patientCount": 2,
      "records": [...]
    },
    "State Health Scheme": {
      "total": 23,
      "patientCount": 1,
      "records": [...]
    }
  }
}
```

---

## 4. Frontend Insurance Display

### File: [src/components/BillingAnalyticsView.tsx](src/components/BillingAnalyticsView.tsx)

#### Data Flow

```
GET /api/billing/analytics
  ↓
Receive { dailyData, monthlyData, yearlyData, insuranceApprovedRecords }
  ↓
getInsuranceInsights(records, period)  [line 390]
  ↓
Group by insuranceCompany
  ↓
Display:
  1. Cards with company totals & patient counts
  2. Selected company detail view with patient-wise breakdown
```

#### Insurance UI Components

**Card 1: Insurance Companies Overview** (Lines 430-470)
```tsx
Each company shows:
- Company name
- Total approved amount (₹)
- Patient count
- Clickable to select for detail view
```

**Card 2: Selected Company Detail** (Lines 472-478)
```tsx
When company selected:
- Patient name
- Registration ID
- Surgery name
- Approved amount
- Sorted by amount descending
```

**Example Display:**
```
┌─ APPROVED INSURANCE RECEIVABLE: ₹2,38,656 ─┐
│                                              │
│ INSURANCE COMPANIES:                        │
│ • Star Health Insurance      ₹2,08,635 (12) │
│ • ICICI Lombard             ₹29,998 (2)    │
│ • State Health Scheme       ₹23 (1)        │
│                                             │
│ [Star Health selected]                      │
│                                             │
│ PATIENT-WISE BREAKDOWN:                     │
│ • Manik Reddy Malge... ₹25,000 (Surgery)   │
│ • APARNA ............. ₹20,000 (IOL)       │
│ • AMEENA ............. ₹18,900 (Cataract)  │
└─────────────────────────────────────────────┘
```

---

## 5. Complete Data Flow: Surgery → Approval → Dashboard

### Step 1: Create Surgery Bill (Surgeon/Billing)

```
Frontend Surgery Bill Form
  ↓
POST /api/billing/patient/{regId}/surgery-bills/final
  ↓
Body includes:
{
  "surgeryName": "Cataract Surgery with IOL",
  "patientTotalShare": 15000,
  "insuranceCompany": "Star Health Insurance",      ← NEW
  "insuranceApprovedAmount": 25000,                 ← NEW
  "insuranceApprovalDate": "2025-03-08",            ← NEW
  "insuranceClaimReference": "CLM-SH-2025-45678"    ← NEW
}
```

### Step 2: Write to Database

```
main.py: create_final_surgery_bill() (line 2890)
  ↓
Extract insurance fields from request body
  ↓
Create document:
{
  ...bill fields...,
  "insuranceCompany": bill_data.get("insuranceCompany"),
  "insuranceApprovedAmount": bill_data.get("insuranceApprovedAmount"),
  "insuranceApprovalDate": bill_data.get("insuranceApprovalDate"),
  "insuranceClaimReference": bill_data.get("insuranceClaimReference")
}
  ↓
db.final_surgery_bills.insert_one(document)
```

### Step 3: Analytics Aggregation

```
Frontend: GET /api/billing/analytics
  ↓
main.py: get_billing_analytics() (line 4248)
  ↓
Run analytics_insurance_pipeline:
  - Match where insuranceCompany != null
  - Match where insuranceApprovedAmount > 0
  - Extract approval date or use creation date
  - Return 8 fields per record
  ↓
Python code groups results:
  totalApprovedInsurance = sum(all amounts)
  By company: {company_name: {total, records}}
  ↓
Return JSON to frontend
```

### Step 4: Frontend Display

```
BillingAnalyticsView.tsx:
  - Displays "Approved Insurance Receivable" KPI card
  - Lists insurance companies with totals & counts
  - Allows company selection for patient-wise detail
  - Shows in Insurance section of Analytics page
```

---

## 6. Key Data Relationships

### Patient-Bill Insurance Link

```
patients.billing.insurance.provider = "Star Health"
    ↓
    └─→ Describes what coverage the patient HAS

final_surgery_bills where insuranceCompany = "Star Health Insurance"
    ↓
    └─→ Describes what that insurer APPROVED for specific surgeries
```

**Example:**
- Patient has Star Health policy with ₹5000 annual deductible
- Surgery bill: Star Health approved ₹25000 for this cataract surgery
- These are independent; approval depends on claim submission and insurer review

### Insurance Workflow (Claim to Approval)

```
1. Surgery Performed
   └─ Surgery bill created with insuranceCompany = null initially

2. Claim Submitted to Insurer
   └─ Insurer reviews diagnosis, procedure, policy coverage

3. Insurer Approves/Denies
   └─ If approved:
      └─ Update insuranceApprovedAmount = ₹25000
      └─ Set insuranceApprovalDate = approval date
      └─ Set insuranceClaimReference = claim ID

4. Analytics Picks It Up
   └─ Insurance pipeline filters bills where insuranceApprovedAmount > 0
   └─ Groups by company for dashboard display

5. Patient Responsibility Calculated
   └─ Total bill - Insurance approved = Patient share
   └─ (Insurance paid portion reduces balancePayable from patient's perspective)
```

---

## 7. Multi-Stage Billing Cases (Advanced)

### Models: [backend/models.py lines 250-280](backend/models.py#L250-L280)

For complex billing scenarios (pre-approval, staged payments), use `BillingCase`:

```python
class BillingStage(BaseModel):
    name: str  # 'insurance_approval', 'pre_surgery', 'final_settlement'
    status: str  # 'pending', 'approved', 'paid', 'cancelled'
    amount: float
    date: datetime
    updatedBy: str

class BillingCase(BaseModel):
    caseId: str
    registrationId: str
    procedureName: str
    totalEstimatedAmount: float
    insuranceApprovedAmount: float
    preSurgeryPaidAmount: float
    stages: List[BillingStage]
    insuranceProvider: str
    policyNumber: str
    status: str  # 'open', 'completed', 'closed'
```

**Not currently used in main dashboard but available for:**
- Tracking multi-stage approvals (pre-auth → approval → payment)
- Complex insurance cases requiring multiple submissions
- Audit trail of approval progression

---

## 8. Current Insurance Metrics (Live Data as of Today)

### Dashboard Totals
- **Total Approved Insurance**: ₹2,38,656
- **Insurance Records**: 15 approved surgery procedures

### By Company
| Company | Approved Amount | Patients | Avg per Patient |
|---------|-----------------|----------|-----------------|
| Star Health Insurance | ₹2,08,635 | 12 | ₹17,386 |
| ICICI Lombard | ₹29,998 | 2 | ₹14,999 |
| State Health Scheme | ₹23 | 1 | ₹23 |

### Top Surgeries by Insurance
1. Cataract Surgery with IOL - ₹25,000 avg approved
2. LASIK Surgery - ₹18,000 avg approved
3. Intravitreal Injection - ₹8,500 avg approved

---

## 9. Gap Analysis & Future Enhancements

### Current Gaps
1. **Claim Status Tracking**
   - No status progression: submitted → approved → rejected → paid
   - Only approval date visible, no submission date

2. **Partial Approvals**
   - No tracking of claims partially approved (e.g., approved for 80% of bill)
   - All-or-nothing booleans (approved = yes/no)

3. **Insurance Write-offs**
   - No tracking of insurer-denied portions
   - No adjustment entries for insurance denials

4. **Policy Reminders**
   - No alerts when policy expires
   - No deductible exhaustion notifications
   - No out-of-pocket max warnings

### Recommended Enhancements

1. **Add Claim Status Field**
```json
"claimStatus": "submitted | approved | denied | partial | under_review",
"claimSubmissionDate": "2025-03-05",
"claimDenialReason": "Pre-existing condition"
```

2. **Track Partial Approvals**
```json
"insuranceApprovedPercentage": 80,
"insuranceApprovedNote": "80% approved; 20% patient responsibility"
```

3. **Insurance Write-offs Collection**
```json
{
  "billId": "BILL-2025-001",
  "insuranceCompany": "Star Health",
  "originalApprovedAmount": 25000,
  "finalApprovedAmount": 22500,
  "writeoffAmount": 2500,
  "writeoffReason": "Coverage limit exceeded"
}
```

4. **Policy Verification Scheduler**
```python
# Periodically check expiring policies
tasks: [
  {insuranceVerificationDue: true, expirationDate < today + 30days}
]
```

---

## 10. Testing & Verification

### Verify Patient Insurance Endpoint
```bash
curl -X GET "http://localhost:8000/api/billing/patient/REG-2025-123456/insurance"
Response: {
  "provider": "Star Health Insurance",
  "policyNumber": "SH123456789",
  ...
}
```

### Verify Insurance Analytics
```bash
curl -X GET "http://localhost:8000/api/billing/analytics?period=monthly"
Response: {
  "insuranceApprovedRecords": [...],
  "totalApprovedInsurance": 238656,
  "daily|monthly|yearly": {...}
}
```

### Check Database Records
```javascript
// Patient-level insurance
db.patients.findOne(
  {registrationId: "REG-2025-123456"},
  {_id:0, "billing.insurance":1}
)

// Bill-level insurance
db.final_surgery_bills.find(
  {insuranceApprovedAmount: {$gt: 0}},
  {insuranceCompany: 1, insuranceApprovedAmount: 1, insuranceApprovalDate: 1}
)
```

---

## Summary

The insurance system works at two independent tiers:

1. **Patient Policy** - What insurance the patient carries (annual limits, deductibles, coverage types) - stored in `patients.billing.insurance`

2. **Bill Approval** - What specific insurers approved for specific procedures - stored on `final_surgery_bills` as insurable fields

Both feed the analytics dashboard which shows company-wide and patient-wise approved receivables, but they serve different purposes and live in separate data models.
