from typing import Dict, List
from ..core.spec import AgentSkillSpec
from ..core.loss_report import build_loss_report


def generate_claude(spec: AgentSkillSpec) -> Dict[str, object]:
    preserved: List[str] = ["name", "description"]
    partial: List[str] = []
    lost: List[str] = []
    manual_check: List[str] = []

    if spec.triggers.intent:
        preserved.append("triggers.intent")
    else:
        partial.append("triggers")

    if spec.workflow:
        preserved.append("workflow")
    else:
        partial.append("workflow")

    if spec.constraints:
        preserved.append("constraints")

    if spec.examples:
        preserved.append("examples")

    if spec.resources:
        manual_check.append("resources")
        manual_check.append("Manual migration required for resource files")

    content = f"""# {spec.name}

{spec.description}

## When to Use

{spec.triggers.intent if spec.triggers.intent else "See description for usage context."}

## Workflow

"""
    if spec.workflow:
        for step in spec.workflow:
            content += f"- {step.description}\n"
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
        manual_check.append("Manual migration required for resource files")
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
