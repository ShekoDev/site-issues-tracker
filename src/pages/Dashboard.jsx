import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, errText } from '../lib/supabase'
import { useApp } from '../state/AppContext'
import { PageHeader } from '../components/Layout'
import {
  Card, Kpi, BarList, StackBar, ErrorState, EmptyState, Skeleton, Button, Icon, Badge
} from '../components/ui'
import { money } from '../lib/format'

const STATUS_COLOR = {
  completed: 'var(--su)', in_progress: 'var(--brand)',
  pending: 'var(--tx-4)', on_hold: 'var(--wa)'
}

function KpiSkeleton({ n = 4, hero }) {
  return (
    <div className={`kpis ${hero ? 'kpis-hero' : 'kpis-sub'}`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="kpi">
          <Skeleton w={70} h={11} />
          <Skeleton w={54} h={hero ? 30 : 24} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { t, can, nameOf, profile } = useApp()
  const [d, setD] = useState(null)
  const [load, setLoad] = useState([])
  const [cats, setCats] = useState([])
  const [att, setAtt] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(true)

  const fetchAll = useCallback(async () => {
    setBusy(true); setErr('')
    const [a, b, c, e] = await Promise.all([
      db.from('v_dashboard').select('*').maybeSingle(),
      db.from('v_user_load').select('*').order('tasks_total', { ascending: false }),
      db.from('v_category_progress').select('*'),
      db.from('v_attention').select('*').limit(8)
    ])
    const bad = [a, b, c, e].find(r => r.error)
    if (bad) { setErr(errText(bad.error)); setBusy(false); return }
    setD(a.data); setLoad((b.data || []).filter(r => r.tasks_total > 0))
    setCats(c.data || []); setAtt(e.data || []); setBusy(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء الخير'

  return (
    <>
      <PageHeader title={t('dashboard')}>
        <Button variant="ghost" size="sm" icon="refresh" onClick={fetchAll}
                aria-label="تحديث البيانات" loading={busy && Boolean(d)} />
      </PageHeader>

      <div className="page">
        {err ? <div className="card"><ErrorState description={err} onRetry={fetchAll} /></div> : (
          <>
            <div className="section">
              <div className="section-head">
                <h2>{greet}، {nameOf(profile)?.replace(/^م\.\s*/, '')}</h2>
                <span className="s-meta">نظرة سريعة على حالة المشروع</span>
              </div>

              {!d ? <KpiSkeleton hero n={3} /> : (
                <div className="kpis kpis-hero">
                  <Kpi hero label="إجمالي البنود" value={d.total} icon="list"
                       sub={`${d.completed} منجزة · ${d.in_progress} جارية`} />
                  <Kpi hero label={t('avgProg')} value={`${d.avg_progress}%`} icon="activity"
                       sub="متوسط إنجاز البنود كلها" />
                  <Kpi hero label="تحتاج انتباه" value={d.overdue + d.without_due_date} icon="alert"
                       tone={(d.overdue + d.without_due_date) > 0 ? 'warning' : undefined}
                       sub={`${d.overdue} متأخر · ${d.without_due_date} بلا تاريخ`} />
                </div>
              )}
            </div>

            <div className="section">
              {!d ? <KpiSkeleton n={5} /> : (
                <div className="kpis kpis-sub">
                  <Kpi label={t('completed')} value={d.completed} tone={d.completed ? 'success' : undefined} />
                  <Kpi label={t('in_progress')} value={d.in_progress} />
                  <Kpi label={t('pending')} value={d.pending} />
                  <Kpi label={t('on_hold')} value={d.on_hold} tone={d.on_hold ? 'warning' : undefined} />
                  {can('canViewCost') &&
                    <Kpi label={t('estCost')} value={money(d.total_estimated)} sub={t('sar')} />}
                </div>
              )}
            </div>

            <div className="grid g-2-1 section">
              <Card title={t('attention')} meta={att.length ? String(att.length) : ''}
                    actions={<Link to="/attention" className="btn btn-ghost btn-sm">الكل</Link>}>
                {busy ? <><Skeleton /><Skeleton /><Skeleton /></>
                  : att.length === 0
                    ? <EmptyState icon="checkCircle" title="لا شيء عاجل"
                                  description="مفيش بنود متأخرة أو قريبة الاستحقاق دلوقتي." />
                    : att.map(x => (
                      <Link key={x.id} to={`/tasks/${x.id}`} className="attn-row">
                        <span className="code-chip">{x.id}</span>
                        <span className="t">{x.title_ar}</span>
                        <Badge tone={x.flag === 'متأخر' ? 'danger' : 'warning'}>{x.flag}</Badge>
                      </Link>
                    ))}
              </Card>

              <Card title={t('statusDist')} meta={d ? String(d.total) : ''}>
                {!d ? <Skeleton h={28} /> : (
                  <StackBar parts={[
                    { label: t('completed'), value: d.completed, color: STATUS_COLOR.completed },
                    { label: t('in_progress'), value: d.in_progress, color: STATUS_COLOR.in_progress },
                    { label: t('pending'), value: d.pending, color: STATUS_COLOR.pending },
                    { label: t('on_hold'), value: d.on_hold, color: STATUS_COLOR.on_hold }
                  ]} />
                )}
              </Card>
            </div>

            <div className="grid g-2">
              <Card title={t('byPerson')} meta={load.length ? String(load.length) : ''}>
                {busy ? <><Skeleton /><Skeleton /><Skeleton /></>
                  : load.length === 0
                    ? <EmptyState icon="users" title="لا توجد بنود مُسنَدة بعد" />
                    : <BarList rows={load.map(u => ({
                        label: u.name_ar,
                        value: u.tasks_total,
                        note: `${u.tasks_completed}/${u.tasks_total}`
                      }))} />}
              </Card>

              <Card title={t('byCat')} meta={cats.length ? String(cats.length) : ''}>
                {busy ? <><Skeleton /><Skeleton /><Skeleton /></>
                  : <BarList max={100} rows={cats.map(c => ({
                      label: c.category,
                      value: c.avg_progress,
                      note: `${c.avg_progress}% · ${c.tasks_total}`
                    }))} />}
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  )
}
