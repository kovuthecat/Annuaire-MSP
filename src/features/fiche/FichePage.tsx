const stubStyle = {
  minHeight: '50vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#8b8578',
  font: '600 14px "Plus Jakarta Sans"',
} as const

export default function FichePage() {
  return <div style={stubStyle}>Fiche détail — à câbler</div>
}
