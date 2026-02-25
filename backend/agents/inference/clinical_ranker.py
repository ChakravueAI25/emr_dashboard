"""
Deterministic Clinical Priority Ranker
Highest-risk finding MUST always rank first.
"""

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

    # FUNCTION LOSS
    ("cf", 85),
    ("hm", 85),
    ("pl", 85),
    ("npl", 85),

    # PRESSURE / GLAUCOMA
    ("iop", 80),
    ("cupping", 82),
    ("cdr", 82),

    # ANTERIOR SEGMENT
    ("corneal edema", 70),
    ("hyphema", 70),
    ("cataract", 60),

    # SYMPTOMS
    ("vision loss", 50),
    ("blurred vision", 45),
    ("flashes", 40),
    ("floaters", 40),
    ("pain", 38),
]


def _score_signal(text: str) -> int:
    t = text.lower()
    score = 0

    for keyword, priority in PRIORITY_RULES:
        if keyword in t:
            score = max(score, priority)

    return score


def rank_clinical_signals(signals: list[str]) -> list[str]:
    scored = [(s, _score_signal(s)) for s in signals]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [s for s, _ in scored]
