import { useState, ChangeEvent, FormEvent } from 'react'
import axios from 'axios'

interface InputFormProps {
  onResult: (result: any) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

function InputForm({ onResult, loading, setLoading }: InputFormProps) {
  const [sourcePlatform, setSourcePlatform] = useState('codex')
  const [targetPlatform, setTargetPlatform] = useState('claude')
  const [content, setContent] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post('/api/convert', {
        source_platform: sourcePlatform,
        target_platform: targetPlatform,
        input_type: 'markdown',
        content,
      })
      onResult(response.data)
    } catch (error: any) {
      if (error.response) {
        const detail = error.response.data.detail
        let errorMessage = '转换失败'
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => d.msg || d).join(', ')
        } else if (detail && detail.errors) {
          errorMessage = detail.errors.join(', ')
        }
        onResult({
          success: false,
          spec: null,
          output_files: [],
          loss_report: { preserved: [], partial: [], lost: [], manual_check: [] },
          error: errorMessage,
        })
      } else {
        onResult({
          success: false,
          spec: null,
          output_files: [],
          loss_report: { preserved: [], partial: [], lost: [], manual_check: [] },
          error: '网络错误: ' + (error.message || '未知错误'),
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>源平台</label>
          <select
            value={sourcePlatform}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSourcePlatform(e.target.value)}
            style={{ padding: '0.5rem', minWidth: '150px' }}
          >
            <option value="codex">Codex</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>目标平台</label>
          <select
            value={targetPlatform}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTargetPlatform(e.target.value)}
            style={{ padding: '0.5rem', minWidth: '150px' }}
          >
            <option value="claude">Claude</option>
            <option value="cursor">Cursor</option>
            <option value="copilot">GitHub Copilot</option>
            <option value="markdown">通用Markdown</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>SKILL.md 内容</label>
        <textarea
          value={content}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          placeholder="在此粘贴你的 SKILL.md 内容..."
          style={{
            width: '100%',
            minHeight: '300px',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !content.trim()}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          opacity: loading || !content.trim() ? 0.6 : 1,
        }}
      >
        {loading ? '转换中...' : '开始转换'}
      </button>
    </form>
  )
}

export default InputForm