interface LossReportProps {
  report: {
    preserved: string[]
    partial: string[]
    lost: string[]
    manual_check: string[]
  }
}

function LossReport({ report }: LossReportProps) {
  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Conversion Loss Report</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={{ backgroundColor: '#d4edda', padding: '1rem', borderRadius: '4px' }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#155724' }}>Preserved</h3>
          <ul style={{ listStyle: 'none' }}>
            {report.preserved.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>? {item}</li>
            ))}
            {report.preserved.length === 0 && <li>None</li>}
          </ul>
        </div>

        <div style={{ backgroundColor: '#fff3cd', padding: '1rem', borderRadius: '4px' }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#856404' }}>Partial</h3>
          <ul style={{ listStyle: 'none' }}>
            {report.partial.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>? {item}</li>
            ))}
            {report.partial.length === 0 && <li>None</li>}
          </ul>
        </div>

        <div style={{ backgroundColor: '#f8d7da', padding: '1rem', borderRadius: '4px' }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#721c24' }}>Lost</h3>
          <ul style={{ listStyle: 'none' }}>
            {report.lost.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>? {item}</li>
            ))}
            {report.lost.length === 0 && <li>None</li>}
          </ul>
        </div>

        <div style={{ backgroundColor: '#d1ecf1', padding: '1rem', borderRadius: '4px' }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#0c5460' }}>Manual Check</h3>
          <ul style={{ listStyle: 'none' }}>
            {report.manual_check.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>?? {item}</li>
            ))}
            {report.manual_check.length === 0 && <li>None</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default LossReport
