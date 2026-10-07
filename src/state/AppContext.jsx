import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db, configured, errText } from '../lib/supabase'
import { L } from '../lib/i18n'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [booting, setBooting] = useState(true)
  const [authError, setAuthError] = useState('')
  const [lang, setLang] = useState(() => localStorage.getItem('sit_lang') || 'ar')
  const [theme, setTheme] = useState(() => localStorage.getItem('sit_theme') || '')
  const [settings, setSettings] = useState({})

  /* ---------- اللغة والمظهر ---------- */
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl'
    localStorage.setItem('sit_lang', lang)
  }, [lang])

  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme)
    else document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('sit_theme', theme)
  }, [theme])

  /* ---------- الملف الشخصي ---------- */
  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return }
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('auth_id', uid)
      .maybeSingle()
    if (error) { setAuthError(errText(error)); setProfile(null); return }
    if (!data) { setAuthError(L[lang].noProfile); setProfile(null); return }
    setProfile(data)
    if (data.language && data.language !== localStorage.getItem('sit_lang')) setLang(data.language)
  }, [lang])

  /* ---------- الجلسة ---------- */
  useEffect(() => {
    if (!configured) { setBooting(false); return }
    let alive = true
    db.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setBooting(false)
    })
    const { data: sub } = db.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) await loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [loadProfile])

  /* ---------- الإعدادات العامة ---------- */
  useEffect(() => {
    if (!profile) return
    db.from('app_settings').select('key,value').then(({ data }) => {
      if (data) setSettings(Object.fromEntries(data.map(r => [r.key, r.value])))
    })
  }, [profile])

  /* ---------- الدخول والخروج ---------- */
  async function signIn(email, password) {
    setAuthError('')
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return errText(error)
    // تسجيل الدخول في login_events — بدونها يفضل login_count صفر
    await db.rpc('record_login', {
      p_user_agent: navigator.userAgent.slice(0, 400),
      p_platform: 'web'
    }).catch(() => {})
    return null
  }

  async function signOut() {
    await db.rpc('record_logout').catch(() => {})
    await db.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  /* ---------- مساعدات ---------- */
  const t = k => (L[lang][k] ?? k)
  const can = p => Boolean(profile?.permissions?.[p])
  const isAdmin = profile?.role === 'admin'
  const nameOf = u => (lang === 'en' ? (u?.name_en || u?.name_ar) : u?.name_ar) || '—'

  const value = {
    configured, session, profile, booting, authError, setAuthError,
    lang, setLang, theme, setTheme, settings, setSettings,
    t, can, isAdmin, nameOf, signIn, signOut, reloadProfile: () => loadProfile(session?.user?.id)
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
