import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core.spec import AgentSkillSpec, Triggers, WorkflowStep, Outputs
from app.core.validator import validate_spec, ValidationError


def test_valid_spec():
    spec = AgentSkillSpec(
        name="Test Skill",
        description="A test skill",
        source_platform="codex",
        triggers=Triggers(keywords=["test"]),
        workflow=[WorkflowStep(step=1, description="Do something")],
        constraints=["Be careful"],
        outputs=Outputs(format="markdown", must_include=[]),
    )
    validate_spec(spec)


def test_missing_name():
    spec = AgentSkillSpec(
        name="",
        description="A test skill",
        source_platform="codex",
        triggers=Triggers(keywords=["test"]),
        workflow=[WorkflowStep(step=1, description="Do something")],
        constraints=["Be careful"],
        outputs=Outputs(format="markdown", must_include=[]),
    )
    with pytest.raises(ValidationError) as exc_info:
        validate_spec(spec)
    assert "name is required" in exc_info.value.errors


def test_missing_description():
    spec = AgentSkillSpec(
        name="Test Skill",
        description="",
        source_platform="codex",
        triggers=Triggers(keywords=["test"]),
        workflow=[WorkflowStep(step=1, description="Do something")],
        constraints=["Be careful"],
        outputs=Outputs(format="markdown", must_include=[]),
    )
    with pytest.raises(ValidationError) as exc_info:
        validate_spec(spec)
    assert "description is required" in exc_info.value.errors


def test_missing_triggers():
    spec = AgentSkillSpec(
        name="Test Skill",
        description="A test skill",
        source_platform="codex",
        triggers=Triggers(keywords=[], intent=""),
        workflow=[WorkflowStep(step=1, description="Do something")],
        constraints=["Be careful"],
        outputs=Outputs(format="markdown", must_include=[]),
    )
    with pytest.raises(ValidationError) as exc_info:
        validate_spec(spec)
    assert "triggers must contain at least one keyword or intent" in exc_info.value.errors


def test_unsupported_source_platform():
    spec = AgentSkillSpec(
        name="Test Skill",
        description="A test skill",
        source_platform="unsupported",
        triggers=Triggers(keywords=["test"]),
        workflow=[WorkflowStep(step=1, description="Do something")],
        constraints=["Be careful"],
        outputs=Outputs(format="markdown", must_include=[]),
    )
    with pytest.raises(ValidationError) as exc_info:
        validate_spec(spec)
    assert "unsupported source platform" in exc_info.value.errors[0]


def test_unsupported_target_platform():
    spec = AgentSkillSpec(
        name="Test Skill",
        description="A test skill",
        source_platform="codex",
        target_platform="unsupported",
        triggers=Triggers(keywords=["test"]),
        workflow=[WorkflowStep(step=1, description="Do something")],
        constraints=["Be careful"],
        outputs=Outputs(format="markdown", must_include=[]),
    )
    with pytest.raises(ValidationError) as exc_info:
        validate_spec(spec)
    assert "unsupported target platform" in exc_info.value.errors[0]
