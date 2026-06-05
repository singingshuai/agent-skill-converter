import type { AgentSkillSpec, ConvertResult, TargetPlatform, Section, LossReport } from './types';

/* ── helpers ─────────────────────────────────────────────── */

/** Render ALL sections as Markdown. */
function renderAllSections(sections: Section[]): string {
  let out = '';
  for (const s of sections) {
    if (s.level === 0) {
      if (s.content) out += s.content + '\n\n';
      continue;
    }
    const prefix = '#'.repeat(s.level);
    out += prefix + ' ' + s.title + '\n\n';
    if (s.content) out += s.content + '\n\n';
  }
  return out;
}

/** Render sections with a replacement top-level title.
 *  The first level-1 section's title is replaced by the new title.
 *  All subsequent level-1 sections keep their own titles. */
function renderSectionsWithTitle(sections: Section[], title: string): string {
  let out = '# ' + title + '\n\n';
  let firstLevel1 = true;
  for (const s of sections) {
    if (s.level === 0) {
      if (s.content) out += s.content + '\n\n';
      continue;
    }
    if (s.level === 1) {
      if (firstLevel1) {
        // First level-1: skip title (replaced by our title above), keep content
        firstLevel1 = false;
        if (s.content) out += s.content + '\n\n';
      } else {
        // Subsequent level-1: keep both title and content
        out += '# ' + s.title + '\n\n';
        if (s.content) out += s.content + '\n\n';
      }
      continue;
    }
    const prefix = '#'.repeat(s.level);
    out += prefix + ' ' + s.title + '\n\n';
    if (s.content) out += s.content + '\n\n';
  }
  return out;
}

function dedup(arr: string[]): string[] { return [...new Set(arr)]; }

function buildReport(preserved: string[], partial: string[], lost: string[], manualCheck: string[]): LossReport {
  return { preserved: dedup(preserved), partial: dedup(partial), lost: dedup(lost), manual_check: dedup(manualCheck) };
}

/* ── Codex generator ─────────────────────────────────────── */

function generateCodex(spec: AgentSkillSpec): ConvertResult {
  const preserved: string[] = ['name', 'description', 'all_sections_content'];
  const partial: string[] = [];
  const lost: string[] = [];
  const manualCheck: string[] = [];

  const license = (spec.metadata?.license as string) || '';
  let frontmatter = '---\n';
  frontmatter += 'name: ' + spec.name + '\n';
  frontmatter += 'description: ' + spec.description + '\n';
  if (license) frontmatter += 'license: ' + license + '\n';
  frontmatter += '---\n\n';

  let triggerSection = '';
  if (spec.triggers.intent) {
    triggerSection = '## When to Use\n\n' + spec.triggers.intent + '\n\n';
    preserved.push('triggers');
  }

  const bodyContent = renderSectionsWithTitle(spec.sections, spec.name);
  const content = frontmatter + triggerSection + bodyContent;

  if (spec.resources.length) manualCheck.push('resources - 请确认相对路径是否正确');
  if (spec.metadata?.globs) lost.push('globs - Codex 格式不支持 globs 字段');
  if (spec.metadata?.alwaysApply) lost.push('alwaysApply - Codex 格式不支持此字段');

  return {
    success: true, spec,
    output_files: [{ filename: spec.name + '/SKILL.md', content }],
    loss_report: buildReport(preserved, partial, lost, manualCheck),
  };
}

/* ── Claude generator ────────────────────────────────────── */

function generateClaude(spec: AgentSkillSpec): ConvertResult {
  const preserved: string[] = ['name', 'description', 'all_sections_content'];
  const partial: string[] = [];
  const lost: string[] = [];
  const manualCheck: string[] = [];

  let triggerDesc = spec.description;
  if (spec.triggers.intent && !spec.description.toLowerCase().includes('use when')) {
    triggerDesc += ' ' + spec.triggers.intent;
  }

  let frontmatter = '---\n';
  frontmatter += 'name: ' + spec.name + '\n';
  frontmatter += 'description: ' + triggerDesc + '\n';
  frontmatter += '---\n\n';

  const content = frontmatter + renderSectionsWithTitle(spec.sections, spec.name);

  preserved.push('triggers');
  if (spec.resources.length) manualCheck.push('resources - 请确认相对路径是否存在于目标仓库');
  if (spec.metadata?.license) lost.push('license 字段 - Claude 格式不包含 license');
  if (spec.metadata?.globs) lost.push('globs - Claude 格式不支持 globs 字段');
  if (spec.metadata?.alwaysApply) lost.push('alwaysApply - Claude 格式不支持此字段');

  return {
    success: true, spec,
    output_files: [{ filename: spec.name + '/SKILL.md', content }],
    loss_report: buildReport(preserved, partial, lost, manualCheck),
  };
}

