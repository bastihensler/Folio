// ── Formatting helpers ────────────────────────────────────────────────────
// fmtE: formats a number as EUR — sign is prepended by caller if needed
export const fmtE = (n, dec = 2) => {
  const abs = Math.abs(n || 0).toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  return (n < 0 ? '-' : '') + '€' + abs
}
export const fmtN = (n, dec = 2) => (n || 0).toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
export const pct  = n => (n >= 0 ? '+' : '') + (n || 0).toFixed(2) + '%'

// ── UI Components ─────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', ...style }}>{children}</div>
}

export function SLabel({ text }) {
  return <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 }}>{text}</div>
}

export function Btn({ label, variant = 'ghost', onClick, disabled, style = {} }) {
  const base = { border: 'none', borderRadius: 8, padding: '9px 18px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'Syne', fontWeight: 600, opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', ...style }
  const v = variant === 'accent' ? { background: 'var(--accent)', color: '#080c10' }
           : variant === 'danger' ? { background: '#2d0a12', color: 'var(--red)', border: '1px solid #ff4d6d44' }
           : { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border2)' }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v }}>{label}</button>
}

export function FLabel({ children }) {
  return <label style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '1px', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{children}</label>
}

export function Inp({ value, onChange, type = 'text', placeholder = '', style = {} }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontFamily: 'DM Mono', fontSize: 12, outline: 'none', ...style }} />
}

export function Sel({ value, onChange, children }) {
  return <select value={value} onChange={onChange} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontFamily: 'DM Mono', fontSize: 12, outline: 'none' }}>{children}</select>
}

export function Modal({ title, onClose, children, width = 500 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }} onClick={onClose}>
      <div className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24, width, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const thS = { padding: '7px 8px', textAlign: 'left', fontSize: 9, color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '0.8px', fontWeight: 400, whiteSpace: 'nowrap' }

export function Td({ children, style = {} }) {
  return <td style={{ padding: '8px', fontFamily: 'DM Mono', fontSize: 12, ...style }}>{children}</td>
}
