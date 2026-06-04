import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core.loss_report import build_loss_report


def test_build_loss_report():
    preserved = ["name", "description"]
    partial = ["workflow"]
    lost = ["resources"]
    manual_check = ["Manual migration required"]

    report = build_loss_report(preserved, partial, lost, manual_check)

    assert report["preserved"] == preserved
    assert report["partial"] == partial
    assert report["lost"] == lost
    assert report["manual_check"] == manual_check


def test_empty_report():
    report = build_loss_report([], [], [], [])

    assert report["preserved"] == []
    assert report["partial"] == []
    assert report["lost"] == []
    assert report["manual_check"] == []
