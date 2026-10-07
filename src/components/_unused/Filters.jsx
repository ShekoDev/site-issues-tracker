import { useApp } from '../state/AppContext'
import { STATUS, PRIORITY } from '../lib/constants'

export default function Filters({ f, setF, categories, people }) {
  const { t } = useApp()
  const set = (k, v) => setF({ ...f, [k]: v })
  return (
    <div className="filters noprint">
      <input placeholder={t('search')} value={f.q} onChange={e => set('q', e.target.value)}
             style={{ minWidth: 220 }} />
      <select value={f.category} onChange={e => set('category', e.target.value)}>
        <option value="">{t('category')}: {t('all_')}</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {people && (
        <select value={f.assignee} onChange={e => set('assignee', e.target.value)}>
          <option value="">{t('assignee')}: {t('all_')}</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
        </select>
      )}
      <span style={{ display: 'flex', gap: 6 }}>
        <button className={'chip' + (f.status === '' ? ' on' : '')} onClick={() => set('status', '')}>{t('all_')}</button>
        {STATUS.filter(s => s !== 'cancelled').map(s => (
          <button key={s} className={'chip' + (f.status === s ? ' on' : '')}
                  onClick={() => set('status', f.status === s ? '' : s)}>{t(s)}</button>
        ))}
      </span>
      <span style={{ display: 'flex', gap: 6 }}>
        {PRIORITY.map(p => (
          <button key={p} className={'chip' + (f.priority === p ? ' on' : '')}
                  onClick={() => set('priority', f.priority === p ? '' : p)}>{t(p)}</button>
        ))}
      </span>
      <button className="btn ghost sm"
              onClick={() => setF({ q: '', status: '', priority: '', category: '', assignee: '' })}>
        {t('reset')}
      </button>
    </div>
  )
}
