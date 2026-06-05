import type { AgentSkillSpec, Section, Triggers, WorkflowStep, ResourceItem } from './types';

export type SourcePlatform = 'codex' | 'claude' | 'cursor';

interface ParsedFrontmatter {
  name: string;
  description: string;
  license: string;
  globs: string;
  alwaysApply: boolean;
  rawFields: Record<string, string>;
}

/** Normalize line endings and strip BOM */
function normalize(s: string): string {
  return s.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseFrontmatter(content: string): ParsedFrontmatter {
  const result: ParsedFrontmatter = {
    name: '', description: '', license: '', globs: '**/*', alwaysApply: false, rawFields: {},
  };
  const n = normalize(content);
  const fmMatch = n.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return result;
  const fm = fmMatch[1];
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      result.rawFields[key] = val;
      if (key === 'name') result.name = val;
      else if (key === 'description') result.description = val;
      else if (key === 'license') result.license = val;
      else if (key === 'globs') result.globs = val;
      else if (key === 'alwaysApply') result.alwaysApply = val === 'true';
    }
  }
  return result;
}

/** Extract markdown sections, skipping ``` code blocks so # comments inside are not treated as headers. */
function extractAllSections(bodyText: string): Section[] {
  const lines = bodyText.split('\n');
  const sections: Section[] = [];
  let currentTitle = '';
  let currentLevel = 0;
  let currentLines: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Toggle code block state on ``` fences
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      currentLines.push(line);
      continue;
    }

    // Inside code block: treat everything as content, never as headers
    if (inCodeBlock) {
      currentLines.push(line);
      continue;
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (currentTitle || currentLines.some(l => l.trim())) {
        if (!currentTitle && currentLines.some(l => l.trim())) {
          sections.push({ title: '', level: 0, content: currentLines.join('\n').trim() });
        } else if (currentTitle) {
          sections.push({ title: currentTitle, level: currentLevel, content: currentLines.join('\n').trim() });
        }
      }
      currentLevel = headerMatch[1].length;
      currentTitle = headerMatch[2];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, level: currentLevel, content: currentLines.join('\n').trim() });
  } else if (currentLines.some(l => l.trim())) {
    sections.push({ title: '', level: 0, content: currentLines.join('\n').trim() });
  }
  return sections;
}

function extractBodyAfterFrontmatter(content: string): string {
  const n = normalize(content);
  const fmMatch = n.match(/^---\n[\s\S]*?\n---\n?/);
  if (!fmMatch) return n;
  return n.substring(fmMatch[0].length);
}

function extractTriggersFromDescription(desc: string): string {
  // English: "Use when..."
  const en = desc.match(/[Uu]se (?:this skill )?when[^.]*/i);
  if (en) return en[0];
  // Chinese: "当用户请求..." / "当...时使用" / "用于..."
  const zh1 = desc.match(/当[^。，]*(?:时|使用|触发)[^。]*/);
  if (zh1) return zh1[0];
  const zh2 = desc.match(/用于[^。]*/);
  if (zh2) return zh2[0];
  // Fallback: if description mentions use/when/request context
  const zh3 = desc.match(/(?:用户|当)[^。]*(?:请求|需要|要求|使用)[^。]*/);
  if (zh3) return zh3[0];
  return '';
}

function extractWorkflowFromSections(sections: Section[]): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  let stepNum = 0;
  for (const section of sections) {
    if (/workflow|process|procedure|how to use|审查流程|生成规则|high-level workflow/i.test(section.title)) {
      const lines = section.content.split('\n');
      for (const line of lines) {
        const stripped = line.trim();
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
  }
  return steps;
}

function extractConstraintsFromSections(sections: Section[]): string[] {
  const constraints: string[] = [];
  for (const section of sections) {
    if (/constraint|rule|princip|convention|best practice|do not|don't|检查规则|补充检查|key conventions/i.test(section.title)) {
      const lines = section.content.split('\n');
      for (const line of lines) {
        const stripped = line.trim();
        if (stripped.startsWith('- ') || stripped.startsWith('* ')) {
          constraints.push(stripped.substring(2));
        }
      }
    }
  }
  return constraints;
}

function extractResourcesFromContent(content: string): ResourceItem[] {
  const resources: ResourceItem[] = [];
  const refPattern = /\[([^\]]+)\]\(\.\/([^)]+)\)/g;
  let match;
  while ((match = refPattern.exec(content)) !== null) {
    resources.push({ path: match[2], description: match[1] });
  }
  return resources;
}

function extractExamplesFromSections(sections: Section[]): string[] {
  const examples: string[] = [];
  for (const section of sections) {
    if (/example|sample|usage|示例/i.test(section.title)) {
      examples.push(section.content);
    }
  }
  return examples;
}

/** Derive a name from description text: "Cursor rules for X development" -> "X-development" */
function nameFromDescription(desc: string): string {
  // Try "Cursor rules for X development" pattern
  const m = desc.match(/(?:Cursor rules for|Guide for|Skill for)\s+(.+?)(?:\s+development|\s+integration|\s+with|$)/i);
  if (m) return m[1].trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 40) || 'cursor-rule';
  // Fallback: first N words
  const words = desc.split(/[\s,.;:]+/).filter(w => w.length > 2).slice(0, 4);
  return words.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'cursor-rule';
}

export function detectPlatform(content: string): SourcePlatform {
  const n = normalize(content);
  if (/^---\n[\s\S]*?alwaysApply/m.test(n)) return 'cursor';
  if (/^---\n[\s\S]*?license:/m.test(n)) return 'codex';
  if (/^---\n[\s\S]*?name:/m.test(n)) return 'claude';
  return 'codex';
}

export function parseSkill(content: string, platform?: SourcePlatform): AgentSkillSpec {
  const n = normalize(content);
  const detected = platform || detectPlatform(n);
  const fm = parseFrontmatter(n);
  const body = extractBodyAfterFrontmatter(n);
  const sections = extractAllSections(body);

  // Fallback name: from first heading, then from description
  if (!fm.name) {
    const h1 = sections.find(s => s.level === 1);
    if (h1) fm.name = h1.title;
    else if (fm.description) fm.name = nameFromDescription(fm.description);
  }
  // Fallback description: from first section content
  if (!fm.description) {
    const first = sections.find(s => s.content.length > 0);
    if (first) fm.description = first.content.split('\n')[0];
  }

  if (detected === 'cursor') return parseCursorStyle(fm, sections, body, content);
  if (detected === 'claude') return parseClaudeStyle(fm, sections, body, content);
  return parseCodexStyle(fm, sections, body, content);
}

function parseCodexStyle(fm: ParsedFrontmatter, sections: Section[], body: string, raw: string): AgentSkillSpec {
  const triggers: Triggers = { keywords: [], intent: '' };
  for (const s of sections) {
    if (/when to use|trigger|触发/i.test(s.title)) {
      triggers.intent = s.content.split('\n').filter(l => l.trim()).join(' ');
      break;
    }
  }
  if (!triggers.intent) triggers.intent = extractTriggersFromDescription(fm.description);

  return {
    name: fm.name, description: fm.description, version: '1.0.0', source_platform: 'codex',
    triggers, inputs: [], workflow: extractWorkflowFromSections(sections),
    constraints: extractConstraintsFromSections(sections), outputs: { format: 'markdown', must_include: [] },
    resources: extractResourcesFromContent(body), examples: extractExamplesFromSections(sections),
    sections, metadata: { raw_content: raw, license: fm.license },
  };
}

function parseClaudeStyle(fm: ParsedFrontmatter, sections: Section[], body: string, raw: string): AgentSkillSpec {
  const triggers: Triggers = { keywords: [], intent: '' };
  triggers.intent = extractTriggersFromDescription(fm.description);
  for (const s of sections) {
    if (/when to use|trigger|触发/i.test(s.title)) {
      triggers.intent = s.content.split('\n').filter(l => l.trim()).join(' ');
      break;
    }
  }
  return {
    name: fm.name, description: fm.description, version: '1.0.0', source_platform: 'claude',
    triggers, inputs: [], workflow: extractWorkflowFromSections(sections),
    constraints: extractConstraintsFromSections(sections), outputs: { format: 'markdown', must_include: [] },
    resources: extractResourcesFromContent(body), examples: extractExamplesFromSections(sections),
    sections, metadata: { raw_content: raw },
  };
}

function parseCursorStyle(fm: ParsedFrontmatter, sections: Section[], body: string, raw: string): AgentSkillSpec {
  const constraints: string[] = extractConstraintsFromSections(sections);
  const workflow: WorkflowStep[] = extractWorkflowFromSections(sections);

  if (!workflow.length && !constraints.length) {
    let stepNum = 0;
    for (const section of sections) {
      const lines = section.content.split('\n');
      for (const line of lines) {
        const stripped = line.trim();
        if (stripped.startsWith('- ') || stripped.startsWith('* ')) {
          const item = stripped.substring(2);
          if (/^(do not|don't|avoid|never|must not|should not|always|prefer|use |write |keep |minimize|focus)/i.test(item)) {
            constraints.push(item);
          } else {
            stepNum++;
            workflow.push({ step: stepNum, description: item });
          }
        }
      }
    }
  }

  let name = fm.name;
  if (!name) {
    const firstSection = sections.find(s => s.level >= 1 && s.title);
    if (firstSection) name = firstSection.title;
    else if (fm.description) name = nameFromDescription(fm.description);
  }

  return {
    name: name || 'cursor-rule', description: fm.description, version: '1.0.0', source_platform: 'cursor',
    triggers: { keywords: [], intent: fm.description }, inputs: [], workflow, constraints,
    outputs: { format: 'markdown', must_include: [] }, resources: [],
    examples: extractExamplesFromSections(sections), sections,
    metadata: { raw_content: raw, globs: fm.globs, alwaysApply: fm.alwaysApply },
  };
}