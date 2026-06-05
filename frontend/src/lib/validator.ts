import type { AgentSkillSpec, LossReport } from './types';

export class ValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join('; '));
    this.errors = errors;
  }
}

export function validateSpec(spec: AgentSkillSpec): void {
  const errors: string[] = [];
  if (!spec.name) errors.push('缺少 name 字段');
  if (!spec.description) errors.push('缺少 description 字段');
  // If there are no sections at all, and no triggers, that's an error
  if (!spec.triggers.keywords.length && !spec.triggers.intent && !spec.sections.length) {
    errors.push('缺少触发条件（triggers）和章节内容，至少需要一项');
  }
  if (!spec.workflow.length && !spec.sections.length) {
    errors.push('缺少工作流（workflow）或章节（sections）内容');
  }
  if (errors.length) throw new ValidationError(errors);
}

export function buildLossReport(preserved: string[], partial: string[], lost: string[], manualCheck: string[]): LossReport {
  return { preserved, partial, lost, manual_check: manualCheck };
}