import { Fragment, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { Bar, StatusBadge, PriorityBadge, EmptyState, Button, Icon } from './ui'
import { money, dstr, daysLeft } from '../lib/format'

const PRI_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

/** ترتيب البنود ثم تجميعها حسب اختيار المستخدم */
export function useOrganized(rows, f, t) {
  return useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      switch (f.sort) {
        case 'priority': return (PRI_ORDER[a.priority] - PRI_ORDER[b.priority]) || (a.sn - b.sn)
        case 'progress': return (b.progress - a.progress) || (a.sn - b.sn)
        case 'due': {
          if (!a.due_date && !b.due_date) return a.sn - b.sn
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return a.due_date.localeCompare(b.due_date)
        }
        case 'category': return a.category.localeCompare(b.category, 'ar') || (a.sn - b.sn)
        default: return a.sn - b.sn
      }
    })
    if (!f.group) return [{ key: null, rows: sorted }]

    const map = new Map()
    for (const r of sorted) {
      const raw = r[f.group] ?? '—'
      const key = (f.group === 'status' || f.group === 'priority') ? t(raw) : raw
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return [...map.entries()].map(([key, rs]) => ({ key, rows: rs }))
  }, [rows, f.sort, f.group, t])
}

/** نص حالة التسليم — لا يعتمد على اللون وحده */
function DueCell({ task }) {
  const dl = daysLeft(task.due_date)
  if (!task.due_date) return <span className="tx-4">بلا تاريخ</span>
  const late = dl < 0
  return (
    <>
      <span className="mono" style={{ color: late ? 'var(--da)' : undefined, fontWeight: late ? 600 : 400 }}>
        {dstr(task.due_date)}
      </span>
      <div className="t-xs" style={{ color: late ? 'var(--da)' : 'var(--tx-3)', marginTop: 2 }}>
        {late ? `متأخر ${Math.abs(dl)} يوم` : dl === 0 ? 'يستحق اليوم' : `باقي ${dl} يوم`}
      </div>
    </>
  )
}

const SORT_COL = { sn: 'sn', priority: 'priority', progress: 'progress', due: 'due', category: 'category' }

/* ------------------------------ الجدول ------------------------------ */
export function TaskTable({ groups, total, sort, onSort }) {
  const { t, can, lang } = useApp()
  const nav = useNavigate()
  if (!total) return null

  const title = x => (lang === 'en' ? (x.title_en || x.title_ar) : x.title_ar)
  const cols = can('canViewCost') ? 8 : 7

  const Th = ({ id, children, ...rest }) => {
    const on = SORT_COL[sort] === id
    return (
      <th className={`sortable ${on ? 'is-sorted' : ''}`} {...rest}
          onClick={() => onSort?.(id)} aria-sort={on ? 'ascending' : 'none'}>
        <span className="th-in">
          {children}
          {on && <Icon name="arrowDown" className="sort-ico" size={12} />}
        </span>
      </th>
    )
  }

  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table>
          <caption className="sr-only">قائمة بنود المشروع</caption>
          <thead>
            <tr>
              <Th id="sn" style={{ width: 48 }}>#</Th>
              <th scope="col">{t('item')}</th>
              <Th id="priority">{t('priority')}</Th>
              <th scope="col">{t('status')}</th>
              <th scope="col">{t('assignee')}</th>
              <Th id="progress" style={{ width: 150 }}>{t('progress')}</Th>
              {can('canViewCost') && <th scope="col">{t('estCost')}</th>}
              <Th id="due">{t('due')}</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.key || 'all'}>
                {g.key && (
                  <tr className="group-row">
                    <td colSpan={cols}>{g.key}<span className="g-count">{g.rows.length}</span></td>
                  </tr>
                )}
                {g.rows.map(x => (
                  <tr key={x.id} className="clickable" tabIndex={0}
                      onClick={() => nav(`/tasks/${x.id}`)}
                      onKeyDown={e => { if (e.key === 'Enter') nav(`/tasks/${x.id}`) }}>
                    <td className="mono nw t-xs tx-3">{x.sn}</td>
                    <td style={{ minWidth: 300, maxWidth: 480 }}>
                      <span className="cell-title">{title(x)}</span>
                      <span className="cell-meta">
                        <span className="code-chip">{x.id}</span>
                        <span className="t-xs tx-3">{x.category}</span>
                      </span>
                    </td>
                    <td className="nw"><PriorityBadge priority={x.priority} /></td>
                    <td className="nw"><StatusBadge status={x.status} /></td>
                    <td className="nw t-sm">{x.assignee_name || <span className="tx-4">غير مُسنَد</span>}</td>
                    <td className="nw">
                      <div className="progress-cell">
                        <Bar value={x.progress} done={x.progress === 100} label={`${x.progress}%`} />
                        <span className="pct">{x.progress}%</span>
                      </div>
                      <span className="mono t-xs tx-3">{x.steps_done}/{x.steps_total} خطوة</span>
                    </td>
                    {can('canViewCost') &&
                      <td className="mono nw t-sm">{money(x.estimated_cost)}</td>}
                    <td className="nw t-sm"><DueCell task={x} /></td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------ البطاقات ------------------------------ */
export function TaskCards({ groups, total }) {
  const { lang } = useApp()
  const nav = useNavigate()
  if (!total) return null
  const title = x => (lang === 'en' ? (x.title_en || x.title_ar) : x.title_ar)

  return (
    <div className="col" style={{ gap: 24 }}>
      {groups.map(g => (
        <div key={g.key || 'all'}>
          {g.key && (
            <div className="section-head">
              <h2>{g.key}</h2>
              <span className="s-meta mono">{g.rows.length}</span>
            </div>
          )}
          <div className="task-cards">
            {g.rows.map(x => {
              const dl = daysLeft(x.due_date)
              return (
                <button key={x.id} className="task-card" onClick={() => nav(`/tasks/${x.id}`)}>
                  <div className="tc-top">
                    <span className="code-chip">{x.id}</span>
                    <PriorityBadge priority={x.priority} />
                    <StatusBadge status={x.status} />
                  </div>
                  <h4>{title(x)}</h4>
                  {x.description && <p className="tc-desc clamp2">{x.description}</p>}
                  <div className="progress-cell" style={{ width: '100%' }}>
                    <span style={{ flex: 1 }}><Bar value={x.progress} done={x.progress === 100} /></span>
                    <span className="pct mono">{x.progress}%</span>
                  </div>
                  <div className="tc-foot">
                    <span className="who">{x.assignee_name || 'غير مُسنَد'}</span>
                    <span className="mono">{x.steps_done}/{x.steps_total}</span>
                    <span className="mono" style={{ color: dl != null && dl < 0 ? 'var(--da)' : undefined }}>
                      {x.due_date || 'بلا تاريخ'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------ لا نتائج ------------------------------ */
export function NoTasks({ filtered, onClear }) {
  return filtered
    ? <div className="card"><EmptyState icon="search" title="لا توجد بنود مطابقة"
        description="جرّب توسيع البحث أو إزالة بعض الفلاتر."
        action={<Button variant="secondary" onClick={onClear}>مسح الفلاتر</Button>} /></div>
    : <div className="card"><EmptyState icon="inbox" title="لا توجد بنود بعد"
        description="أول ما تتضاف بنود للمشروع هتظهر هنا." /></div>
}
