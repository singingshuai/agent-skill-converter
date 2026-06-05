import { useState, useCallback, useEffect } from 'react';
import type { ConvertResult, TargetPlatform, Section, WorkflowStep } from './lib/types';
import { parseSkill, detectPlatform, type SourcePlatform } from './lib/parser';
import { validateSpec, ValidationError } from './lib/validator';
import { convert } from './lib/generators';
import { verifyConversion, type VerificationResult } from './lib/verifier';

const TARGET_PLATFORMS: { value: TargetPlatform; label: string }[] = [
  { value: 'codex', label: 'Codex' },
  { value: 'claude', label: 'Claude' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'copilot', label: 'GitHub Copilot' },
  { value: 'markdown', label: 'Markdown' },
];

const SOURCE_PLATFORMS: { value: SourcePlatform; label: string }[] = [
  { value: 'codex', label: 'Codex' },
  { value: 'claude', label: 'Claude' },
  { value: 'cursor', label: 'Cursor' },
];

/* ── Workflow comparison helpers ── */

function extractOutputSections(outputContent: string): Section[] {
  const lines = outputContent.split('\n');
  const sections: Section[] = [];
  let currentTitle = '';
  let currentLevel = 0;
  let currentLines: string[] = [];
  // skip frontmatter
  let inFM = false;
  let fmPassed = false;
  let inCode = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!fmPassed) {
      if (trimmed === '---') {
        if (!inFM) { inFM = true; continue; }
        else { fmPassed = true; inFM = false; continue; }
      }
      if (inFM) continue;
    }
    if (trimmed.startsWith('```')) { inCode = !inCode; currentLines.push(line); continue; }
    if (inCode) { currentLines.push(line); continue; }
    const hm = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      if (currentTitle || currentLines.some(l => l.trim())) {
        if (!currentTitle && currentLines.some(l => l.trim())) {
          sections.push({ title: '', level: 0, content: currentLines.join('\n').trim() });
        } else if (currentTitle) {
          sections.push({ title: currentTitle, level: currentLevel, content: currentLines.join('\n').trim() });
        }
      }
      currentLevel = hm[1].length;
      currentTitle = hm[2];
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

function sectionStatus(srcSections: Section[], outSections: Section[]): Array<{
  title: string; level: number;
  srcLen: number; outLen: number;
  status: 'preserved' | 'partial' | 'lost' | 'added';
}> {
  const result: Array<{
    title: string; level: number;
    srcLen: number; outLen: number;
    status: 'preserved' | 'partial' | 'lost' | 'added';
  }> = [];

  const outUsed = new Set<number>();

  for (const s of srcSections) {
    const srcLen = s.content.replace(/\s/g, '').length;
    // find matching output section by title
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < outSections.length; i++) {
      if (outUsed.has(i)) continue;
      const o = outSections[i];
      if (o.title === s.title || (s.title === '' && o.title === '')) {
        const oLen = o.content.replace(/\s/g, '').length;
        const overlap = contentOverlap(s.content, o.content);
        if (overlap > bestScore) { bestScore = overlap; bestIdx = i; }
      }
    }
    if (bestIdx >= 0 && bestScore > 0.3) {
      outUsed.add(bestIdx);
      const outLen = outSections[bestIdx].content.replace(/\s/g, '').length;
      const ratio = srcLen > 0 ? outLen / srcLen : (outLen > 0 ? 1 : 0);
      let status: 'preserved' | 'partial' | 'lost' = ratio >= 0.8 ? 'preserved' : ratio >= 0.2 ? 'partial' : 'lost';
      if (srcLen === 0 && outLen === 0) status = 'preserved';
      result.push({ title: s.title, level: s.level, srcLen, outLen, status });
    } else {
      result.push({ title: s.title, level: s.level, srcLen, outLen: 0, status: 'lost' });
    }
  }

  // added sections in output
  for (let i = 0; i < outSections.length; i++) {
    if (!outUsed.has(i)) {
      const o = outSections[i];
      const outLen = o.content.replace(/\s/g, '').length;
      if (outLen > 0) {
        result.push({ title: o.title, level: o.level, srcLen: 0, outLen, status: 'added' });
      }
    }
  }

  return result;
}

