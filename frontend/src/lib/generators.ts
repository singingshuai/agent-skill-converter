import type { AgentSkillSpec, ConvertResult, TargetPlatform } from './types';
import { buildLossReport } from './validator';

function renderSections(sections: AgentSkillSpec['sections']): string {
  let out = '';
  for (const s of sections) {
    if (s.level === 1) continue;
    const prefix = '#'.repeat(s.level);
    out += prefix + ' ' + s.title + '\n\n';
    if (s.content) out += s.content + '\n\n';
  }
  return out;
}

function generateClaude(spec: AgentSkillSpec): ConvertResult {
  const content = '# ' + spec.name + '\n\n' + spec.description + '\n\n' + renderSections(spec.sections);
  return {
    success: true,
    spec,
    output_files: [{ filename: spec.name + '.md', content }],
    loss_report: buildLossReport(['name', 'description', 'all_sections'], [], [], spec.resources.length ? ['resources'] : []),
  };
}

function generateCursor(spec: AgentSkillSpec): ConvertResult {
  const front = '---\ndescription: ' + spec.description + '\nglobs: **\nalwaysApply: false\n---\n\n';
  const content = front + '# ' + spec.name + '\n\n' + renderSections(spec.sections);
  return {
    success: true,
    spec,
    output_files: [{ filename: spec.name + '.mdc', content }],
    loss_report: buildLossReport(['name', 'description', 'all_sections'], [], spec.resources.length ? ['resources'] : [], []),
  };
}

function generateCopilot(spec: AgentSkillSpec): ConvertResult {
  const content = '# ' + spec.name + '\n\n' + spec.description + '\n\n' + renderSections(spec.sections);
  return {
    success: true,
    spec,
    output_files: [{ filename: spec.name + '.md', content }],
    loss_report: buildLossReport(['name', 'description', 'all_sections'], [], spec.resources.length ? ['resources'] : [], []),
  };
}

function generateMarkdown(spec: AgentSkillSpec): ConvertResult {
  const meta = '## Metadata\n\n- **Version:** ' + spec.version + '\n- **Source Platform:** ' + spec.source_platform + '\n- **Target Platform:** ' + (spec.target_platform || 'N/A') + '\n\n';
  const content = '# ' + spec.name + '\n\n' + spec.description + '\n\n' + meta + renderSections(spec.sections);
  return {
    success: true,
    spec,
    output_files: [{ filename: spec.name + '.md', content }],
    loss_report: buildLossReport(['name', 'description', 'triggers', 'workflow', 'constraints', 'resources', 'examples', 'all_sections'], [], [], []),
  };
}

const generators: Record<TargetPlatform, (spec: AgentSkillSpec) => ConvertResult> = {
  claude: generateClaude,
  cursor: generateCursor,
  copilot: generateCopilot,
  markdown: generateMarkdown,
};

export function convert(spec: AgentSkillSpec, target: TargetPlatform): ConvertResult {
  spec.target_platform = target;
  return generators[target](spec);
}