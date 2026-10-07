import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { db } from '../lib/supabase'
import { ROLE_LABEL } from '../lib/i18n'
import { useIsMobile } from '../lib/useMedia'
import Icon from './Icon'
import { Button } from './ui'

const initials = name => (name || '?').replace(/^م\.\s*/, '').trim().charAt(0)

const SidebarCtx = createContext({ open: false, setOpen: () => {} })
export const useSidebar = () => useContext(SidebarCtx)

export default function Layout() {
  const { t, lang, setLang, theme, setTheme, profile, signOut, can, isAdmin, nameOf } = useApp()
  const loc = useLocation()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ all: '', mine: '', attention: '' })

  // إغلاق القائمة عند تغيير الصفحة أو الخروج من الموبايل
  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => { if (!isMobile) setOpen(false) }, [isMobile])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!profile) return
    let alive = true
    ;(async () => {
      const [all, mine, att] = await Promise.all([
        db.from('v_tasks_visible').select('id', { count: 'exact', head: true }),
        db.from('v_tasks_visible').select('id', { count: 'exact', head: true })
          .or(`assigned_to.eq.${profile.id},co_assignee.eq.${profile.id}`),
        db.from('v_attention').select('id', { count: 'exact', head: true })
      ])
      if (alive) setCounts({ all: all.count ?? '', mine: mine.count ?? '', attention: att.count ?? '' })
    })()
    return () => { alive = false }
  }, [profile, loc.pathname])

  const groups = [
    {
      label: 'المتابعة',
      items: [
        ['/', 'dashboard', t('dashboard'), can('canViewAllTasks'), ''],
        ['/tasks', 'list', t('all'), can('canViewAllTasks'), counts.all],
        ['/mine', 'checks', t('mine'), true, counts.mine],
        ['/attention', 'alert', t('attention'), can('canViewAllTasks'), counts.attention]
      ]
    },
    {
      label: 'الإدارة',
      items: [
        ['/users', 'users', t('users'), can('canManageUsers') || isAdmin, ''],
        ['/activity', 'activity', t('activity'), can('canViewHistory'), ''],
        ['/reports', 'report', t('reports'), can('canGenerateReports'), ''],
        ['/settings', 'settings', t('settings'), can('canManageSettings'), '']
      ]
    }
  ].map(g => ({ ...g, items: g.items.filter(i => i[3]) })).filter(g => g.items.length)

  const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <SidebarCtx.Provider value={{ open, setOpen }}>
    <div className="shell">
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={`sidebar ${open ? 'open' : ''}`} id="sidebar"
             aria-hidden={isMobile && !open ? 'true' : undefined}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">CR</span>
          <span className="brand-text">
            <b>{t('appName')}</b>
            <span>{t('company')}</span>
          </span>
        </div>

        <nav aria-label="التنقّل الرئيسي">
          {groups.map(g => (
            <div key={g.label} className="nav">
              <div className="nav-label">{g.label}</div>
              {g.items.map(([to, icon, label, , n]) => (
                <NavLink key={to} to={to} end={to === '/'}
                         className={({ isActive }) => 'nav-item' + (isActive ? ' on' : '')}>
                  <Icon name={icon} size={17} />
                  <span>{label}</span>
                  <span className="n-count">{n !== '' ? n : ''}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <div className="user-box">
            <span className="avatar" aria-hidden="true">{initials(nameOf(profile))}</span>
            <span className="u-txt">
              <b>{nameOf(profile)}</b>
              <span>{ROLE_LABEL[lang][profile?.role] || profile?.role}</span>
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                    style={{ flex: 1 }}>{t('lang')}</Button>
            <Button variant="ghost" size="sm" icon={dark ? 'sun' : 'moon'}
                    aria-label={dark ? t('light') : t('dark')}
                    onClick={() => setTheme(dark ? 'light' : 'dark')} />
          </div>
          <Button variant="ghost" size="sm" icon="logout" onClick={signOut}>{t('logout')}</Button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
    </SidebarCtx.Provider>
  )
}

/**
 * رأس الصفحة — يعرض مسار التنقّل والعنوان والإجراء الأساسي،
 * وزرّ القائمة على الموبايل.
 */
export function PageHeader({ title, crumbs, children }) {
  const isMobile = useIsMobile()
  const { open, setOpen } = useSidebar()
  return (
    <header className="header noprint">
      {isMobile && (
        <button className="btn btn-ghost btn-icon burger" aria-label="فتح القائمة"
                aria-controls="sidebar" aria-expanded={open}
                onClick={() => setOpen(true)}>
          <Icon name="menu" size={18} />
        </button>
      )}
      <div className="h-titles">
        {crumbs?.length > 0 && (
          <nav className="crumbs" aria-label="مسار التنقّل">
            {crumbs.map((c, i) => (
              <span key={i} className="row" style={{ gap: 5 }}>
                {i > 0 && <Icon name="chevronStart" size={11} />}
                {c.to ? <NavLink to={c.to}>{c.label}</NavLink> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate">{title}</h1>
      </div>
      {children && <div className="h-actions">{children}</div>}
    </header>
  )
}