function contentOverlap(a: string, b: string): number {
  const aWords = new Set(a.replace(/\s+/g, ' ').split(' ').filter(w => w.length >= 3));
  const bText = b.replace(/\s+/g, ' ');
  if (aWords.size === 0) return bText.length > 0 ? 0.5 : 1;
  let hits = 0;
  for (const w of aWords) { if (bText.includes(w)) hits++; }
  return hits / aWords.size;
}

function App() {
  const [sourcePlatform, setSourcePlatform] = useState<SourcePlatform>('codex');
  const [target, setTarget] = useState<TargetPlatform>('claude');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'workflow' | 'steps' | 'spec' | 'report' | 'verify'>('output');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (content.trim()) {
      const detected = detectPlatform(content);
      setSourcePlatform(detected);
    }
  }, [content]);

  const handleConvert = useCallback(() => {
    try {
      const spec = parseSkill(content, sourcePlatform);
      validateSpec(spec);
      const r = convert(spec, target);
      setResult(r);
      setActiveTab(r.spec && r.spec.workflow.length > 0 ? 'steps' : 'workflow');

      if (r.output_files.length > 0) {
        const v = verifyConversion(r.output_files[0].content, target);
        setVerification(v);
      }
    } catch (e: unknown) {
      if (e instanceof ValidationError) {
        setResult({
          success: false, spec: null, output_files: [],
          loss_report: { preserved: [], partial: [], lost: [], manual_check: [] },
          error: e.errors.join('；'),
        });
      } else {
        setResult({
          success: false, spec: null, output_files: [],
          loss_report: { preserved: [], partial: [], lost: [], manual_check: [] },
          error: String(e),
        });
      }
      setVerification(null);
    }
  }, [content, target, sourcePlatform]);

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

  // Compute workflow comparison
  const hasWorkflowSteps = result?.success && result.spec && result.spec.workflow.length > 0;

  const toggleSection = useCallback((idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const workflowComparison = result?.success && result.spec && result.output_files.length > 0
    ? sectionStatus(result.spec.sections, extractOutputSections(result.output_files[0].content))
    : null;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Agent Skill 转换器</h1>
        <p>在 Codex / Claude / Cursor 之间相互转换 Skills，支持转换验证</p>
      </header>

      <div className="card">
        <div className="card-title">输入配置</div>
        <div className="form-row">
          <div className="form-group">
            <label>源平台（自动检测）</label>
            <select value={sourcePlatform} onChange={e => setSourcePlatform(e.target.value as SourcePlatform)}>
              {SOURCE_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>目标平台</label>
            <select value={target} onChange={e => setTarget(e.target.value as TargetPlatform)}>
              {TARGET_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={'粘贴 SKILL.md 或 .mdc 文件内容...\n\n支持 Codex / Claude / Cursor 格式，会自动检测来源平台'}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={handleConvert} disabled={!content.trim()}>
            开始转换
          </button>
        </div>
      </div>

      {result?.error && <div className="error-box">{result.error}</div>}

      {result?.success && (
        <div className="card">
          <div className="toolbar">
            <div className="tab-bar">
              {hasWorkflowSteps && <button className={'tab-btn' + (activeTab === 'steps' ? ' active' : '')} onClick={() => setActiveTab('steps')}>步骤流程</button>}
              <button className={'tab-btn' + (activeTab === 'workflow' ? ' active' : '')} onClick={() => setActiveTab('workflow')}>章节对比</button>
              <button className={'tab-btn' + (activeTab === 'output' ? ' active' : '')} onClick={() => setActiveTab('output')}>转换结果</button>
              <button className={'tab-btn' + (activeTab === 'spec' ? ' active' : '')} onClick={() => setActiveTab('spec')}>中间 JSON</button>
              <button className={'tab-btn' + (activeTab === 'report' ? ' active' : '')} onClick={() => setActiveTab('report')}>损失报告</button>
              <button className={'tab-btn' + (activeTab === 'verify' ? ' active' : '')} onClick={() => setActiveTab('verify')}>转换验证</button>
            </div>
            <button className="btn-secondary" onClick={handleDownload}>下载全部结果</button>
          </div>

          {/* ── Steps tab (only when workflow steps exist) ── */}
          {activeTab === 'steps' && result.spec && (
            <div>
              <div className="steps-header">
                <span className="steps-header-title">执行步骤</span>
                <span className="steps-header-sub">共 {result.spec.workflow.length} 步</span>
              </div>
              <div className="steps-flow">
                {result.spec.workflow.map((step, i) => (
                  <div key={i} className="steps-step" onClick={() => toggleSection(i)} style={{ cursor: 'pointer' }}>
                    <div className="steps-step-head">
                      <div className="steps-step-num">{step.step}</div>
                      <div className="steps-step-desc">{step.description}</div>
                      <span className="steps-expand-icon">{expandedSections.has(i) ? '\u25b2' : '\u25bc'}</span>
                    </div>
                    {expandedSections.has(i) && (
                      <div className="steps-step-detail">
                        <div className="steps-step-detail-label">原始步骤 {step.step}</div>
                        <div className="steps-step-detail-text">{step.description}</div>
                        {step.notes && (
                          <>
                            <div className="steps-step-detail-label">备注</div>
                            <div className="steps-step-detail-text">{step.notes}</div>
                          </>
                        )}
                      </div>
                    )}
                    {i < result.spec!.workflow.length - 1 && (
                      <div className="steps-connector">
                        <div className="steps-connector-line"></div>
                        <div className="steps-connector-arrow">{'\u25bc'}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Workflow tab (section comparison) ── */}
          {activeTab === 'workflow' && workflowComparison && result.spec && (
            <div>
              {/* Summary bar */}
              <div className="wf-summary">
                <div className="wf-summary-item wf-summary-preserved">
                  <span className="wf-summary-count">{workflowComparison.filter(s => s.status === 'preserved').length}</span>
                  <span>完整保留</span>
                </div>
                <div className="wf-summary-item wf-summary-partial">
                  <span className="wf-summary-count">{workflowComparison.filter(s => s.status === 'partial').length}</span>
                  <span>部分保留</span>
                </div>
                <div className="wf-summary-item wf-summary-lost">
                  <span className="wf-summary-count">{workflowComparison.filter(s => s.status === 'lost').length}</span>
                  <span>未能保留</span>
                </div>
                <div className="wf-summary-item wf-summary-added">
                  <span className="wf-summary-count">{workflowComparison.filter(s => s.status === 'added').length}</span>
                  <span>新增</span>
                </div>
              </div>

              {/* Header */}
              <div className="wf-header">
                <div className="wf-col-src">{sourcePlatform.toUpperCase()} 源文件</div>
                <div className="wf-col-arrow"></div>
                <div className="wf-col-out">{target.toUpperCase()} 输出</div>
              </div>

              {/* Section rows - clickable */}
              <div className="wf-table">
                {workflowComparison.map((item, i) => (
                  <div key={i}>
                    <div className={'wf-row wf-row-' + item.status} onClick={() => toggleSection(1000 + i)} style={{ cursor: 'pointer' }}>
                      <div className="wf-cell wf-cell-src">
                        {item.srcLen > 0 ? (
                          <>
                            <div className="wf-section-title">
                              {'#'.repeat(item.level || 1) + ' '}{item.title || '(前置内容)'}
                            </div>
                            <div className="wf-section-meta">{item.srcLen} 字符</div>
                          </>
                        ) : (
                          <div className="wf-section-empty">-</div>
                        )}
                      </div>
                      <div className="wf-cell wf-cell-arrow">
                        {item.status === 'preserved' && <span className="wf-arrow wf-arrow-ok">{'\u2192'}</span>}
                        {item.status === 'partial' && <span className="wf-arrow wf-arrow-partial">{'\u2192'}</span>}
                        {item.status === 'lost' && <span className="wf-arrow wf-arrow-lost">{'\u2716'}</span>}
                        {item.status === 'added' && <span className="wf-arrow wf-arrow-added">{'\u2795'}</span>}
                      </div>
                      <div className="wf-cell wf-cell-out">
                        {item.outLen > 0 ? (
                          <>
                            <div className="wf-section-title">
                              {'#'.repeat(item.level || 1) + ' '}{item.title || '(前置内容)'}
                            </div>
                            <div className="wf-section-meta">
                              {item.outLen} 字符
                              {item.srcLen > 0 && (
                                <span className="wf-ratio">
                                  {' '}({Math.round(item.outLen / item.srcLen * 100)}%)
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="wf-section-empty">-</div>
                        )}
                      </div>
                      <div className="wf-cell wf-cell-badge">
                        <span className={'wf-badge wf-badge-' + item.status}>
                          {item.status === 'preserved' && '\u2705 保留'}
                          {item.status === 'partial' && '\u26a0\ufe0f 部分'}
                          {item.status === 'lost' && '\u274c 丢失'}
                          {item.status === 'added' && '\u2795 新增'}
                        </span>
                        <span className="steps-expand-icon" style={{ marginLeft: '0.5rem' }}>{expandedSections.has(1000 + i) ? '\u25b2' : '\u25bc'}</span>
                      </div>
                    </div>
                    {expandedSections.has(1000 + i) && (
                      <div className="wf-expand-panel">
                        <div className="wf-expand-col">
                          <div className="wf-expand-label">源内容预览</div>
                          <div className="wf-expand-content">
                            {item.srcLen > 0 ? (() => {
                              const srcSec = result.spec!.sections.find(s => s.title === item.title || (item.title === '' && s.level === 0));
                              return srcSec ? srcSec.content : '(未找到匹配的源 section)';
                            })() : '(无源内容)'}
                          </div>
                        </div>
                        <div className="wf-expand-col">
                          <div className="wf-expand-label">输出内容预览</div>
                          <div className="wf-expand-content">
                            {item.outLen > 0 ? (() => {
                              const outSec = extractOutputSections(result.output_files![0].content).find(s => s.title === item.title || (item.title === '' && s.level === 0));
                              return outSec ? outSec.content : '(未找到匹配的输出 section)';
                            })() : '(无输出内容)'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Overall stats */}
              <div className="wf-overall">
                <div>
                  <strong>源文件总内容：</strong>
                  {result.spec.sections.reduce((s, sec) => s + sec.content.replace(/\s/g, '').length, 0)} 字符
                </div>
                <div>
                  <strong>输出总内容：</strong>
                  {workflowComparison.reduce((s, sec) => s + sec.outLen, 0)} 字符
                </div>
                <div>
                  <strong>整体保留率：</strong>
                  {(() => {
                    const srcTotal = result.spec.sections.reduce((s, sec) => s + sec.content.replace(/\s/g, '').length, 0);
                    const outTotal = workflowComparison.reduce((s, sec) => s + sec.outLen, 0);
                    return srcTotal > 0 ? Math.round(outTotal / srcTotal * 100) + '%' : 'N/A';
                  })()}
                </div>
              </div>
            </div>
          )}
          {/* ── Output tab ── */}
          {activeTab === 'output' && result.output_files.map((f, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.filename}</span>
                <button className="btn-secondary" onClick={() => handleDownloadFile(f.filename, f.content)}>下载文件</button>
              </div>
              <div className="code-block">{f.content}</div>
            </div>
          ))}

          {/* ── Spec tab ── */}
          {activeTab === 'spec' && result.spec && (
            <div className="code-block">{JSON.stringify(result.spec, null, 2)}</div>
          )}

          {/* ── Report tab ── */}
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

          {/* ── Verify tab ── */}
          {activeTab === 'verify' && verification && (
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{verification.platform} 读取验证</span>
                <span style={{
                  padding: '0.25rem 0.75rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.9rem',
                  background: verification.score >= 80 ? 'var(--success-bg)' : verification.score >= 60 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                  color: verification.score >= 80 ? 'var(--success)' : verification.score >= 60 ? 'var(--warning)' : 'var(--danger)',
                }}>
                  {verification.score}%
                </span>
              </div>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>{verification.summary}</p>
              {verification.checks.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                  padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ color: c.passed ? 'var(--success)' : 'var(--danger)', fontWeight: 600, minWidth: '1.5rem' }}>
                    {c.passed ? '✅' : '❌'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && (
        <div className="card">
          <div className="empty-state">
            <div className="icon"></div>
            <p>粘贴任意平台的 Skill 内容，选择目标平台，点击“开始转换”</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
              支持 Codex SKILL.md、Claude SKILL.md、Cursor .mdc 格式自动检测
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;