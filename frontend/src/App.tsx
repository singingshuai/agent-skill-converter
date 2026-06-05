import { useState, useCallback } from 'react';
import type { ConvertResult, TargetPlatform } from './lib/types';
import { parseCodexSkill } from './lib/parser';
import { validateSpec, ValidationError } from './lib/validator';
import { convert } from './lib/generators';

const PLATFORMS: { value: TargetPlatform; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'copilot', label: 'GitHub Copilot' },
  { value: 'markdown', label: 'Markdown' },
];

const SAMPLE_SKILL = `---
name: code-reviewer
description: 代码审查技能，用于检查提交代码中的常见问题。
---

# 代码审查

检查数据仓库项目提交代码中的常见问题。

## When to Use

Use when user requests code review or needs to verify code quality.

## Workflow

1. 获取变更文件列表
2. 扫描新增/修改文件
3. 按文件类型分类检查
4. 生成报告，按严重程度排序

## Constraints

- 只审查变更内容，不审查未修改的代码
- 新增文件完整审查，修改文件只审查改动部分

## Examples

- 审查最近一次提交的代码
- 检查SQL语句中的测试库引用
`;

function App() {
  const [target, setTarget] = useState<TargetPlatform>('claude');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'spec' | 'report'>('output');

  const handleConvert = useCallback(() => {
    try {
      const spec = parseCodexSkill(content);
      validateSpec(spec);
      const r = convert(spec, target);
      setResult(r);
      setActiveTab('output');
    } catch (e: unknown) {
      if (e instanceof ValidationError) {
        setResult({
          success: false,
          spec: null,
          output_files: [],
          loss_report: { preserved: [], partial: [], lost: [], manual_check: [] },
          error: e.errors.join('；'),
        });
      } else {
        setResult({
          success: false,
          spec: null,
          output_files: [],
          loss_report: { preserved: [], partial: [], lost: [], manual_check: [] },
          error: String(e),
        });
      }
    }
  }, [content, target]);

  const handleDownload = useCallback(() => {
    if (!result?.success) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversion-result.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleDownloadFile = useCallback((filename: string, fileContent: string) => {
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleLoadSample = useCallback(() => {
    setContent(SAMPLE_SKILL);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Agent Skill 转换器</h1>
        <p>将 Codex SKILL.md 转换为 Claude / Cursor / GitHub Copilot / Markdown 格式</p>
      </header>

      <div className="card">
        <div className="card-title">输入配置</div>
        <div className="form-row">
          <div className="form-group">
            <label>源平台</label>
            <select value="codex" disabled>
              <option value="codex">Codex</option>
            </select>
          </div>
          <div className="form-group">
            <label>目标平台</label>
            <select value={target} onChange={e => setTarget(e.target.value as TargetPlatform)}>
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="在此粘贴 SKILL.md 内容..."
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={handleConvert} disabled={!content.trim()}>
            开始转换
          </button>
          <button className="btn-secondary" onClick={handleLoadSample}>
            加载示例
          </button>
        </div>
      </div>

      {result?.error && (
        <div className="error-box">{result.error}</div>
      )}

      {result?.success && (
        <div className="card">
          <div className="toolbar">
            <div className="tab-bar">
              <button className={'tab-btn' + (activeTab === 'output' ? ' active' : '')} onClick={() => setActiveTab('output')}>转换结果</button>
              <button className={'tab-btn' + (activeTab === 'spec' ? ' active' : '')} onClick={() => setActiveTab('spec')}>中间 JSON</button>
              <button className={'tab-btn' + (activeTab === 'report' ? ' active' : '')} onClick={() => setActiveTab('report')}>损失报告</button>
            </div>
            <button className="btn-secondary" onClick={handleDownload}>下载全部结果</button>
          </div>

          {activeTab === 'output' && result.output_files.map((f, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.filename}</span>
                <button className="btn-secondary" onClick={() => handleDownloadFile(f.filename, f.content)}>下载文件</button>
              </div>
              <div className="code-block">{f.content}</div>
            </div>
          ))}

          {activeTab === 'spec' && result.spec && (
            <div className="code-block">{JSON.stringify(result.spec, null, 2)}</div>
          )}

          {activeTab === 'report' && (
            <div className="loss-grid">
              <div className="loss-card loss-preserved">
                <h4>完整保留 ({result.loss_report.preserved.length})</h4>
                <ul>{result.loss_report.preserved.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
              <div className="loss-card loss-partial">
                <h4>部分保留 ({result.loss_report.partial.length})</h4>
                <ul>{result.loss_report.partial.length ? result.loss_report.partial.map((x, i) => <li key={i}>{x}</li>) : <li>无</li>}</ul>
              </div>
              <div className="loss-card loss-lost">
                <h4>无法保留 ({result.loss_report.lost.length})</h4>
                <ul>{result.loss_report.lost.length ? result.loss_report.lost.map((x, i) => <li key={i}>{x}</li>) : <li>无</li>}</ul>
              </div>
              <div className="loss-card loss-manual">
                <h4>需人工确认 ({result.loss_report.manual_check.length})</h4>
                <ul>{result.loss_report.manual_check.length ? result.loss_report.manual_check.map((x, i) => <li key={i}>{x}</li>) : <li>无</li>}</ul>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && (
        <div className="card">
          <div className="empty-state">
            <div className="icon">🔄</div>
            <p>粘贴 SKILL.md 内容，选择目标平台，点击"开始转换"</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;