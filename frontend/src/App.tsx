import { useState } from 'react'
import InputForm from './components/InputForm'
import JsonPreview from './components/JsonPreview'
import LossReport from './components/LossReport'
import DownloadButton from './components/DownloadButton'

interface ConvertResult {
  success: boolean
  spec: Record<string, unknown> | null
  output_files: Array<{ filename: string; content: string }>
  loss_report: {
    preserved: string[]
    partial: string[]
    lost: string[]
    manual_check: string[]
  }
  error?: string
}

function App() {
  const [result, setResult] = useState<ConvertResult | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Agent Skill Converter</h1>

      <InputForm
        onResult={setResult}
        loading={loading}
        setLoading={setLoading}
      />

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <JsonPreview spec={result.spec} />
            <div>
              <h2 style={{ marginBottom: '1rem' }}>Converted Output</h2>
              {result.output_files.map((file, idx) => (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                  <h3>{file.filename}</h3>
                  <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '400px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                  }}>
                    {file.content}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          <LossReport report={result.loss_report} />

          <DownloadButton result={result} />
        </div>
      )}
    </div>
  )
}

export default App
