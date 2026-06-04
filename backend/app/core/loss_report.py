from typing import Dict, List


def build_loss_report(preserved: List[str], partial: List[str], lost: List[str], manual_check: List[str]) -> Dict[str, List[str]]:
    return {
        "preserved": preserved,
        "partial": partial,
        "lost": lost,
        "manual_check": manual_check,
    }
