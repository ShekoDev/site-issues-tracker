import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, errText } from '../lib/supabase'
import { useApp } from '../state/AppContext'
import { PageHeader } from '../components/Layout'
import { Card, Bar, Badge, EmptyState, ErrorState, TableSkeleton, Button } from '../components/ui'

const GROUPS = [
  { flag: 'متأخر', tone: 'danger', hint: 'تجاوزت تاريخ التسليم' },
  { flag: 'يستحق خلال 7 أيام', tone: 'warning', hint: 'قرب موعد التسليم' },
  { flag: 'بلا تاريخ تسليم', tone: 'neutral', hint: 'محتاجة تحديد تاريخ' }
]

export default function Attention() {
  const { t } = useApp()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setErr('')
    db.from('v_attention').select('*').then(({ data, error }) => {
      if (error) setErr(errText(error))
      setRows(data || [])
    })
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <>
      <PageHeader title={t('attention')}
                  crumbs={[{ label: t('dashboard'), to: '/' }, { label: t('attention') }]}>
        <Button variant="ghost" size="sm" icon="refresh" onClick={load} aria-label="تحديث" />
      </PageHeader>

      <div className="page">
        {err ? <div className="card"><ErrorState description={err} onRetry={load} /></div>
          : !rows ? <TableSkeleton rows={5} />
            : rows.length === 0
              ? <div className="card"><EmptyState icon="checkCircle" title="كل شيء تحت السيطرة"
                  description="مفيش بنود متأخرة ولا قريبة الاستحقاق ولا بلا تاريخ تسليم." /></div>
              : GROUPS.map(g => {
                const list = rows.filter(r => r.flag === g.flag)
                if (!list.length) return null
                return (
                  <Card key={g.flag} className="section"
                        title={<span className="row" style={{ gap: 8 }}>
                          <Badge tone={g.tone}>{g.flag}</Badge>
                          <span className="t-sm tx-3" style={{ fontWeight: 400 }}>{g.hint}</span>
                        </span>}
                        meta={String(list.length)} bodyClass="tight">
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>{t('item')}</th><th>{t('priority')}</th>
                            <th>{t('assignee')}</th><th style={{ width: 140 }}>{t('progress')}</th>
                            <th>{t('due')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map(x => (
                            <tr key={x.id}>
                              <td style={{ minWidth: 280 }}>
                                <Link to={`/tasks/${x.id}`} className="cell-title">{x.title_ar}</Link>
                                <span className="cell-meta">
                                  <span className="code-chip">{x.id}</span>
                                  <span className="t-xs tx-3">{x.category}</span>
                                </span>
                              </td>
                              <td className="nw"><Badge tone={x.priority === 'critical' ? 'danger'
                                : x.priority === 'high' ? 'warning' : 'neutral'}>{t(x.priority)}</Badge></td>
                              <td className="nw t-sm">{x.assignee_name || '—'}</td>
                              <td className="nw">
                                <div className="progress-cell">
                                  <Bar value={x.progress} />
                                  <span className="pct">{x.progress}%</span>
                                </div>
                              </td>
                              <td className="mono nw t-sm"
                                  style={{ color: x.days_left != null && x.days_left < 0 ? 'var(--da)' : undefined }}>
                                {x.due_date || 'بلا تاريخ'}
                                {x.days_left != null && (
                                  <div className="t-xs tx-3">
                                    {x.days_left < 0 ? `متأخر ${Math.abs(x.days_left)} يوم` : `باقي ${x.days_left} يوم`}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )
              })}
      </div>
    </>
  )
}
