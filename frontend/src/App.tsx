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

const SAMPLE_SKILL = [
  '---',
  'name: code-reviewer',
  'description: \u4ee3\u7801\u5ba1\u67e5\u6280\u80fd\uff0c\u7528\u4e8e\u68c0\u67e5\u63d0\u4ea4\u4ee3\u7801\u4e2d\u7684\u5e38\u89c1\u95ee\u9898\u3002',
  '---',
  '',
  '# \u4ee3\u7801\u5ba1\u67e5',
  '',
  '\u68c0\u67e5\u6570\u636e\u4ed3\u5e93\u9879\u76ee\u63d0\u4ea4\u4ee3\u7801\u4e2d\u7684\u5e38\u89c1\u95ee\u9898\u3002',
  '',
  '## When to Use',
  '',
  'Use when user requests code review or needs to verify code quality.',
  '',
  '## Workflow',
  '',
  '1. \u83b7\u53d6\u53d8\u66f4\u6587\u4ef6\u5217\u8868',
  '2. \u626b\u63cf\u65b0\u589e/\u4fee\u6539\u6587\u4ef6',
  '3. \u6309\u6587\u4ef6\u7c7b\u578b\u5206\u7c7b\u68c0\u67e5',
  '4. \u751f\u6210\u62a5\u544a\uff0c\u6309\u4e25\u91cd\u7a0b\u5ea6\u6392\u5e8f',
  '',
  '## Constraints',
  '',
  '- \u53ea\u5ba1\u67e5\u53d8\u66f4\u5185\u5bb9\uff0c\u4e0d\u5ba1\u67e5\u672a\u4fee\u6539\u7684\u4ee3\u7801',
  '- \u65b0\u589e\u6587\u4ef6\u5b8c\u6574\u5ba1\u67e5\uff0c\u4fee\u6539\u6587\u4ef6\u53ea\u5ba1\u67e5\u6539\u52a8\u90e8\u5206',
  '',
  '## Examples',
  '',
  '- \u5ba1\u67e5\u6700\u8fd1\u4e00\u6b21\u63d0\u4ea4\u7684\u4ee3\u7801',
  '- \u68c0\u67e5SQL\u8bed\u53e5\u4e2d\u7684\u6d4b\u8bd5\u5e93\u5f15\u7528',
].join('\n');

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
          error: e.errors.join('\uff1b'),
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
        <h1>Agent Skill \u8f6c\u6362\u5668</h1>
        <p>\u5c06 Codex SKILL.md \u8f6c\u6362\u4e3a Claude / Cursor / GitHub Copilot / Markdown \u683c\u5f0f</p>
      </header>

      <div className="card">
        <div className="card-title">\ud83d\udcdd \u8f93\u5165\u914d\u7f6e</div>
        <div className="form-row">
          <div className="form-group">
            <label>\u6e90\u5e73\u53f0</label>
            <select value="codex" disabled>
              <option value="codex">Codex</option>
            </select>
          </div>
          <div className="form-group">
            <label>\u76ee\u6807\u5e73\u53f0</label>
            <select value={target} onChange={e => setTarget(e.target.value as TargetPlatform)}>
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="\u5728\u6b64\u7c98\u8d34 SKILL.md \u5185\u5bb9..."
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={handleConvert} disabled={!content.trim()}>
            \ud83d\ude80 \u5f00\u59cb\u8f6c\u6362
          </button>
          <button className="btn-secondary" onClick={handleLoadSample}>
            \ud83d\udcc4 \u52a0\u8f7d\u793a\u4f8b
          </button>
        </div>
      </div>

      {result?.error && (
        <div className="error-box">\u274c {result.error}</div>
      )}

      {result?.success && (
        <>
          <div className="card">
            <div className="toolbar">
              <div className="tab-bar">
                <button className={'tab-btn' + (activeTab === 'output' ? ' active' : '')} onClick={() => setActiveTab('output')}>\u8f6c\u6362\u7ed3\u679c</button>
                <button className={'tab-btn' + (activeTab === 'spec' ? ' active' : '')} onClick={() => setActiveTab('spec')}>\u4e2d\u95f4 JSON</button>
                <button className={'tab-btn' + (activeTab === 'report' ? ' active' : '')} onClick={() => setActiveTab('report')}>\u635f\u5931\u62a5\u544a</button>
              </div>
              <button className="btn-secondary" onClick={handleDownload}>\u2b07 \u4e0b\u8f7d\u5168\u90e8\u7ed3\u679c</button>
            </div>

            {activeTab === 'output' && result.output_files.map((f, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.filename}</span>
                  <button className="btn-secondary" onClick={() => handleDownloadFile(f.filename, f.content)}>\u2b07 \u4e0b\u8f7d\u6587\u4ef6</button>
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
                  <h4>\u2705 \u5b8c\u6574\u4fdd\u7559 ({result.loss_report.preserved.length})</h4>
                  <ul>{result.loss_report.preserved.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="loss-card loss-partial">
                  <h4>\u26a0\ufe0f \u90e8\u5206\u4fdd\u7559 ({result.loss_report.partial.length})</h4>
                  <ul>{result.loss_report.partial.length ? result.loss_report.partial.map((x, i) => <li key={i}>{x}</li>) : <li>\u65e0</li>}</ul>
                </div>
                <div className="loss-card loss-lost">
                  <h4>\u274c \u65e0\u6cd5\u4fdd\u7559 ({result.loss_report.lost.length})</h4>
                  <ul>{result.loss_report.lost.length ? result.loss_report.lost.map((x, i) => <li key={i}>{x}</li>) : <li>\u65e0</li>}</ul>
                </div>
                <div className="loss-card loss-manual">
                  <h4>\ud83d\udd0d \u9700\u4eba\u5de5\u786e\u8ba4 ({result.loss_report.manual_check.length})</h4>
                  <ul>{result.loss_report.manual_check.length ? result.loss_report.manual_check.map((x, i) => <li key={i}>{x}</li>) : <li>\u65e0</li>}</ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!result && (
        <div className="card">
          <div className="empty-state">
            <div className="icon">\ud83d\udd04</div>
            <p>\u7c98\u8d34 SKILL.md \u5185\u5bb9\uff0c\u9009\u62e9\u76ee\u6807\u5e73\u53f0\uff0c\u70b9\u51fb\u201c\u5f00\u59cb\u8f6c\u6362\u201d</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;