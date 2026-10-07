import { useEffect, useState } from 'react'
import { db, errText } from '../lib/supabase'
import { useApp } from '../state/AppContext'
import { usePeople } from '../lib/useTasks'
import { PageHeader } from '../components/Layout'
import {
  Kpi, Badge, Button, Bar, EmptyState, ErrorState, TableSkeleton, Icon
} from '../components/ui'
import { money, dtstr } from '../lib/format'

/**
 * التقارير تُبنى كصفحة قابلة للطباعة — زر «طباعة / حفظ PDF» يفتح حوار
 * الطباعة ومنه Save as PDF. يحافظ على العربية RTL وتشكيل الحروف بلا
 * مكتبة PDF إضافية.
 */
export default function Reports() {
  const { t, can, profile, nameOf } = useApp()
  const people = usePeople()
  const [scope, setScope] = useState('all')
  const [person, setPerson] = useState('')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    setRows(null); setErr('')
    let q = db.from('v_tasks_visible').select('*').order('sn')
    if (scope === 'user' && person) q = q.or(`assigned_to.eq.${person},co_assignee.eq.${person}`)
    q.then(({ data, error }) => {
      if (error) setErr(errText(error))
      setRows(data || [])
    })
  }, [scope, person])

  const who = people.find(p => p.id === person)
  const title = scope === 'user' && who ? `تقرير المسؤول — ${who.name_ar}` : 'تقرير شامل — بنود Site Tracker'

  const sum = (rows || []).reduce((a, x) => ({
    est: a.est + Number(x.estimated_cost || 0),
    act: a.act + Number(x.actual_cost || 0),
    prog: a.prog + x.progress,
    done: a.done + (x.status === 'completed' ? 1 : 0),
    over: a.over + (x.is_overdue ? 1 : 0)
  }), { est: 0, act: 0, prog: 0, done: 0, over: 0 })
  const avg = rows?.length ? Math.round(sum.prog / rows.length) : 0
  const needsPerson = scope === 'user' && !person

  return (
    <>
      <PageHeader title={t('reports')} crumbs={[{ label: 'الإدارة' }, { label: t('reports') }]}>
        <Button variant="primary" size="sm" icon="print" onClick={() => window.print()}
                disabled={!rows?.length}>{t('printReport')}</Button>
      </PageHeader>

      <div className="page">
        <div className="toolbar section noprint">
          <div className="segment" role="group" aria-label="نوع التقرير">
            <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>تقرير شامل</button>
            <button className={scope === 'user' ? 'on' : ''} onClick={() => setScope('user')}>تقرير مسؤول</button>
          </div>
          {scope === 'user' && (
            <select value={person} onChange={e => setPerson(e.target.value)} aria-label="اختر المسؤول">
              <option value="">اختر المسؤول…</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
            </select>
          )}
          <span className="spacer" />
          <span className="t-sm tx-3 noprint">
            <Icon name="info" size={13} style={{ display: 'inline', verticalAlign: '-2px', marginInlineEnd: 4 }} />
            اطبع واختر «Save as PDF»
          </span>
        </div>

        {err ? <div className="card"><ErrorState description={err} /></div>
          : needsPerson
            ? <div className="card"><EmptyState icon="users" title="اختر المسؤول"
                description="حدد المسؤول من القائمة فوق لعرض تقريره." /></div>
            : !rows ? <TableSkeleton rows={8} cols={6} />
              : (
                <div id="report">
                  <header style={{ borderBottom: '2px solid var(--line)', paddingBottom: 16, marginBottom: 20 }}>
                    <div className="eyebrow">Site Tracker · شركة تجريبية</div>
                    <h2 className="t-xl" style={{ marginTop: 6 }}>{title}</h2>
                    <div className="t-xs tx-3" style={{ marginTop: 6 }}>
                      {t('generatedAt')}: <span className="mono">{dtstr(new Date())}</span>
                      {' · '}{t('preparedFor')}: {nameOf(profile)}
                    </div>
                  </header>

                  <div className="kpis kpis-sub section">
                    <Kpi label={t('total')} value={rows.length} />
                    <Kpi label={t('completed')} value={sum.done} tone={sum.done ? 'success' : undefined} />
                    <Kpi label={t('avgProg')} value={`${avg}%`} />
                    <Kpi label={t('overdue')} value={sum.over} tone={sum.over ? 'danger' : undefined} />
                    {can('canViewCost') && <Kpi label={t('estCost')} value={money(sum.est)} sub={t('sar')} />}
                    {can('canViewCost') && <Kpi label={t('actCost')} value={money(sum.act)} sub={t('sar')} />}
                  </div>

                  {rows.length === 0
                    ? <div className="card"><EmptyState icon="inbox" title="لا توجد بنود في هذا التقرير" /></div>
                    : (
                      <div className="table-wrap">
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th style={{ width: 42 }}>#</th>
                                <th>{t('item')}</th>
                                <th>{t('priority')}</th>
                                <th>{t('status')}</th>
                                <th>{t('assignee')}</th>
                                <th style={{ width: 130 }}>{t('progress')}</th>
                                {can('canViewCost') && <th>{t('estCost')}</th>}
                                {can('canViewCost') && <th>{t('actCost')}</th>}
                                <th>{t('due')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(x => (
                                <tr key={x.id}>
                                  <td className="mono t-xs tx-3">{x.sn}</td>
                                  <td style={{ minWidth: 250 }}>
                                    <span className="cell-title">{x.title_ar}</span>
                                    <span className="cell-meta">
                                      <span className="code-chip">{x.id}</span>
                                      <span className="t-xs tx-3">{x.category}</span>
                                    </span>
                                  </td>
                                  <td className="nw"><Badge tone={x.priority === 'critical' ? 'danger'
                                    : x.priority === 'high' ? 'warning'
                                      : x.priority === 'medium' ? 'brand' : 'neutral'}>{t(x.priority)}</Badge></td>
                                  <td className="nw"><Badge tone={x.status === 'completed' ? 'success'
                                    : x.status === 'in_progress' ? 'brand'
                                      : x.status === 'on_hold' ? 'warning' : 'neutral'}>{t(x.status)}</Badge></td>
                                  <td className="nw t-sm">{x.assignee_name || '—'}</td>
                                  <td className="nw">
                                    <div className="progress-cell">
                                      <Bar value={x.progress} done={x.progress === 100} />
                                      <span className="pct">{x.progress}%</span>
                                    </div>
                                    <span className="mono t-xs tx-3">{x.steps_done}/{x.steps_total}</span>
                                  </td>
                                  {can('canViewCost') && <td className="mono nw t-sm">{money(x.estimated_cost)}</td>}
                                  {can('canViewCost') && <td className="mono nw t-sm">{money(x.actual_cost)}</td>}
                                  <td className="mono nw t-sm"
                                      style={{ color: x.is_overdue ? 'var(--da)' : undefined }}>
                                    {x.due_date || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  <footer className="t-xs tx-3" style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    مستخرج آليًا من نظام متابعة بنود الموقع — البيانات لحظية وقت الإصدار.
                  </footer>
                </div>
              )}
      </div>
    </>
  )
}
