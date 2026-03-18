import { useState } from 'react'
import { sb } from './config.js'
import { Card, Btn, FLabel, Inp } from './ui.jsx'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setErr(''); setLoading(true)
    if (mode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass })
      if (error) setErr(error.message); else onAuth()
    } else if (mode === 'signup') {
      const { error } = await sb.auth.signUp({ email, password: pass })
      if (error) setErr(error.message); else setMsg('Check your email to confirm, then sign in.')
    } else {
      const { error } = await sb.auth.resetPasswordForEmail(email)
      if (error) setErr(error.message); else setMsg('Reset email sent!')
    }
    setLoading(false)
  }

  const handleKey = e => { if (e.key === 'Enter') submit() }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div className="fade-in" style={{ width: 380, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 50, height: 50, background: 'linear-gradient(135deg,#00d4aa,#4ea8de)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 12px' }}>⬡</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34 }}>Folio</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '2px', marginTop: 2 }}>PORTFOLIO INTELLIGENCE · EUR</div>
        </div>
        <Card>
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--surface2)', borderRadius: 8, padding: 3 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(''); setMsg('') }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 6, background: mode === m ? 'var(--surface)' : 'transparent', color: mode === m ? 'var(--text)' : 'var(--muted)', fontFamily: 'Syne', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
          {err && <div style={{ background: '#2d0a12', border: '1px solid #ff4d6d44', borderRadius: 6, padding: '8px 12px', color: 'var(--red)', fontSize: 12, fontFamily: 'DM Mono', marginBottom: 12 }}>{err}</div>}
          {msg && <div style={{ background: '#0d2a1f', border: '1px solid #00d4aa44', borderRadius: 6, padding: '8px 12px', color: 'var(--accent)', fontSize: 12, fontFamily: 'DM Mono', marginBottom: 12 }}>{msg}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onKeyDown={handleKey}>
            <div><FLabel>Email</FLabel><Inp value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" /></div>
            {mode !== 'reset' && <div><FLabel>Password</FLabel><Inp value={pass} onChange={e => setPass(e.target.value)} placeholder="minimum 6 characters" type="password" /></div>}
          </div>
          <Btn label={loading ? '…' : mode === 'login' ? 'Sign In →' : mode === 'signup' ? 'Create Account →' : 'Send Reset Email'} variant="accent" onClick={submit} disabled={loading} style={{ width: '100%', marginTop: 14, padding: '11px' }} />
          {mode === 'login' && <button onClick={() => setMode('reset')} style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, fontFamily: 'DM Mono', cursor: 'pointer', textDecoration: 'underline' }}>Forgot password?</button>}
        </Card>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: 'var(--muted)', fontFamily: 'DM Mono', lineHeight: 1.8 }}>
          Data stored securely · Access from any device · No broker connection needed
        </div>
      </div>
    </div>
  )
}
