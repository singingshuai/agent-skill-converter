from typing import Dict, List
from ..core.spec import AgentSkillSpec
from ..core.loss_report import build_loss_report


def generate_markdown(spec: AgentSkillSpec) -> Dict[str, object]:
    preserved: List[str] = ["name", "description", "triggers", "workflow", "constraints", "resources", "examples"]
    partial: List[str] = []
    lost: List[str] = []
    manual_check: List[str] = []

    content = f"""# {spec.name}

{spec.description}

## Metadata

- **Version:** {spec.version}
- **Source Platform:** {spec.source_platform}
- **Target Platform:** {spec.target_platform or "N/A"}

## When to Use

"""
    if spec.triggers.keywords:
        content += f"**Keywords:** {', '.join(spec.triggers.keywords)}\n\n"
    if spec.triggers.intent:
        content += f"**Intent:** {spec.triggers.intent}\n\n"

    content += "## Workflow\n\n"
    if spec.workflow:
        for step in spec.workflow:
            content += f"{step.step}. {step.description}\n"
    else:
        content += "No workflow defined.\n"

    content += "\n## Constraints\n\n"
    if spec.constraints:
        for constraint in spec.constraints:
            content += f"- {constraint}\n"
    else:
        content += "No constraints defined.\n"

    content += "\n## Resources\n\n"
    if spec.resources:
        for resource in spec.resources:
            content += f"- {resource.path}: {resource.description}\n"
    else:
        content += "No external resources.\n"

    content += "\n## Examples\n\n"
    if spec.examples:
        for example in spec.examples:
            content += f"```\n{example}\n```\n\n"
    else:
        content += "No examples provided.\n"

    return {
        "success": True,
        "output_files": [{"filename": f"{spec.name}.md", "content": content}],
        "loss_report": build_loss_report(preserved, partial, lost, manual_check),
    }
