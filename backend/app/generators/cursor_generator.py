from typing import Dict, List
from ..core.spec import AgentSkillSpec
from ..core.loss_report import build_loss_report


def generate_cursor(spec: AgentSkillSpec) -> Dict[str, object]:
    preserved: List[str] = ["name", "description"]
    partial: List[str] = []
    lost: List[str] = []
    manual_check: List[str] = []

    if spec.triggers.intent:
        preserved.append("triggers.intent")
    else:
        partial.append("triggers")

    if spec.workflow:
        partial.append("workflow")

    if spec.constraints:
        preserved.append("constraints")

    if spec.examples:
        preserved.append("examples")

    if spec.resources:
        lost.append("resources")

    content = f"""---
description: {spec.description}
globs: **
alwaysApply: false
---

# {spec.name}

## When to Use

{spec.triggers.intent if spec.triggers.intent else "See description for usage context."}

## Constraints

"""
    if spec.constraints:
        for constraint in spec.constraints:
            content += f"- {constraint}\n"
    else:
        content += "No constraints defined.\n"

    content += "\n## Output Requirements\n\n"
    if spec.outputs.must_include:
        for item in spec.outputs.must_include:
            content += f"- {item}\n"
    else:
        content += "Standard output.\n"

    content += "\n## Examples\n\n"
    if spec.examples:
        for example in spec.examples:
            content += f"```\n{example}\n```\n\n"
    else:
        content += "No examples provided.\n"

    return {
        "success": True,
        "output_files": [{"filename": f"{spec.name}.mdc", "content": content}],
        "loss_report": build_loss_report(preserved, partial, lost, manual_check),
    }
