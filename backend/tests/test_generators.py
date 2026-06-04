import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core.spec import AgentSkillSpec, Triggers, WorkflowStep, Outputs
from app.generators.claude_generator import generate_claude
from app.generators.cursor_generator import generate_cursor
from app.generators.markdown_generator import generate_markdown
from app.parsers.codex_parser import parse_codex_skill


FIXTURES_DIR = Path(__file__).parent.parent.parent / "examples"


def create_test_spec():
    return AgentSkillSpec(
        name="Test Skill",
        description="A test skill",
        source_platform="codex",
        target_platform="claude",
        triggers=Triggers(keywords=["test"], intent="Use when testing"),
        workflow=[WorkflowStep(step=1, description="Do something")],
        constraints=["Be careful"],
        outputs=Outputs(format="markdown", must_include=[]),
        resources=[],
        examples=["Example 1"],
        metadata={},
    )


def test_claude_generator():
    spec = create_test_spec()
    result = generate_claude(spec)
    assert result["success"] is True
    assert len(result["output_files"]) == 1
    assert result["output_files"][0]["filename"] == "Test Skill.md"
    assert "Test Skill" in result["output_files"][0]["content"]
    assert "loss_report" in result


def test_cursor_generator():
    spec = create_test_spec()
    result = generate_cursor(spec)
    assert result["success"] is True
    assert len(result["output_files"]) == 1
    assert result["output_files"][0]["filename"] == "Test Skill.mdc"
    assert "Test Skill" in result["output_files"][0]["content"]
    assert "loss_report" in result


def test_markdown_generator():
    spec = create_test_spec()
    result = generate_markdown(spec)
    assert result["success"] is True
    assert len(result["output_files"]) == 1
    assert result["output_files"][0]["filename"] == "Test Skill.md"
    assert "Test Skill" in result["output_files"][0]["content"]
    assert "loss_report" in result


def test_generate_from_fixture():
    skill_dir = FIXTURES_DIR / "simple-skill"
    spec = parse_codex_skill(skill_dir)
    spec.target_platform = "claude"
    result = generate_claude(spec)
    assert result["success"] is True
    assert "Simple Skill" in result["output_files"][0]["content"]


def test_loss_report_contents():
    spec = create_test_spec()
    result = generate_claude(spec)
    report = result["loss_report"]
    assert "preserved" in report
    assert "partial" in report
    assert "lost" in report
    assert "manual_check" in report
    assert len(report["preserved"]) > 0
