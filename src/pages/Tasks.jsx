import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { PageHeader } from '../components/Layout'
import Toolbar, { EMPTY_FILTERS } from '../components/Toolbar'
import { TaskTable, TaskCards, NoTasks, useOrganized } from '../components/TaskList'
import { TableSkeleton, CardsSkeleton, ErrorState, Button } from '../components/ui'
import { useTasks, useFiltered, usePeople } from '../lib/useTasks'
import { FALLBACK_CATEGORIES } from '../lib/constants'
import { useIsNarrow } from '../lib/useMedia'

export default function Tasks({ onlyMine = false }) {
  const { t, profile, can, settings, nameOf } = useApp()
  const { rows, loading, err, reload } = useTasks({ onlyMine, profileId: profile?.id })
  const [f, setF] = useState(EMPTY_FILTERS)
  const [view, setView] = useState(() => localStorage.getItem('sit_view') || 'table')
  const narrow = useIsNarrow()
  const people = usePeople()
  const shown = useFiltered(rows, f)
  const groups = useOrganized(shown, f, t)
  const cats = settings.categories || FALLBACK_CATEGORIES

  const effectiveView = narrow ? 'cards' : view
  const changeView = v => { setView(v); try { localStorage.setItem('sit_view', v) } catch {} }
  const hasFilters = Boolean(f.q || f.status || f.priority || f.category || f.assignee)

  return (
    <>
      <PageHeader title={onlyMine ? `${t('mine')} — ${nameOf(profile)}` : t('all')}>
        {can('canCreateTask') && (
          <Link to="/tasks/new" className="btn btn-primary btn-sm">
            <span className="row" style={{ gap: 6 }}>+ بند جديد</span>
          </Link>
        )}
      </PageHeader>

      <div className="page">
        {err
          ? <div className="card"><ErrorState description={err} onRetry={reload} /></div>
          : (
            <>
              <Toolbar f={f} setF={setF} categories={cats} people={onlyMine ? null : people}
                       view={effectiveView} setView={changeView}
                       count={shown.length} total={rows.length} />

              {loading
                ? (effectiveView === 'cards' ? <CardsSkeleton /> : <TableSkeleton />)
                : shown.length === 0
                  ? <NoTasks filtered={hasFilters} onClear={() => setF({ ...EMPTY_FILTERS, sort: f.sort, group: f.group })} />
                  : effectiveView === 'cards'
                    ? <TaskCards groups={groups} total={shown.length} />
                    : <TaskTable groups={groups} total={shown.length} sort={f.sort}
                                 onSort={id => setF({ ...f, sort: id })} />}
            </>
          )}
      </div>
    </>
  )
}
