interface JsonPreviewProps {
  spec: Record<string, unknown> | null
}

function JsonPreview({ spec }: JsonPreviewProps) {
  if (!spec) {
    return (
      <div>
        <h2 style={{ marginBottom: '1rem' }}>中间JSON结构</h2>
        <pre style={{
          backgroundColor: '#f5f5f5',
          padding: '1rem',
          borderRadius: '4px',
          minHeight: '200px',
        }}>
          暂无数据
        </pre>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>中间JSON结构</h2>
      <pre style={{
        backgroundColor: '#f5f5f5',
        padding: '1rem',
        borderRadius: '4px',
        overflow: 'auto',
        maxHeight: '600px',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        fontSize: '13px',
      }}>
        {JSON.stringify(spec, null, 2)}
      </pre>
    </div>
  )
}

export default JsonPreview