interface DownloadButtonProps {
  result: {
    success: boolean
    spec: Record<string, unknown> | null
    output_files: Array<{ filename: string; content: string }>
    loss_report: {
      preserved: string[]
      partial: string[]
      lost: string[]
      manual_check: string[]
    }
  }
}

function DownloadButton({ result }: DownloadButtonProps) {
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'conversion-result.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!result.success) {
    return null
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <button onClick={handleDownload} style={{ padding: '0.75rem 1.5rem' }}>
        Download Result
      </button>
    </div>
  )
}

export default DownloadButton
