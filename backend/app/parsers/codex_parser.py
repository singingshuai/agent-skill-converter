# -*- coding: utf-8 -*-
import re
from pathlib import Path
from typing import List, Optional
from ..core.spec import AgentSkillSpec, ResourceItem, Triggers, WorkflowStep, Outputs


def parse_codex_skill(skill_dir: Path) -> AgentSkillSpec:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        raise FileNotFoundError(f"SKILL.md not found in {skill_dir}")

    content = skill_md.read_text(encoding="utf-8")
    lines = content.split("\n")

    name = _extract_name(skill_dir, lines)
    description = _extract_description(lines)
    triggers = _extract_triggers(lines)
    workflow = _extract_workflow(lines)
    constraints = _extract_constraints(lines)
    resources = _extract_resources(skill_dir, lines)
    examples = _extract_examples(lines)

    return AgentSkillSpec(
        name=name,
        description=description,
        version="1.0.0",
        source_platform="codex",
        triggers=triggers,
        inputs=[],
        workflow=workflow,
        constraints=constraints,
        outputs=Outputs(format="markdown", must_include=[]),
        resources=resources,
        examples=examples,
        metadata={"raw_content": content},
    )


def _extract_name(skill_dir: Path, lines: List[str]) -> str:
    for line in lines:
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return skill_dir.name


def _extract_description(lines: List[str]) -> str:
    desc_lines: List[str] = []
    in_header = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# ") and not in_header:
            in_header = True
            continue
        if in_header:
            if stripped.startswith("#"):
                break
            if stripped:
                desc_lines.append(stripped)
    return " ".join(desc_lines) if desc_lines else ""


def _extract_triggers(lines: List[str]) -> Triggers:
    keywords: List[str] = []
    intent = ""
    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("use when") or stripped.lower().startswith("use this when"):
            intent = stripped
            break
        if "use when" in stripped.lower():
            intent = stripped
            break
    return Triggers(keywords=keywords, intent=intent)


def _extract_workflow(lines: List[str]) -> List[WorkflowStep]:
    steps: List[WorkflowStep] = []
    step_num = 0
    in_list = False
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\d+\.\s+", stripped):
            in_list = True
            step_num += 1
            steps.append(WorkflowStep(step=step_num, description=stripped))
        elif stripped.startswith("- ") and in_list:
            step_num += 1
            steps.append(WorkflowStep(step=step_num, description=stripped[2:]))
        elif stripped.startswith("* ") and in_list:
            step_num += 1
            steps.append(WorkflowStep(step=step_num, description=stripped[2:]))
        elif in_list and not stripped:
            in_list = False
    return steps


def _extract_constraints(lines: List[str]) -> List[str]:
    constraints: List[str] = []
    in_constraints = False
    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("## constraints"):
            in_constraints = True
            continue
        if in_constraints and stripped.startswith("#"):
            in_constraints = False
            continue
        if in_constraints and stripped.startswith("- "):
            constraints.append(stripped[2:])
    return constraints


def _extract_resources(skill_dir: Path, lines: List[str]) -> List[ResourceItem]:
    resources: List[ResourceItem] = []
    in_resources = False
    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("## resources"):
            in_resources = True
            continue
        if in_resources and stripped.startswith("#"):
            in_resources = False
            continue
        if in_resources and stripped.startswith("- "):
            parts = stripped[2:].split(":", 1)
            path = parts[0].strip()
            desc = parts[1].strip() if len(parts) > 1 else ""
            resources.append(ResourceItem(path=path, description=desc))
    return resources


def _extract_examples(lines: List[str]) -> List[str]:
    examples: List[str] = []
    in_examples = False
    current: List[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("## examples"):
            in_examples = True
            continue
        if in_examples and stripped.startswith("#"):
            in_examples = False
            if current:
                examples.append("\n".join(current))
                current = []
            continue
        if in_examples and stripped.startswith("- "):
            if current:
                examples.append("\n".join(current))
                current = []
            current.append(stripped[2:])
        elif in_examples and stripped:
            current.append(stripped)
    if current:
        examples.append("\n".join(current))
    return examples
