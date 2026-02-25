"""
Clinical Output Safety Validator
Blocks unsafe AI outputs.
"""

CRITICAL_SIGNS = {
    "rapd": ["rapd", "relative afferent pupillary defect"],
    "disc edema": ["disc edema", "swelling"],
    "papilledema": ["papilledema"],
    "cf": ["cf", "counting fingers"],
    "hm": ["hm", "hand motion", "hand movements"],
    "pl": ["pl", "perception of light"],
    "npl": ["npl", "no perception of light"]
}

CONTRADICTIONS = [
    ("normal", "edema"),
    ("clear", "opacity"),
    ("no rapd", "rapd"),
]

def _contains(text, word):
    return word in text.lower()


def hallucination_check(output: str, signals: list[str]) -> bool:
    """
    Reject if output mentions finding not present in signals.
    """
    signal_text = " ".join(signals).lower()

    for word in output.lower().split():
        # Strip punctuation from word for cleaner matching
        clean_word = word.strip(".,;:()[]{}")
        if not clean_word:
            continue
            
        if clean_word not in signal_text and clean_word in [
            "edema", "uveitis", "hemorrhage", "detachment", "opacity"
        ]:
            return False
    return True


def contradiction_check(output: str) -> bool:
    t = output.lower()
    for a, b in CONTRADICTIONS:
        if a in t and b in t:
            return False
    return True


def redflag_check(output: str, signals: list[str]) -> bool:
    import re  # Import locally to avoid top-of-file edit conflicts
    
    t = output.lower()
    input_text = " ".join(signals).lower()

    for flag_group, synonyms in CRITICAL_SIGNS.items():
        # Check if the critical sign is actually present in the input signals for this specific patient
        # We check if ANY synonym is in the input using strict word boundaries
        # This prevents "pl" matching "complaints"
        is_in_input = False
        for syn in synonyms:
            if re.search(r'\b' + re.escape(syn) + r'\b', input_text):
                is_in_input = True
                break
        
        if is_in_input:
             # If present in signals, it MUST be in output (checking ALL synonyms)
             # At least one synonym must be present in the output
            is_in_output = False
            for syn in synonyms:
                if re.search(r'\b' + re.escape(syn) + r'\b', t):
                    is_in_output = True
                    break
            
            if not is_in_output:
                print(f"[VALIDATION FAIL] Missing critical finding '{flag_group}'. Expected one of {synonyms}")
                return False
    return True


def validate_summary(summary: str, signals: list[str]) -> str:
    """
    Main validation gate.
    """

    if not hallucination_check(summary, signals):
        raise ValueError("Hallucination detected in summary")

    if not contradiction_check(summary):
        raise ValueError("Contradiction detected in summary")

    if not redflag_check(summary, signals):
        raise ValueError("Critical finding missing in summary")

    return summary
