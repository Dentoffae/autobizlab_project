import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AnimatedBg from '../components/AnimatedBg'
import { useLang } from '../context/LangContext'
import { adminPathForLang, homePathForLang } from '../utils/localePaths'
import { apiUrl } from '../constants/api'
import { readApiErrorMessage, readApiOtpRequired } from '../utils/apiErrors'
import './login.css'

export default function Login() {
  const navigate = useNavigate()
  const { lang, ta } = useLang()
  const L = ta.login

  const [mode, setMode] = useState('login')
  const [hasAdmins, setHasAdmins] = useState(true)
  const [checking, setChecking] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [otpRequired, setOtpRequired] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const adminHome = adminPathForLang(lang)
  const siteHome = homePathForLang(lang)

  useEffect(() => {
    fetch(apiUrl('/auth/me'), { credentials: 'include' })
      .then(r => {
        if (r.ok) navigate(adminHome, { replace: true })
      })
      .catch(() => {})
    fetch(apiUrl('/auth/has-admins'), { credentials: 'omit' })
      .then(r => r.json())
      .then(data => {
        setHasAdmins(data.has_admins)
        if (!data.has_admins) setMode('register')
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [navigate, adminHome])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError(L.fillBoth)
      return
    }
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? apiUrl('/auth/login') : apiUrl('/auth/register')
      const body = { username: username.trim(), password }
      if (mode === 'login') {
        const c = totpCode.trim().replace(/\s+/g, '')
        if (c) body.totp_code = c
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const otp = readApiOtpRequired(data)
        if (mode === 'login' && otp && typeof otp === 'object' && otp.otp_required) {
          setOtpRequired(true)
          setError(otp.message || L.otpRequired)
          return
        }
        const msg = readApiErrorMessage(data, L.serverErr)
        setError(msg || L.serverErr)
        return
      }
      navigate(adminPathForLang(lang), { replace: true })
    } catch {
      setError(L.networkErr)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <>
        <AnimatedBg />
        <div className="login-page">
          <div className="login-spinner-wrap"><div className="spinner" /></div>
        </div>
      </>
    )
  }

  return (
    <>
      <AnimatedBg />
      <div className="login-page">
        <div className="login-card card">
          <div className="login-logo">
            <Link to={siteHome} className="back-link login-back">{L.backSite}</Link>
            <div className="login-badge">ADMIN</div>
          </div>

          <h1 className="login-title">{L.title}</h1>
          <p className="login-sub">
            {mode === 'login' ? L.subLogin : L.subRegister}
          </p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="field-label">{L.username}</label>
              <input
                className="field-input"
                type="text"
                placeholder={L.usernamePh}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="login-field">
              <label className="field-label">{L.password}</label>
              <input
                className="field-input"
                type="password"
                placeholder={L.passwordPh}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {mode === 'login' && otpRequired && (
              <div className="login-field">
                <label className="field-label">{L.totpLabel}</label>
                <input
                  className="field-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={L.totpPh}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\s+/g, ''))}
                />
              </div>
            )}

            {mode === 'register' && (
              <p className="login-hint" style={{ marginBottom: 0 }}>{L.passwordRules}</p>
            )}

            {error && <p className="login-error">{error}</p>}

            <button className="btn-save login-btn" type="submit" disabled={loading}>
              {loading
                ? L.wait
                : mode === 'login' ? L.signIn : L.signUp}
            </button>
          </form>

          {!hasAdmins && mode === 'login' && (
            <button className="login-toggle" onClick={() => { setMode('register'); setError(''); setOtpRequired(false); setTotpCode('') }}>
              {L.switchRegister}
            </button>
          )}
          {mode === 'register' && hasAdmins && (
            <button className="login-toggle" onClick={() => { setMode('login'); setError(''); setOtpRequired(false); setTotpCode('') }}>
              {L.switchLogin}
            </button>
          )}
          {mode === 'register' && !hasAdmins && (
            <p className="login-hint">{L.firstAdminHint}</p>
          )}
        </div>
      </div>
    </>
  )
}
