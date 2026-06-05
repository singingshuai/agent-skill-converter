import type { AgentSkillSpec, Section, Triggers, WorkflowStep, ResourceItem } from './types';

function extractAllSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let currentTitle = '';
  let currentLevel = 0;
  let currentLines: string[] = [];

  for (const line of lines) {
    const stripped = line.trim();
    const headerMatch = stripped.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (currentTitle) {
        sections.push({
          title: currentTitle,
          level: currentLevel,
          content: currentLines.join('\n').trim(),
        });
      }
      currentLevel = headerMatch[1].length;
      currentTitle = headerMatch[2];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentTitle) {
    sections.push({
      title: currentTitle,
      level: currentLevel,
      content: currentLines.join('\n').trim(),
    });
  }

  return sections;
}

function extractName(lines: string[]): string {
  let inFrontmatter = false;
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped === '---') {
      if (!inFrontmatter) { inFrontmatter = true; continue; }
      else break;
    }
    if (inFrontmatter && stripped.startsWith('name:')) {
      return stripped.substring(5).trim();
    }
  }
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith('# ')) return stripped.substring(2).trim();
  }
  return '';
}

function extractDescription(lines: string[]): string {
  let inFrontmatter = false;
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (stripped === '---') {
      if (!inFrontmatter) { inFrontmatter = true; continue; }
      else break;
    }
    if (inFrontmatter && stripped.startsWith('description:')) {
      const desc = stripped.substring(12).trim();
      if (desc) return desc;
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (next.startsWith('---') || next.startsWith('#')) break;
        if (next) return next;
      }
    }
  }
  const descLines: string[] = [];
  let inHeader = false;
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith('# ') && !inHeader) { inHeader = true; continue; }
    if (inHeader) {
      if (stripped.startsWith('#')) break;
      if (stripped) descLines.push(stripped);
    }
  }
  return descLines.join(' ') || '';
}

function extractTriggers(lines: string[], content: string): Triggers {
  let inTrigger = false;
  const triggerLines: string[] = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (/^## when to use/i.test(stripped) || /^## trigger/i.test(stripped)) { inTrigger = true; continue; }
    if (inTrigger && /^#/.test(stripped)) { inTrigger = false; continue; }
    if (inTrigger && stripped) triggerLines.push(stripped);
  }
  let intent = triggerLines.join(' ') || '';
  if (!intent) {
    const m = content.match(/[Uu]se when[^.]*\./);
    if (m) intent = m[0];
    else {
      for (const line of lines) {
        const stripped = line.trim();
        if (stripped.startsWith('description:')) { intent = stripped.substring(12).trim(); break; }
      }
    }
  }
  return { keywords: [], intent };
}

function extractWorkflow(lines: string[]): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  let stepNum = 0;
  let inWorkflow = false;
  for (const line of lines) {
    const stripped = line.trim();
    if (/^## workflow/i.test(stripped) || /^## required prelude/i.test(stripped)) { inWorkflow = true; continue; }
    if (inWorkflow && /^#{1,2}\s/.test(stripped)) { inWorkflow = false; continue; }
    if (inWorkflow) {
      const numMatch = stripped.match(/^(\d+)\.\s+(.+)$/);
      if (numMatch) {
        stepNum = parseInt(numMatch[1]);
        steps.push({ step: stepNum, description: numMatch[2] });
      } else if (stripped.startsWith('- ') || stripped.startsWith('* ')) {
        stepNum++;
        steps.push({ step: stepNum, description: stripped.substring(2) });
      }
    }
  }
  return steps;
}

function extractConstraints(lines: string[]): string[] {
  const constraints: string[] = [];
  let inConstraints = false;
  for (const line of lines) {
    const stripped = line.trim();
    if (/^## constraints/i.test(stripped) || /^## scope/i.test(stripped)) { inConstraints = true; continue; }
    if (inConstraints && /^#{1,2}\s/.test(stripped)) { inConstraints = false; continue; }
    if (inConstraints && (stripped.startsWith('- ') || stripped.startsWith('* '))) {
      constraints.push(stripped.substring(2));
    }
  }
  return constraints;
}

function extractResources(lines: string[]): ResourceItem[] {
  const resources: ResourceItem[] = [];
  let inResources = false;
  for (const line of lines) {
    const stripped = line.trim();
    if (/^## resources/i.test(stripped)) { inResources = true; continue; }
    if (inResources && /^#{1,2}\s/.test(stripped)) { inResources = false; continue; }
    if (inResources && stripped.startsWith('- ')) {
      const parts = stripped.substring(2).split(':');
      resources.push({ path: parts[0].trim(), description: parts.slice(1).join(':').trim() });
    }
  }
  return resources;
}

function extractExamples(lines: string[]): string[] {
  const examples: string[] = [];
  let inExamples = false;
  let current: string[] = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (/^## examples/i.test(stripped) || /^## output/i.test(stripped)) { inExamples = true; continue; }
    if (inExamples && /^#{1,2}\s/.test(stripped)) {
      inExamples = false;
      if (current.length) { examples.push(current.join('\n')); current = []; }
      continue;
    }
    if (inExamples) {
      if (stripped.startsWith('- ') || stripped.startsWith('* ')) {
        if (current.length) { examples.push(current.join('\n')); current = []; }
        current.push(stripped.substring(2));
      } else if (stripped) {
        current.push(stripped);
      }
    }
  }
  if (current.length) examples.push(current.join('\n'));
  return examples;
}

export function parseCodexSkill(content: string): AgentSkillSpec {
  const lines = content.split('\n');
  return {
    name: extractName(lines),
    description: extractDescription(lines),
    version: '1.0.0',
    source_platform: 'codex',
    triggers: extractTriggers(lines, content),
    inputs: [],
    workflow: extractWorkflow(lines),
    constraints: extractConstraints(lines),
    outputs: { format: 'markdown', must_include: [] },
    resources: extractResources(lines),
    examples: extractExamples(lines),
    sections: extractAllSections(lines),
    metadata: { raw_content: content },
  };
}