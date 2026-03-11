from __future__ import annotations

import sys
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import (  # noqa: E402
    patient_collection as patients_collection,
    patient_documents_collection,
)


def migrate_patient_documents() -> dict[str, int]:
    query = {"documents": {"$exists": True, "$ne": []}}
    stats = {
        "patients_scanned": patients_collection.count_documents(query),
        "documents_migrated": 0,
        "duplicates_skipped": 0,
        "errors": 0,
    }

    patients = patients_collection.find(
        query,
        {
            "registrationId": 1,
            "documents": 1,
        },
    )

    for patient in patients:
        registration_id = patient.get("registrationId")
        documents = patient.get("documents") or []

        if not registration_id:
            stats["errors"] += 1
            print("[WARN] Skipping patient without registrationId")
            continue

        for document in documents:
            try:
                file_id = document.get("id")
                if not file_id:
                    stats["errors"] += 1
                    print(f"[WARN] Skipping document without id for patient {registration_id}")
                    continue

                if patient_documents_collection.find_one({"fileId": file_id}, {"_id": 1}):
                    stats["duplicates_skipped"] += 1
                    continue

                migrated_document = {
                    "fileId": file_id,
                    "registrationId": registration_id,
                    "name": document.get("name"),
                    "storedName": document.get("stored_name"),
                    "size": document.get("size"),
                    "type": document.get("type"),
                    "uploadedDate": document.get("uploadedDate"),
                    "uploadedBy": document.get("uploadedBy"),
                }

                patient_documents_collection.insert_one(migrated_document)
                stats["documents_migrated"] += 1
            except Exception as exc:
                stats["errors"] += 1
                print(f"[ERROR] Document migration failed for patient {registration_id}: {exc}")

    return stats


if __name__ == "__main__":
    migration_stats = migrate_patient_documents()
    print("=== Patient Document Migration Complete ===")
    print(f"Patients scanned: {migration_stats['patients_scanned']}")
    print(f"Documents migrated: {migration_stats['documents_migrated']}")
    print(f"Duplicates skipped: {migration_stats['duplicates_skipped']}")
    print(f"Errors: {migration_stats['errors']}")