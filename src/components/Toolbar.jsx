import { useApp } from '../state/AppContext'
import { STATUS, PRIORITY } from '../lib/constants'
import { Button, SearchInput, Icon } from './ui'
import { useIsNarrow } from '../lib/useMedia'

export const SORTS = [
  ['sn', 'الترتيب الأصلي'],
  ['priority', 'الأولوية'],
  ['progress', 'الإنجاز'],
  ['due', 'أقرب تسليم'],
  ['category', 'التصنيف']
]

export const GROUPS = [
  ['', 'بدون تجميع'],
  ['category', 'التصنيف'],
  ['assignee_name', 'المسؤول'],
  ['status', 'الحالة'],
  ['priority', 'الأولوية']
]

export const EMPTY_FILTERS = {
  q: '', status: '', priority: '', category: '', assignee: '', sort: 'sn', group: ''
}

/** شريط الأدوات: بحث + فلاتر + ترتيب + تبديل العرض + ملخّص الفلاتر المطبَّقة */
export default function Toolbar({ f, setF, categories, people, view, setView, count, total }) {
  const { t } = useApp()
  const narrow = useIsNarrow()
  const set = (k, v) => setF({ ...f, [k]: v })

  const applied = [
    f.q && { k: 'q', label: `بحث: ${f.q}` },
    f.status && { k: 'status', label: t(f.status) },
    f.priority && { k: 'priority', label: `أولوية ${t(f.priority)}` },
    f.category && { k: 'category', label: f.category },
    f.assignee && { k: 'assignee', label: people?.find(p => p.id === f.assignee)?.name_ar || 'مسؤول' }
  ].filter(Boolean)

  const clearAll = () => setF({ ...EMPTY_FILTERS, sort: f.sort, group: f.group })

  return (
    <div className="noprint section">
      <div className="toolbar">
        <span className="search">
          <SearchInput value={f.q} onChange={v => set('q', v)}
                       placeholder="ابحث في البنود…" aria-label="بحث" />
        </span>

        <div className="filter-group">
          <select value={f.category} onChange={e => set('category', e.target.value)} aria-label="التصنيف">
            <option value="">كل التصنيفات</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {people && (
            <select value={f.assignee} onChange={e => set('assignee', e.target.value)} aria-label="المسؤول">
              <option value="">كل المسؤولين</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
            </select>
          )}

          <select value={f.group} onChange={e => set('group', e.target.value)} aria-label="التجميع">
            {GROUPS.map(([v, l]) => <option key={v} value={v}>{v ? `تجميع: ${l}` : l}</option>)}
          </select>

          <select value={f.sort} onChange={e => set('sort', e.target.value)} aria-label="الترتيب">
            {SORTS.map(([v, l]) => <option key={v} value={v}>ترتيب: {l}</option>)}
          </select>
        </div>

        <span className="spacer" />

        {!narrow && (
          <div className="segment" role="group" aria-label="طريقة العرض">
            <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}
                    aria-pressed={view === 'table'}>
              <Icon name="rows" size={14} />جدول
            </button>
            <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}
                    aria-pressed={view === 'cards'}>
              <Icon name="grid" size={14} />بطاقات
            </button>
          </div>
        )}
      </div>

      <div className="toolbar" style={{ marginTop: 12 }}>
        <div className="filter-group" role="group" aria-label="تصفية بالحالة">
          <button className={'chip' + (f.status === '' ? ' on' : '')} onClick={() => set('status', '')}>
            الكل
          </button>
          {STATUS.filter(s => s !== 'cancelled').map(s => (
            <button key={s} className={'chip' + (f.status === s ? ' on' : '')}
                    aria-pressed={f.status === s}
                    onClick={() => set('status', f.status === s ? '' : s)}>{t(s)}</button>
          ))}
        </div>

        <span aria-hidden="true" style={{ width: 1, height: 22, background: 'var(--line)' }} />

        <div className="filter-group" role="group" aria-label="تصفية بالأولوية">
          {PRIORITY.map(p => (
            <button key={p} className={'chip' + (f.priority === p ? ' on' : '')}
                    aria-pressed={f.priority === p}
                    onClick={() => set('priority', f.priority === p ? '' : p)}>{t(p)}</button>
          ))}
        </div>
      </div>

      {(applied.length > 0 || count !== total) && (
        <div className="applied">
          <span className="lab">
            يعرض <b className="mono">{count}</b> من {total}
          </span>
          {applied.map(a => (
            <span key={a.k} className="tag">
              {a.label}
              <button onClick={() => set(a.k, '')} aria-label={`إزالة ${a.label}`}>
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          {applied.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>مسح الكل</Button>
          )}
        </div>
      )}
    </div>
  )
}
