import re

def fix_indian_plate(text: str) -> str:
    """
    Normalizes Indian license plate characters based on standard format.
    Standard patterns:
    - 10 chars: AA 00 AA 0000 (e.g. DL01AB1234, MP04BC5678)
    - 9 chars:  AA 0 AA 0000 (e.g. DL1A1234)
    """
    text = re.sub(r"[^A-Z0-9]", "", text.upper())
    length = len(text)
    if length not in (9, 10):
        return text

    char_to_num = {
        "O": "0", "Q": "0", "I": "1", "L": "1", "Z": "2",
        "S": "5", "B": "8", "G": "6", "A": "4",
    }
    num_to_char = {
        "0": "O", "1": "I", "2": "Z", "5": "S", "8": "B",
        "4": "A", "6": "G",
    }

    pattern = (
        ["char", "char", "num", "num", "char", "char", "num", "num", "num", "num"]
        if length == 10
        else ["char", "char", "num", "char", "char", "num", "num", "num", "num"]
    )

    return "".join(
        num_to_char.get(c, c) if p == "char" else char_to_num.get(c, c)
        for c, p in zip(text, pattern)
    )

def normalize_plate(text: str) -> str:
    """Performs clean normalization on recognized plate text."""
    if not text:
        return ""
    cleaned = re.sub(r"[^A-Z0-9]", "", text.upper().strip())
    return fix_indian_plate(cleaned)
