const stubStyle = {
  minHeight: '50vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#8b8578',
  font: '600 14px "Plus Jakarta Sans"',
} as const

export default function ImpressionPage() {
  return <div style={stubStyle}>Sélection & impression — à câbler</div>
}
