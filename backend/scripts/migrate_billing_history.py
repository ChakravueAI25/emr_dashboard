from __future__ import annotations

import sys
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import (  # noqa: E402
    billing_invoices_collection,
    final_surgery_bills_collection,
    initial_surgery_bills_collection,
    patient_collection,
)


def _safe_billing(patient: dict[str, Any]) -> dict[str, Any]:
    billing = patient.get("billing")
    return billing if isinstance(billing, dict) else {}


def _coerce_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def migrate_billing_history() -> dict[str, int]:
    stats = {
        "patients_scanned": 0,
        "invoices_migrated": 0,
        "initial_surgery_bills_migrated": 0,
        "final_surgery_bills_migrated": 0,
        "surgery_bills_migrated": 0,
        "duplicates_skipped": 0,
        "errors": 0,
    }

    patients = patient_collection.find(
        {},
        {
            "registrationId": 1,
            "name": 1,
            "billing.invoices": 1,
            "billing.surgeryBills": 1,
        },
    )

    for patient in patients:
        stats["patients_scanned"] += 1
        registration_id = patient.get("registrationId", "")
        patient_name = patient.get("name", "")
        billing = _safe_billing(patient)

        for invoice in billing.get("invoices", []) or []:
            try:
                invoice_id = invoice.get("id") or invoice.get("invoiceId")
                if not invoice_id:
                    stats["errors"] += 1
                    print(f"[WARN] Skipping invoice without id for patient {registration_id}")
                    continue

                if billing_invoices_collection.find_one({"invoiceId": invoice_id}, {"_id": 1}):
                    stats["duplicates_skipped"] += 1
                    continue

                invoice_doc = {
                    "invoiceId": invoice_id,
                    "id": invoice_id,
                    "registrationId": registration_id,
                    "patientName": invoice.get("patientName") or patient_name,
                    "patientResponsibility": _coerce_float(invoice.get("patientResponsibility")),
                    "status": invoice.get("status", "pending"),
                    "items": invoice.get("items") or invoice.get("serviceItems") or [],
                    "createdAt": invoice.get("createdAt") or invoice.get("date", ""),
                    "updatedAt": invoice.get("updatedAt") or invoice.get("createdAt") or invoice.get("date", ""),
                    "insuranceAmount": _coerce_float(invoice.get("insuranceAmount", invoice.get("insuranceCovered"))),
                    "patientAmount": _coerce_float(invoice.get("patientAmount", invoice.get("patientResponsibility"))),
                    "notes": invoice.get("notes", ""),
                    "date": invoice.get("date", ""),
                    "service": invoice.get("service", ""),
                    "paymentMethod": invoice.get("paymentMethod", ""),
                    "insuranceStatus": invoice.get("insuranceStatus", "none"),
                    "patientPaidAmount": _coerce_float(invoice.get("patientPaidAmount")),
                    "appointmentId": invoice.get("appointmentId", ""),
                    "doctorName": invoice.get("doctorName", ""),
                    "couponCode": invoice.get("couponCode", ""),
                    "appliedBy": invoice.get("appliedBy", ""),
                    "discountAmount": _coerce_float(invoice.get("discountAmount")),
                    "linkedCaseId": invoice.get("linkedCaseId", ""),
                    "isSurgeryCase": bool(invoice.get("isSurgeryCase", False)),
                    "expectedFromInsurance": _coerce_float(invoice.get("expectedFromInsurance")),
                    "upfrontPaid": _coerce_float(invoice.get("upfrontPaid")),
                }

                billing_invoices_collection.insert_one(invoice_doc)
                stats["invoices_migrated"] += 1
            except Exception as exc:
                stats["errors"] += 1
                print(f"[ERROR] Invoice migration failed for patient {registration_id}: {exc}")

        for bill in billing.get("surgeryBills", []) or []:
            try:
                bill_id = bill.get("billId")
                bill_type = (bill.get("billType") or "").strip().lower()
                if not bill_id or bill_type not in {"initial", "final"}:
                    stats["errors"] += 1
                    print(f"[WARN] Skipping surgery bill with invalid type/id for patient {registration_id}: {bill}")
                    continue

                target_collection = initial_surgery_bills_collection if bill_type == "initial" else final_surgery_bills_collection
                if target_collection.find_one({"billId": bill_id}, {"_id": 1}):
                    stats["duplicates_skipped"] += 1
                    continue

                surgery_doc = {
                    "billId": bill_id,
                    "billType": bill_type,
                    "registrationId": bill.get("registrationId") or registration_id,
                    "patientName": bill.get("patientName") or patient_name,
                    "surgeryName": bill.get("surgeryName", ""),
                    "status": bill.get("status", "pending"),
                    "patientTotalShare": _coerce_float(bill.get("patientTotalShare")),
                    "balancePayable": _coerce_float(bill.get("balancePayable")),
                    "refundAmount": _coerce_float(bill.get("refundAmount")),
                    "insuranceApprovedAmount": _coerce_float(bill.get("insuranceApprovedAmount")),
                    "createdAt": bill.get("createdAt", ""),
                    "updatedAt": bill.get("updatedAt") or bill.get("createdAt", ""),
                    "linkedInitialBillId": bill.get("linkedInitialBillId", ""),
                    "insuranceClaimReference": bill.get("insuranceClaimReference", ""),
                    "insuranceApprovalDate": bill.get("insuranceApprovalDate", ""),
                    "hasInsurance": bill.get("hasInsurance", False),
                    "insuranceType": bill.get("insuranceType", ""),
                    "insuranceCompany": bill.get("insuranceCompany", ""),
                    "insuranceTPA": bill.get("insuranceTPA", ""),
                    "totalSurgeryCost": _coerce_float(bill.get("totalSurgeryCost")),
                    "estimatedInsuranceCoverage": _coerce_float(bill.get("estimatedInsuranceCoverage")),
                    "estimatedPatientShare": _coerce_float(bill.get("estimatedPatientShare")),
                    "securityDeposit": _coerce_float(bill.get("securityDeposit")),
                    "securityDepositPaid": bill.get("securityDepositPaid", False),
                    "securityDepositPaymentMethod": bill.get("securityDepositPaymentMethod", ""),
                    "securityDepositDate": bill.get("securityDepositDate", ""),
                    "finalPaymentAmount": _coerce_float(bill.get("finalPaymentAmount")),
                    "finalPaymentMethod": bill.get("finalPaymentMethod", ""),
                    "finalPaymentDate": bill.get("finalPaymentDate", ""),
                    "notes": bill.get("notes", ""),
                    "createdBy": bill.get("createdBy", ""),
                    "surgeryBreakdown": bill.get("surgeryBreakdown", []),
                }

                target_collection.insert_one(surgery_doc)
                stats["surgery_bills_migrated"] += 1
                if bill_type == "initial":
                    stats["initial_surgery_bills_migrated"] += 1
                else:
                    stats["final_surgery_bills_migrated"] += 1
            except Exception as exc:
                stats["errors"] += 1
                print(f"[ERROR] Surgery bill migration failed for patient {registration_id}: {exc}")

    return stats


if __name__ == "__main__":
    migration_stats = migrate_billing_history()
    print("=== Billing History Migration Complete ===")
    print(f"Patients scanned: {migration_stats['patients_scanned']}")
    print(f"Total invoices migrated: {migration_stats['invoices_migrated']}")
    print(f"Total surgery bills migrated: {migration_stats['surgery_bills_migrated']}")
    print(f"  Initial surgery bills migrated: {migration_stats['initial_surgery_bills_migrated']}")
    print(f"  Final surgery bills migrated: {migration_stats['final_surgery_bills_migrated']}")
    print(f"Duplicates skipped: {migration_stats['duplicates_skipped']}")
    print(f"Errors: {migration_stats['errors']}")