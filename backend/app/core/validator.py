from typing import List
from .spec import AgentSkillSpec
from .platforms import is_supported


class ValidationError(Exception):
    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def validate_spec(spec: AgentSkillSpec) -> None:
    errors: List[str] = []

    if not spec.name:
        errors.append("name is required")
    if not spec.description:
        errors.append("description is required")
    if not spec.triggers.keywords and not spec.triggers.intent:
        errors.append("triggers must contain at least one keyword or intent")
    if not spec.workflow:
        errors.append("workflow must contain at least one step")
    if not spec.constraints:
        errors.append("constraints must not be empty")

    if not is_supported(spec.source_platform):
        errors.append(f"unsupported source platform: {spec.source_platform}")
    if spec.target_platform and not is_supported(spec.target_platform):
        errors.append(f"unsupported target platform: {spec.target_platform}")

    if errors:
        raise ValidationError(errors)
