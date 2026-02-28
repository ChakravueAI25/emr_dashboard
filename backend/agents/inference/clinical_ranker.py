"""
Deterministic Clinical Priority Ranker
Highest-risk finding MUST always rank first.

Objective clinical findings always outrank subjective complaints so that
the 3-point summary shows actionable data a doctor can scan quickly.
"""

import re

PRIORITY_RULES = [

    # EMERGENCY SIGNS
    ("rapd", 100),
    ("disc edema", 98),
    ("papilledema", 98),
    ("retinal detachment", 97),
    ("vitreous hemorrhage", 96),

    # STRUCTURAL DAMAGE
    ("disc pallor", 94),
    ("neovascularization", 92),
    ("macular edema", 90),
    ("hemorrhage", 88),
    ("exudate", 86),

    # FUNCTION LOSS  (VA values)
    ("reduced vision", 85),
    ("cf", 85),
    ("hm", 85),
    ("pl", 85),
    ("npl", 85),

    # PRESSURE / GLAUCOMA
    ("cupping", 82),
    ("cdr", 82),
    ("iop", 80),

    # ANTERIOR SEGMENT (objective findings)
    ("shallow ac", 78),
    ("shallow anterior", 78),
    ("narrow angle", 76),
    ("corneal edema", 70),
    ("hyphema", 70),
    ("lens opacity", 65),
    ("cataract", 60),

    # SYMPTOMS (below objective findings)
    ("vision loss", 50),
    ("blurred vision", 45),
    ("flashes", 40),
    ("floaters", 40),
    ("pain", 38),
]

# Signals starting with "Complaint:" are subjective and get a penalty so that
# objective clinical findings rank above them.
_COMPLAINT_PENALTY = 35


def _score_signal(text: str) -> int:
    t = text.lower()
    score = 0

    for keyword, priority in PRIORITY_RULES:
        if keyword in t:
            score = max(score, priority)

    # Penalise subjective complaints so objective findings surface first
    if re.match(r"^complaint\b", t):
        score = max(score - _COMPLAINT_PENALTY, 1)

    return score


def rank_clinical_signals(signals: list[str]) -> list[str]:
    scored = [(s, _score_signal(s)) for s in signals]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [s for s, _ in scored]
