import { useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { Progress, StatusPill, PriorityPill, Empty } from './ui'
import { money, dstr } from '../lib/format'

export default function TaskTable({ rows }) {
  const { t, can, lang } = useApp()
  const nav = useNavigate()
  if (!rows.length) return <div className="tablewrap"><Empty>{t('noTasks')}</Empty></div>

  const title = x => (lang === 'en' ? (x.title_en || x.title_ar) : x.title_ar)

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>{t('item')}</th>
            <th>{t('category')}</th>
            <th>{t('priority')}</th>
            <th>{t('status')}</th>
            <th>{t('assignee')}</th>
            <th>{t('progress')}</th>
            {can('canViewCost') && <th>{t('estCost')}</th>}
            <th>{t('due')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(x => (
            <tr key={x.id} className="click" onClick={() => nav(`/tasks/${x.id}`)}>
              <td className="mono nw" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{x.sn}</td>
              <td style={{ minWidth: 260 }}>
                <div style={{ fontWeight: 500 }}>{title(x)}</div>
                <div className="tid">{x.id}</div>
              </td>
              <td className="nw" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{x.category}</td>
              <td className="nw"><PriorityPill priority={x.priority} /></td>
              <td className="nw"><StatusPill status={x.status} /></td>
              <td className="nw" style={{ fontSize: 12.5 }}>{x.assignee_name || '—'}</td>
              <td className="nw">
                <span className="mini-track"><Progress value={x.progress} done={x.progress === 100} /></span>
                <span className="mono" style={{ fontSize: 11.5, marginInlineStart: 6 }}>{x.progress}%</span>
              </td>
              {can('canViewCost') && <td className="mono nw" style={{ fontSize: 12 }}>{money(x.estimated_cost)}</td>}
              <td className="mono nw" style={{ fontSize: 11.5, color: x.is_overdue ? 'var(--crit)' : undefined, fontWeight: x.is_overdue ? 600 : 400 }}>
                {dstr(x.due_date) || t('notSet')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
