from typing import Dict, List
from ..core.spec import AgentSkillSpec
from ..core.loss_report import build_loss_report


def generate_markdown(spec: AgentSkillSpec) -> Dict[str, object]:
    preserved: List[str] = ["name", "description", "triggers", "workflow", "constraints", "resources", "examples", "all_sections"]
    partial: List[str] = []
    lost: List[str] = []
    manual_check: List[str] = []

    content = f"# {spec.name}\n\n{spec.description}\n\n"

    content += "## Metadata\n\n"
    content += f"- **Version:** {spec.version}\n"
    content += f"- **Source Platform:** {spec.source_platform}\n"
    content += f"- **Target Platform:** {spec.target_platform or 'N/A'}\n\n"

    for section in spec.sections:
        if section.level == 1:
            continue
        prefix = "#" * section.level
        content += f"{prefix} {section.title}\n\n"
        if section.content:
            content += section.content + "\n\n"

    return {
        "success": True,
        "output_files": [{"filename": f"{spec.name}.md", "content": content}],
        "loss_report": build_loss_report(preserved, partial, lost, manual_check),
    }
