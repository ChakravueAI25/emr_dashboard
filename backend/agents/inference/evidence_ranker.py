# evidence_ranker.py

PRIORITY_TERMS = [
    "family history",
    "vision loss",
    "no glow",
    "hemorrhage",
    "neovascular",
    "pigmentation",
    "cupping",
    "iop",
    "disc",
]

def _score(text: str) -> int:
    t = text.lower()
    return sum(term in t for term in PRIORITY_TERMS)


def rank_evidence(signals: list[str]) -> list[str]:
    """
    Returns signals sorted by clinical importance.
    """
    return sorted(signals, key=_score, reverse=True)
