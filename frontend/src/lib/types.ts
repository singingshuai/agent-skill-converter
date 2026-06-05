export interface Triggers {
  keywords: string[];
  intent: string;
}

export interface ResourceItem {
  path: string;
  description: string;
}

export interface WorkflowStep {
  step: number;
  description: string;
  notes?: string;
}

export interface Outputs {
  format: string;
  must_include: string[];
}

export interface Section {
  title: string;
  level: number;
  content: string;
}

export interface AgentSkillSpec {
  name: string;
  description: string;
  version: string;
  source_platform: string;
  target_platform?: string;
  triggers: Triggers;
  inputs: string[];
  workflow: WorkflowStep[];
  constraints: string[];
  outputs: Outputs;
  resources: ResourceItem[];
  examples: string[];
  sections: Section[];
  metadata: Record<string, unknown>;
}

export interface LossReport {
  preserved: string[];
  partial: string[];
  lost: string[];
  manual_check: string[];
}

export interface ConvertResult {
  success: boolean;
  spec: AgentSkillSpec | null;
  output_files: Array<{ filename: string; content: string }>;
  loss_report: LossReport;
  error?: string;
}

export type TargetPlatform = 'claude' | 'cursor' | 'copilot' | 'markdown';