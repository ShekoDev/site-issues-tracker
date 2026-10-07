import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, errText } from '../lib/supabase'
import { useApp } from '../state/AppContext'
import { usePeople } from '../lib/useTasks'
import { PageHeader } from '../components/Layout'
import {
  Card, Badge, Button, EmptyState, ErrorState, TableSkeleton, Icon
} from '../components/ui'
import { dtstr, ago } from '../lib/format'
import { ROLE_LABEL } from '../lib/i18n'

const PAGE = 60

export default function Activity() {
  const { t, lang } = useApp()
  const people = usePeople()
  const [feed, setFeed] = useState(null)
  const [online, setOnline] = useState([])
  const [err, setErr] = useState('')
  const [who, setWho] = useState('')
  const [kind, setKind] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true); setErr('')
    let q = db.from('v_activity_feed').select('*').order('created_at', { ascending: false }).limit(limit)
    if (who) q = q.eq('profile_id', who)
    if (kind) q = q.eq('source', kind)
    const [a, b] = await Promise.all([q, db.from('v_online_now').select('*')])
    if (a.error) setErr(errText(a.error))
    setFeed(a.data || []); setOnline(b.data || []); setBusy(false)
  }, [who, kind, limit])

  useEffect(() => { load() }, [load])

  return (
    <>
      <PageHeader title={t('activity')} crumbs={[{ label: 'الإدارة' }, { label: t('activity') }]}>
        <Button variant="ghost" size="sm" icon="refresh" onClick={load} loading={busy} aria-label="تحديث" />
      </PageHeader>

      <div className="page">
        <Card title={t('online')} meta={online.length ? String(online.length) : ''} className="section">
          {online.length === 0
            ? <EmptyState icon="clock" title="مفيش حد على النظام دلوقتي"
                          description="بيظهر هنا كل مَن كان نشطًا خلال آخر ١٥ دقيقة." />
            : (
              <div className="row wrapf" style={{ gap: 8 }}>
                {online.map(u => (
                  <span key={u.id} className="badge badge-success">
                    <i className="dot" />{u.name_ar}
                    <span className="mono t-xs" style={{ opacity: .8 }}>
                      {ago(u.last_action_at || u.last_login_at, lang)}
                    </span>
                  </span>
                ))}
              </div>
            )}
        </Card>

        <div className="toolbar section noprint">
          <select value={who} onChange={e => { setWho(e.target.value); setLimit(PAGE) }} aria-label="المستخدم">
            <option value="">كل المستخدمين</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
          </select>
          <div className="filter-group" role="group" aria-label="نوع الحدث">
            <button className={'chip' + (kind === '' ? ' on' : '')} onClick={() => setKind('')}>الكل</button>
            <button className={'chip' + (kind === 'task' ? ' on' : '')} onClick={() => setKind('task')}>
              <Icon name="list" size={13} />تغييرات البنود
            </button>
            <button className={'chip' + (kind === 'auth' ? ' on' : '')} onClick={() => setKind('auth')}>
              <Icon name="key" size={13} />الدخول والخروج
            </button>
          </div>
        </div>

        {err ? <div className="card"><ErrorState description={err} onRetry={load} /></div>
          : !feed ? <TableSkeleton rows={8} cols={5} />
            : feed.length === 0
              ? <div className="card"><EmptyState icon="activity" title="لا يوجد نشاط مطابق"
                  description="غيّر الفلاتر أو انتظر أول إجراء يتسجّل." /></div>
              : (
                <>
                  <div className="table-wrap">
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 150 }}>{t('when')}</th>
                            <th style={{ width: 170 }}>{t('actor')}</th>
                            <th>{t('what')}</th>
                            <th>{t('item')}</th>
                            <th>التفاصيل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feed.map(r => (
                            <tr key={`${r.source}-${r.event_id}`}>
                              <td className="nw">
                                <span className="mono t-xs">{dtstr(r.created_at)}</span>
                                <div className="t-xs tx-4">{ago(r.created_at, lang)}</div>
                              </td>
                              <td className="nw t-sm">
                                {r.actor_name || '—'}
                                <div className="t-xs tx-3">{ROLE_LABEL[lang][r.actor_role] || r.actor_role}</div>
                              </td>
                              <td className="nw">
                                <Badge tone={r.source === 'auth' ? 'brand' : 'neutral'}>{r.action_text}</Badge>
                              </td>
                              <td style={{ minWidth: 200 }}>
                                {r.task_id ? (
                                  <Link to={`/tasks/${r.task_id}`}>
                                    <span className="cell-title truncate">{r.task_title}</span>
                                    <span className="cell-meta"><span className="code-chip">{r.task_id}</span></span>
                                  </Link>
                                ) : <span className="tx-4">—</span>}
                              </td>
                              <td className="t-sm tx-2">
                                {r.old_value || r.new_value
                                  ? <span className="mono t-xs">{r.old_value ?? '—'} ← {r.new_value ?? '—'}</span>
                                  : <span className="tx-4">—</span>}
                                {r.reason && <div className="t-xs">{r.reason}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {feed.length >= limit && (
                    <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
                      <Button variant="secondary" onClick={() => setLimit(l => l + PAGE)} loading={busy}>
                        عرض المزيد
                      </Button>
                    </div>
                  )}
                </>
              )}
      </div>
    </>
  )
}
