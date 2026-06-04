import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.parsers.codex_parser import parse_codex_skill


FIXTURES_DIR = Path(__file__).parent.parent.parent / "examples"


def test_parse_simple_skill():
    skill_dir = FIXTURES_DIR / "simple-skill"
    spec = parse_codex_skill(skill_dir)
    assert spec.name == "Simple Skill"
    assert spec.description == "A basic skill for testing conversion."
    assert spec.source_platform == "codex"
    assert len(spec.workflow) == 3
    assert len(spec.constraints) == 2
    assert len(spec.examples) == 2


def test_parse_skill_with_resources():
    skill_dir = FIXTURES_DIR / "skill-with-resources"
    spec = parse_codex_skill(skill_dir)
    assert spec.name == "Resource Skill"
    assert len(spec.resources) == 2
    assert spec.resources[0].path == "templates/config.yaml"


def test_parse_skill_with_scripts():
    skill_dir = FIXTURES_DIR / "skill-with-scripts"
    spec = parse_codex_skill(skill_dir)
    assert spec.name == "Script Skill"
    assert len(spec.resources) == 2


def test_parse_skill_with_constraints():
    skill_dir = FIXTURES_DIR / "skill-with-constraints"
    spec = parse_codex_skill(skill_dir)
    assert spec.name == "Constraint Skill"
    assert len(spec.constraints) == 5


def test_parse_skill_with_triggers():
    skill_dir = FIXTURES_DIR / "skill-with-triggers"
    spec = parse_codex_skill(skill_dir)
    assert spec.name == "Trigger Skill"
    assert "database optimization" in spec.triggers.intent.lower()


def test_parse_missing_skill_md():
    with pytest.raises(FileNotFoundError):
        parse_codex_skill(Path("/nonexistent/path"))
