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
  if (!spec.name) errors.push('name is required');
  if (!spec.description) errors.push('description is required');
  if (!spec.triggers.keywords.length && !spec.triggers.intent) errors.push('triggers must contain at least one keyword or intent');
  if (!spec.workflow.length && !spec.sections.length) errors.push('workflow or sections must contain content');
  if (errors.length) throw new ValidationError(errors);
}

export function buildLossReport(preserved: string[], partial: string[], lost: string[], manual_check: string[]): LossReport {
  return { preserved, partial, lost, manual_check };
}