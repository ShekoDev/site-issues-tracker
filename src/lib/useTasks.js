import { useEffect, useMemo, useState, useCallback } from 'react'
import { db, errText } from '../lib/supabase'

/** يقرأ البنود من v_tasks_visible — الفلترة الأمنية تتم داخل القاعدة بـ RLS */
export function useTasks({ onlyMine, profileId } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = db.from('v_tasks_visible').select('*').order('sn')
    if (onlyMine && profileId) q = q.or(`assigned_to.eq.${profileId},co_assignee.eq.${profileId}`)
    const { data, error } = await q
    if (error) setErr(errText(error))
    else { setErr(''); setRows(data || []) }
    setLoading(false)
  }, [onlyMine, profileId])

  useEffect(() => { load() }, [load])

  // تحديث لحظي لكل المستخدمين
  useEffect(() => {
    const ch = db.channel('tasks-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'execution_steps' }, load)
      .subscribe()
    return () => { db.removeChannel(ch) }
  }, [load])

  return { rows, loading, err, reload: load }
}

/** فلترة العرض في المتصفح */
export function useFiltered(rows, f) {
  return useMemo(() => {
    const q = f.q.trim().toLowerCase()
    return rows.filter(x =>
      (!f.status || x.status === f.status) &&
      (!f.priority || x.priority === f.priority) &&
      (!f.category || x.category === f.category) &&
      (!f.assignee || x.assigned_to === f.assignee || x.co_assignee === f.assignee) &&
      (!q ||
        x.id.toLowerCase().includes(q) ||
        (x.title_ar || '').toLowerCase().includes(q) ||
        (x.title_en || '').toLowerCase().includes(q) ||
        (x.description || '').toLowerCase().includes(q) ||
        (x.assignee_name || '').toLowerCase().includes(q))
    )
  }, [rows, f])
}

/** قائمة المستخدمين النشطين — للفلاتر والنقل */
export function usePeople() {
  const [people, setPeople] = useState([])
  useEffect(() => {
    db.from('profiles').select('id,username,name_ar,name_en,role,job_title,active')
      .eq('active', true).order('name_ar')
      .then(({ data }) => setPeople(data || []))
  }, [])
  return people
}
