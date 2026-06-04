# -*- coding: utf-8 -*-
import re
from pathlib import Path
from typing import List
from ..core.spec import AgentSkillSpec, ResourceItem, Triggers, WorkflowStep, Outputs, Section


def parse_codex_skill(skill_dir: Path) -> AgentSkillSpec:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        raise FileNotFoundError(f"SKILL.md not found in {skill_dir}")

    content = skill_md.read_text(encoding="utf-8-sig")
    lines = content.split("\n")

    name = _extract_name(skill_dir, lines)
    description = _extract_description(lines)
    triggers = _extract_triggers(lines, content)
    workflow = _extract_workflow(lines)
    constraints = _extract_constraints(lines)
    resources = _extract_resources(skill_dir, lines)
    examples = _extract_examples(lines)
    sections = _extract_all_sections(lines)

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
        sections=sections,
        metadata={"raw_content": content},
    )


def _extract_all_sections(lines: List[str]) -> List[Section]:
    sections: List[Section] = []
    current_title = ""
    current_level = 0
    current_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        header_match = re.match(r'^(#{1,6})\s+(.+)$', stripped)
        if header_match:
            if current_title:
                sections.append(Section(
                    title=current_title,
                    level=current_level,
                    content="\n".join(current_lines).strip()
                ))
            current_level = len(header_match.group(1))
            current_title = header_match.group(2)
            current_lines = []
        else:
            current_lines.append(line)

    if current_title:
        sections.append(Section(
            title=current_title,
            level=current_level,
            content="\n".join(current_lines).strip()
        ))

    return sections


def _extract_name(skill_dir: Path, lines: List[str]) -> str:
    in_frontmatter = False
    for line in lines:
        stripped = line.strip()
        if stripped == "---":
            if not in_frontmatter:
                in_frontmatter = True
                continue
            else:
                break
        if in_frontmatter and stripped.startswith("name:"):
            return stripped[5:].strip()
    for line in lines:
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return skill_dir.name


def _extract_description(lines: List[str]) -> str:
    in_frontmatter = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "---":
            if not in_frontmatter:
                in_frontmatter = True
                continue
            else:
                break
        if in_frontmatter and stripped.startswith("description:"):
            desc = stripped[12:].strip()
            if desc:
                return desc
            for j in range(i + 1, len(lines)):
                next_line = lines[j].strip()
                if next_line.startswith("---") or next_line.startswith("#"):
                    break
                if next_line:
                    return next_line
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


def _extract_triggers(lines: List[str], content: str) -> Triggers:
    keywords: List[str] = []
    intent = ""
    in_trigger_section = False
    trigger_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("## when to use") or stripped.lower().startswith("## trigger"):
            in_trigger_section = True
            continue
        if in_trigger_section and stripped.startswith("#"):
            in_trigger_section = False
            continue
        if in_trigger_section and stripped:
            trigger_lines.append(stripped)

    if trigger_lines:
        intent = " ".join(trigger_lines)
    else:
        use_when_match = re.search(r'[Uu]se when[^.]*\.', content)
        if use_when_match:
            intent = use_when_match.group(0)
        else:
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("description:"):
                    intent = stripped[12:].strip()
                    break

    return Triggers(keywords=keywords, intent=intent)


def _extract_workflow(lines: List[str]) -> List[WorkflowStep]:
    steps: List[WorkflowStep] = []
    step_num = 0
    in_workflow = False

    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("## workflow") or stripped.lower().startswith("## required prelude"):
            in_workflow = True
            continue
        if in_workflow and re.match(r'^#{1,2}\s', stripped):
            in_workflow = False
            continue
        if in_workflow:
            match = re.match(r'^(\d+)\.\s+(.+)$', stripped)
            if match:
                step_num = int(match.group(1))
                steps.append(WorkflowStep(step=step_num, description=match.group(2)))
            elif stripped.startswith("- ") or stripped.startswith("* "):
                step_num += 1
                steps.append(WorkflowStep(step=step_num, description=stripped[2:]))

    return steps


def _extract_constraints(lines: List[str]) -> List[str]:
    constraints: List[str] = []
    in_constraints = False

    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("## constraints") or stripped.lower().startswith("## scope"):
            in_constraints = True
            continue
        if in_constraints and re.match(r'^#{1,2}\s', stripped):
            in_constraints = False
            continue
        if in_constraints and (stripped.startswith("- ") or stripped.startswith("* ")):
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
        if in_resources and re.match(r'^#{1,2}\s', stripped):
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
        if stripped.lower().startswith("## examples") or stripped.lower().startswith("## output"):
            in_examples = True
            continue
        if in_examples and re.match(r'^#{1,2}\s', stripped):
            in_examples = False
            if current:
                examples.append("\n".join(current))
                current = []
            continue
        if in_examples:
            if stripped.startswith("- ") or stripped.startswith("* "):
                if current:
                    examples.append("\n".join(current))
                    current = []
                current.append(stripped[2:])
            elif stripped:
                current.append(stripped)

    if current:
        examples.append("\n".join(current))

    return examples
