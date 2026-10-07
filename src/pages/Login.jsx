import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { Alert, Button, Field } from '../components/ui'

export default function Login() {
  const { t, signIn, session, configured, booting, lang, setLang } = useApp()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [touched, setTouched] = useState(false)

  if (booting) return <div className="auth"><span className="sk" style={{ width: 34, height: 34, borderRadius: 999 }} /></div>
  if (session) return <Navigate to="/" replace />

  const emailErr = touched && !email.trim() ? 'اكتب بريدك الإلكتروني' : ''
  const pwErr = touched && !pw ? 'اكتب كلمة المرور' : ''

  async function submit(e) {
    e.preventDefault()
    setTouched(true)
    if (!email.trim() || !pw) return
    setBusy(true); setErr('')
    const msg = await signIn(email, pw)
    setBusy(false)
    if (msg) setErr(msg)
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">CR</span>
          <div>
            <h1>{t('appName')}</h1>
            <p>{t('company')}</p>
          </div>
        </div>

        {!configured && <Alert tone="warning" title="النظام غير مربوط بقاعدة البيانات">{t('noConfig')}</Alert>}
        {err && <Alert tone="danger" title="تعذّر تسجيل الدخول">{err}</Alert>}

        <Field label={t('email')} required error={emailErr}>
          {id => (
            <input id={id} type="email" dir="ltr" autoComplete="username" inputMode="email"
                   className={emailErr ? 'input-err' : ''} placeholder="name@tracker.local"
                   value={email} onChange={e => setEmail(e.target.value)} />
          )}
        </Field>

        <Field label={t('password')} required error={pwErr}>
          {id => (
            <input id={id} type="password" dir="ltr" autoComplete="current-password"
                   className={pwErr ? 'input-err' : ''}
                   value={pw} onChange={e => setPw(e.target.value)} />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" className="btn-block"
                loading={busy} disabled={!configured}>
          {t('signIn')}
        </Button>

        <div className="auth-foot">
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            {t('lang')}
          </Button>
        </div>
      </form>
    </div>
  )
}
