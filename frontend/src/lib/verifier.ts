export interface VerificationResult {
  platform: string;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  score: number;
  summary: string;
}

function verifyCodexRead(output: string): VerificationResult {
  const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

  const hasFrontmatter = /^---\n[\s\S]*?name:[\s\S]*?description:[\s\S]*?\n---/.test(output);
  checks.push({ name: 'YAML 前置数据 (name + description)', passed: hasFrontmatter, detail: hasFrontmatter ? 'Codex 可正确读取 name 和 description' : '缺少 YAML 前置数据或 name/description 字段' });

  const hasName = /^---\n[\s\S]*?name:\s*(.+)$/m.test(output);
  checks.push({ name: 'name 字段', passed: hasName, detail: hasName ? 'name 字段可被 Codex 识别' : 'Codex 无法识别 skill 名称' });

  const hasDescription = /^---\n[\s\S]*?description:\s*(.+)$/m.test(output);
  checks.push({ name: 'description 字段', passed: hasDescription, detail: hasDescription ? 'description 字段可被 Codex 识别' : 'Codex 无法识别 skill 描述' });

  const hasWhenToUse = /## When to Use/i.test(output);
  const hasTrigger = hasWhenToUse || /use when/i.test(output);
  checks.push({ name: '触发条件', passed: hasTrigger, detail: hasTrigger ? 'Codex 可识别触发条件' : '缺少明确的触发条件说明' });

  const hasSections = /^#{2,}\s+.+$/m.test(output);
  checks.push({ name: 'Markdown 章节结构', passed: hasSections, detail: hasSections ? '章节结构完整，Codex 可按章节加载' : '缺少 Markdown 章节结构' });

  const hasBody = output.replace(/^---\n[\s\S]*?\n---\n?/, '').trim().length > 100;
  checks.push({ name: '正文内容量', passed: hasBody, detail: hasBody ? '正文内容充足' : '正文内容过少，可能信息丢失严重' });

  const passed = checks.filter(c => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  return {
    platform: 'Codex',
    checks,
    score,
    summary: score >= 80 ? 'Codex 可正确识别此 skill' : score >= 60 ? 'Codex 可识别部分内容，建议补充缺失项' : 'Codex 可能无法正确识别此 skill',
  };
}

function verifyClaudeRead(output: string): VerificationResult {
  const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

  const hasFrontmatter = /^---\n[\s\S]*?name:[\s\S]*?description:[\s\S]*?\n---/.test(output);
  checks.push({ name: 'YAML 前置数据 (name + description)', passed: hasFrontmatter, detail: hasFrontmatter ? 'Claude 可正确读取 name 和 description' : '缺少 YAML 前置数据' });

  const descMatch = output.match(/^---\n[\s\S]*?description:\s*(.+)$/m);
  const hasTriggerInDesc = descMatch && /use when/i.test(descMatch[1]);
  const hasWhenToUse = /## When to Use/i.test(output);
  const hasTrigger = hasTriggerInDesc || hasWhenToUse;
  checks.push({ name: '触发条件', passed: hasTrigger, detail: hasTrigger ? 'Claude 可通过 description 或 When to Use 识别触发时机' : 'Claude 无法确定何时使用此 skill' });

  const bodyContent = output.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const hasBody = bodyContent.trim().length > 100;
  checks.push({ name: '正文内容量', passed: hasBody, detail: hasBody ? '正文内容充实，Claude 可获取足够指令' : '正文内容过少，Claude 可能无法正确执行' });

  const hasSections = /^#{2,}\s+.+$/m.test(output);
  checks.push({ name: 'Markdown 章节结构', passed: hasSections, detail: hasSections ? '章节结构完整' : '缺少章节结构' });

  const hasResources = /\[.*\]\(\.\/.*\)/.test(output);
  const noResourcesNeeded = !output.includes('./reference/') && !output.includes('./scripts/');
  const resourcesOk = hasResources || noResourcesNeeded;
  checks.push({ name: '资源引用', passed: resourcesOk, detail: hasResources ? '资源引用格式正确' : noResourcesNeeded ? '无需外部资源' : '引用了资源但格式可能不正确' });

  const passed = checks.filter(c => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  return {
    platform: 'Claude',
    checks,
    score,
    summary: score >= 80 ? 'Claude 可正确识别此 skill' : score >= 60 ? 'Claude 可识别部分内容，建议补充' : 'Claude 可能无法正确识别此 skill',
  };
}

function verifyCursorRead(output: string): VerificationResult {
  const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

  const hasFrontmatter = /^---\n/.test(output);
  checks.push({ name: 'YAML 前置数据', passed: hasFrontmatter, detail: hasFrontmatter ? 'Cursor 可读取 frontmatter' : '缺少 frontmatter' });

  const hasDescription = /^---\n[\s\S]*?description:\s*(.+)$/m.test(output);
  checks.push({ name: 'description 字段', passed: hasDescription, detail: hasDescription ? 'description 可被 Cursor 识别' : 'Cursor 无法识别规则描述' });

  const hasGlobs = /^---\n[\s\S]*?globs:\s*(.+)$/m.test(output);
  checks.push({ name: 'globs 文件匹配', passed: hasGlobs, detail: hasGlobs ? '文件匹配规则已设置' : '未设置 globs，可能影响触发范围' });

  const bodyContent = output.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const hasBody = bodyContent.trim().length > 50;
  checks.push({ name: '规则正文', passed: hasBody, detail: hasBody ? '规则正文内容充足' : '规则正文过少' });

  const hasRules = /^#{1,3}\s+.+$/m.test(bodyContent) || /- .+/m.test(bodyContent);
  checks.push({ name: '规则条目', passed: hasRules, detail: hasRules ? '包含可执行的规则条目' : '缺少具体的规则条目' });

  const passed = checks.filter(c => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  return {
    platform: 'Cursor',
    checks,
    score,
    summary: score >= 80 ? 'Cursor 可正确加载此规则' : score >= 60 ? 'Cursor 可加载部分内容，建议补充' : 'Cursor 可能无法正确加载此规则',
  };
}

function verifyCopilotRead(output: string): VerificationResult {
  // GitHub Copilot uses a Claude-like format for custom instructions
  return verifyClaudeRead(output);
}

function verifyMarkdownRead(output: string): VerificationResult {
  const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

  const hasTitle = /^#\s+.+$/m.test(output);
  checks.push({ name: '标题', passed: hasTitle, detail: hasTitle ? '包含标题' : '缺少标题' });

  const hasBody = output.trim().length > 100;
  checks.push({ name: '内容量', passed: hasBody, detail: hasBody ? '内容充足' : '内容过少' });

  const hasSections = /^#{2,}\s+.+$/m.test(output);
  checks.push({ name: '章节结构', passed: hasSections, detail: hasSections ? '章节结构清晰' : '缺少章节划分' });

  const passed = checks.filter(c => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  return {
    platform: 'Markdown',
    checks,
    score,
    summary: score >= 80 ? 'Markdown 格式完整，适合阅读和编辑' : 'Markdown 格式可能不完整',
  };
}

export function verifyConversion(output: string, targetPlatform: string): VerificationResult {
  switch (targetPlatform) {
    case 'codex': return verifyCodexRead(output);
    case 'claude': return verifyClaudeRead(output);
    case 'cursor': return verifyCursorRead(output);
    case 'copilot': return verifyCopilotRead(output);
    case 'markdown': return verifyMarkdownRead(output);
    default: return { platform: targetPlatform, checks: [], score: 0, summary: '未知平台' };
  }
}