/* ── Cursor generator ────────────────────────────────────── */

function generateCursor(spec: AgentSkillSpec): ConvertResult {
  const preserved: string[] = ['description'];
  const partial: string[] = [];
  const lost: string[] = [];
  const manualCheck: string[] = [];

  const globs = (spec.metadata?.globs as string) || '**/*';
  const alwaysApply = (spec.metadata?.alwaysApply as boolean) || false;

  let frontmatter = '---\n';
  frontmatter += 'description: "' + spec.description.replace(/"/g, '\\"') + '"\n';
  frontmatter += 'globs: ' + globs + '\n';
  frontmatter += 'alwaysApply: ' + alwaysApply + '\n';
  frontmatter += '---\n\n';

  let body = 'You are an expert assistant for ' + spec.name + '.\n\n';

  const sectionContent = renderAllSections(spec.sections);
  if (sectionContent.trim()) {
    body += sectionContent;
    preserved.push('all_sections_content');
  }

  if (spec.constraints.length) {
    const hasRulesSection = spec.sections.some(s => /constraint|rule/i.test(s.title));
    if (!hasRulesSection) {
      body += '\n## Key Rules\n\n';
      for (const c of spec.constraints) body += '- ' + c + '\n';
      body += '\n';
    }
    preserved.push('constraints');
  }

  const content = frontmatter + body.trim() + '\n';

  if (spec.resources.length) lost.push('resources 文件引用 - Cursor 规则不支持外部文件引用');
  if (spec.metadata?.license) lost.push('license - Cursor 格式不包含 license');

  return {
    success: true, spec,
    output_files: [{ filename: '.cursor/rules/' + spec.name + '.mdc', content }],
    loss_report: buildReport(preserved, partial, lost, manualCheck),
  };
}

/* ── Copilot generator ───────────────────────────────────── */

function generateCopilot(spec: AgentSkillSpec): ConvertResult {
  const r = generateClaude(spec);
  if (r.output_files.length) r.output_files[0].filename = spec.name + '.md';
  return r;
}

/* ── Markdown generator ──────────────────────────────────── */

function generateMarkdown(spec: AgentSkillSpec): ConvertResult {
  const preserved: string[] = ['name', 'description', 'all_sections_content'];
  const partial: string[] = [];
  const lost: string[] = [];
  const manualCheck: string[] = [];

  let meta = '## 元数据\n\n';
  meta += '- **名称：** ' + spec.name + '\n';
  meta += '- **版本：** ' + spec.version + '\n';
  meta += '- **来源平台：** ' + spec.source_platform + '\n';
  if (spec.triggers.intent) meta += '- **触发条件：** ' + spec.triggers.intent + '\n';
  meta += '\n';

  const content = '# ' + spec.name + '\n\n' + spec.description + '\n\n' + meta + renderAllSections(spec.sections);

  if (spec.resources.length) manualCheck.push('resources - 请确认资源文件路径');

  return {
    success: true, spec,
    output_files: [{ filename: spec.name + '.md', content }],
    loss_report: buildReport(preserved, partial, lost, manualCheck),
  };
}

/* ── registry ─────────────────────────────────────────────── */

const generators: Record<TargetPlatform, (spec: AgentSkillSpec) => ConvertResult> = {
  codex: generateCodex,
  claude: generateClaude,
  cursor: generateCursor,
  copilot: generateCopilot,
  markdown: generateMarkdown,
};

export function convert(spec: AgentSkillSpec, target: TargetPlatform): ConvertResult {
  spec.target_platform = target;
  return generators[target](spec);
}