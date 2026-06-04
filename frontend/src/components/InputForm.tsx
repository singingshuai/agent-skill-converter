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
        onResult({
          success: false,
          spec: null,
          output_files: [],
          loss_report: { preserved: [], partial: [], lost: [], manual_check: [] },
          error: error.response.data.detail || 'Conversion failed',
        })
      } else {
        onResult({
          success: false,
          spec: null,
          output_files: [],
          loss_report: { preserved: [], partial: [], lost: [], manual_check: [] },
          error: 'Network error',
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
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Source Platform</label>
          <select
            value={sourcePlatform}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSourcePlatform(e.target.value)}
            style={{ padding: '0.5rem', minWidth: '150px' }}
          >
            <option value="codex">Codex</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Target Platform</label>
          <select
            value={targetPlatform}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTargetPlatform(e.target.value)}
            style={{ padding: '0.5rem', minWidth: '150px' }}
          >
            <option value="claude">Claude</option>
            <option value="cursor">Cursor</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>SKILL.md Content</label>
        <textarea
          value={content}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          placeholder="Paste your SKILL.md content here..."
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
        {loading ? 'Converting...' : 'Convert'}
      </button>
    </form>
  )
}

export default InputForm
