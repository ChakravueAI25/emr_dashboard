# clinical_inference.py

from .disease_mapper import DISEASE_MAP
from .evidence_ranker import rank_evidence


def infer_condition(signals: list[str]) -> dict | None:
    """
    Determines most likely condition from signals.
    """

    disease_scores = {}

    for disease, clues in DISEASE_MAP.items():

        score = 0

        for s in signals:
            s_low = s.lower()

            if any(clue in s_low for clue in clues):
                score += 1

        if score:
            disease_scores[disease] = score

    if not disease_scores:
        return None

    best_disease = max(disease_scores, key=disease_scores.get)

    ranked = rank_evidence(signals)

    confidence = (
        "strong" if disease_scores[best_disease] >= 3
        else "moderate" if disease_scores[best_disease] == 2
        else "weak"
    )

    return {
        "condition": best_disease,
        "evidence": ranked[:3],
        "confidence": confidence
    }
