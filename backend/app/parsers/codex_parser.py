# -*- coding: utf-8 -*-
import re
from pathlib import Path
from typing import List, Optional
from ..core.spec import AgentSkillSpec, ResourceItem, Triggers, WorkflowStep, Outputs


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
    # Try YAML frontmatter
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
    
    # Try markdown header
    for line in lines:
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return skill_dir.name


def _extract_description(lines: List[str]) -> str:
    # Try YAML frontmatter
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
            # If description is empty, check next lines
            for j in range(i + 1, len(lines)):
                next_line = lines[j].strip()
                if next_line.startswith("---") or next_line.startswith("#"):
                    break
                if next_line:
                    return next_line
    
    # Try markdown header
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
    
    # Try to find "When to Use" section
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.lower().startswith("## when to use") or stripped.lower().startswith("## trigger"):
            # Get the content after this header
            for j in range(i + 1, len(lines)):
                next_line = lines[j].strip()
                if next_line.startswith("#"):
                    break
                if next_line:
                    intent = next_line
                    break
            break
    
    # Fallback: extract from description or content
    if not intent:
        # Look for "Use when" pattern in content
        use_when_match = re.search(r'[Uu]se when[^.]*\.', content)
        if use_when_match:
            intent = use_when_match.group(0)
        else:
            # Use description as intent
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
        
        # Detect workflow section
        if stripped.lower().startswith("## workflow") or "workflow" in stripped.lower():
            in_workflow = True
            continue
        
        # End of workflow section
        if in_workflow and stripped.startswith("#"):
            in_workflow = False
            continue
        
        # Extract steps
        if in_workflow:
            # Numbered list
            match = re.match(r'^(\d+)\.\s+(.+)$', stripped)
            if match:
                step_num = int(match.group(1))
                steps.append(WorkflowStep(step=step_num, description=match.group(2)))
            # Bullet list
            elif stripped.startswith("- ") or stripped.startswith("* "):
                step_num += 1
                steps.append(WorkflowStep(step=step_num, description=stripped[2:]))
    
    # If no workflow found, try to extract from "Generation Rules" or similar sections
    if not steps:
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.lower().startswith("## generation rules") or stripped.lower().startswith("## rules"):
                for j in range(i + 1, len(lines)):
                    next_line = lines[j].strip()
                    if next_line.startswith("#"):
                        break
                    match = re.match(r'^(\d+)\.\s+(.+)$', next_line)
                    if match:
                        step_num = int(match.group(1))
                        steps.append(WorkflowStep(step=step_num, description=match.group(2)))
                break
    
    return steps


def _extract_constraints(lines: List[str]) -> List[str]:
    constraints: List[str] = []
    in_constraints = False
    
    for line in lines:
        stripped = line.strip()
        
        # Detect constraints section
        if stripped.lower().startswith("## constraints") or stripped.lower().startswith("## scope") or stripped.lower().startswith("## range"):
            in_constraints = True
            continue
        
        # End of constraints section
        if in_constraints and stripped.startswith("#"):
            in_constraints = False
            continue
        
        # Extract constraints
        if in_constraints and (stripped.startswith("- ") or stripped.startswith("* ")):
            constraints.append(stripped[2:])
    
    # If no constraints found, try to extract from other sections
    if not constraints:
        for i, line in enumerate(lines):
            stripped = line.strip()
            if "must" in stripped.lower() or "should" in stripped.lower() or "do not" in stripped.lower():
                if stripped.startswith("- ") or stripped.startswith("* "):
                    constraints.append(stripped[2:])
                elif re.match(r'^\d+\.\s+', stripped):
                    constraints.append(stripped)
    
    return constraints


def _extract_resources(skill_dir: Path, lines: List[str]) -> List[ResourceItem]:
    resources: List[ResourceItem] = []
    in_resources = False
    
    for line in lines:
        stripped = line.strip()
        
        # Detect resources section
        if stripped.lower().startswith("## resources"):
            in_resources = True
            continue
        
        # End of resources section
        if in_resources and stripped.startswith("#"):
            in_resources = False
            continue
        
        # Extract resources
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
        
        # Detect examples section
        if stripped.lower().startswith("## examples") or stripped.lower().startswith("## output"):
            in_examples = True
            continue
        
        # End of examples section
        if in_examples and stripped.startswith("#"):
            in_examples = False
            if current:
                examples.append("\n".join(current))
                current = []
            continue
        
        # Extract examples
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
