import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, errText } from '../lib/supabase'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/ToastContext'
import { usePeople } from '../lib/useTasks'
import { PageHeader } from '../components/Layout'
import { Card, Field, Button, Alert, Modal, Skeleton } from '../components/ui'
import { FALLBACK_CATEGORIES, PRIORITY } from '../lib/constants'

const EMPTY = {
  id: '', sn: '', title_ar: '', title_en: '', description: '', category: '',
  priority: 'medium', assigned_to: '', co_assignee: '',
  guidance_note: '', side_note: '', raised_date: '', start_date: '', due_date: ''
}

export default function TaskForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const nav = useNavigate()
  const toast = useToast()
  const { t, can, settings, profile } = useApp()
  const people = usePeople()
  const cats = settings.categories || FALLBACK_CATEGORIES

  const [v, setV] = useState(EMPTY)
  const [steps, setSteps] = useState(['', '', '', ''])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(editing)
  const [touched, setTouched] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!editing) {
      db.from('tasks').select('sn').order('sn', { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => {
          const next = (data?.sn || 0) + 1
          setV(s => ({
            ...s, sn: next, id: `ITEM-${String(next).padStart(3, '0')}`,
            raised_date: new Date().toISOString().slice(0, 10)
          }))
        })
      return
    }
    Promise.all([
      db.from('tasks').select('*').eq('id', id).maybeSingle(),
      db.from('execution_steps').select('*').eq('task_id', id).order('step_order')
    ]).then(([a, b]) => {
      if (a.error) setErr(errText(a.error))
      if (a.data) setV({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map(k => [k, a.data[k] ?? ''])) })
      setSteps((b.data || []).map(s => s.title_ar))
      setLoading(false)
    })
  }, [id, editing])

  const set = (k, val) => setV(s => ({ ...s, [k]: val }))
  const errors = {
    id: !v.id.trim() ? 'رقم البند مطلوب' : '',
    title_ar: !v.title_ar.trim() ? 'عنوان البند مطلوب' : '',
    category: !v.category ? 'اختر التصنيف' : '',
    due_date: v.start_date && v.due_date && v.due_date < v.start_date
      ? 'تاريخ التسليم لا يصح أن يسبق تاريخ البدء' : ''
  }
  const hasError = Object.values(errors).some(Boolean)
  const E = k => (touched ? errors[k] : '')

  async function save(e) {
    e.preventDefault()
    setTouched(true)
    if (hasError) { setErr('راجع الحقول المعلَّمة بالأحمر'); return }
    setBusy(true); setErr('')
    const payload = {
      sn: Number(v.sn), title_ar: v.title_ar.trim(), title_en: v.title_en.trim() || null,
      description: v.description.trim() || null, category: v.category, priority: v.priority,
      assigned_to: v.assigned_to || null, co_assignee: v.co_assignee || null,
      guidance_note: v.guidance_note.trim() || null, side_note: v.side_note.trim() || null,
      raised_date: v.raised_date || null, start_date: v.start_date || null, due_date: v.due_date || null
    }
    let error
    if (editing) {
      ({ error } = await db.from('tasks').update(payload).eq('id', id))
    } else {
      ({ error } = await db.from('tasks').insert({ ...payload, id: v.id.trim(), created_by: profile.id }))
      if (!error) {
        const rows = steps.map((s, i) => ({ task_id: v.id.trim(), step_order: i + 1, title_ar: s.trim() }))
          .filter(r => r.title_ar)
        if (rows.length) await db.from('execution_steps').insert(rows)
      }
    }
    setBusy(false)
    if (error) { setErr(errText(error)); return }
    toast.success(editing ? 'تم حفظ التعديلات' : 'تمت إضافة البند')
    nav(`/tasks/${editing ? id : v.id.trim()}`)
  }

  async function remove() {
    const { error } = await db.from('tasks').delete().eq('id', id)
    if (error) { setErr(errText(error)); setConfirmDel(false); return }
    toast.success('تم حذف البند')
    nav('/tasks')
  }

  if (loading) return (
    <><PageHeader title={t('edit')} /><div className="page"><div className="card" style={{ padding: 24 }}>
      <Skeleton w="40%" h={14} /><Skeleton /><Skeleton /><Skeleton /></div></div></>
  )

  return (
    <>
      <PageHeader title={editing ? `${t('edit')} — ${id}` : 'إضافة بند جديد'}
                  crumbs={[{ label: t('all'), to: '/tasks' },
                           editing ? { label: id, to: `/tasks/${id}` } : { label: 'بند جديد' }]}>
        {editing && can('canDeleteTask') &&
          <Button variant="ghost" size="sm" icon="trash" onClick={() => setConfirmDel(true)}>{t('del')}</Button>}
      </PageHeader>

      <div className="page" style={{ maxWidth: 860 }}>
        {err && <Alert tone="danger" onClose={() => setErr('')}>{err}</Alert>}

        <form onSubmit={save} noValidate>
          <Card title="البيانات الأساسية" className="section">
            <div className="grid g-2" style={{ gap: 0, columnGap: 16 }}>
              <Field label="رقم البند" required error={E('id')}
                     hint={editing ? 'رقم البند لا يتغيّر بعد الإنشاء' : 'يتولّد تلقائيًا ويمكن تعديله'}>
                {i => <input id={i} value={v.id} dir="ltr" disabled={editing}
                             className={E('id') ? 'input-err' : ''} onChange={e => set('id', e.target.value)} />}
              </Field>
              <Field label="الرقم المسلسل">
                {i => <input id={i} type="number" value={v.sn} dir="ltr" onChange={e => set('sn', e.target.value)} />}
              </Field>
            </div>

            <Field label="عنوان البند" required error={E('title_ar')}>
              {i => <input id={i} value={v.title_ar} className={E('title_ar') ? 'input-err' : ''}
                           onChange={e => set('title_ar', e.target.value)} />}
            </Field>

            <Field label="العنوان بالإنجليزي" hint="اختياري — يظهر عند تبديل لغة الواجهة">
              {i => <input id={i} dir="ltr" value={v.title_en} onChange={e => set('title_en', e.target.value)} />}
            </Field>

            <Field label="الوصف" hint="اشرح المطلوب بوضوح عشان المسؤول يفهمه من غير رجوع لحد">
              {i => <textarea id={i} rows="3" value={v.description} onChange={e => set('description', e.target.value)} />}
            </Field>
          </Card>

          <Card title="التصنيف والإسناد" className="section">
            <div className="grid g-3" style={{ gap: 0, columnGap: 16 }}>
              <Field label={t('category')} required error={E('category')}>
                {i => (
                  <select id={i} value={v.category} className={E('category') ? 'input-err' : ''}
                          onChange={e => set('category', e.target.value)}>
                    <option value="">اختر…</option>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </Field>
              <Field label={t('priority')}>
                {i => (
                  <select id={i} value={v.priority} onChange={e => set('priority', e.target.value)}>
                    {PRIORITY.map(p => <option key={p} value={p}>{t(p)}</option>)}
                  </select>
                )}
              </Field>
              <Field label={t('raised')}>
                {i => <input id={i} type="date" value={v.raised_date || ''} onChange={e => set('raised_date', e.target.value)} />}
              </Field>
            </div>

            <div className="grid g-2" style={{ gap: 0, columnGap: 16 }}>
              <Field label={t('assignee')} hint="المسؤول الرئيسي عن التنفيذ">
                {i => (
                  <select id={i} value={v.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                    <option value="">غير مُسنَد</option>
                    {people.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                  </select>
                )}
              </Field>
              <Field label={t('coAssignee')} hint="اختياري — يشارك في التنفيذ ويرى البند">
                {i => (
                  <select id={i} value={v.co_assignee} onChange={e => set('co_assignee', e.target.value)}>
                    <option value="">—</option>
                    {people.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                  </select>
                )}
              </Field>
            </div>
          </Card>

          <Card title="التواريخ والملاحظات" className="section">
            <div className="grid g-2" style={{ gap: 0, columnGap: 16 }}>
              <Field label={t('startDate')}>
                {i => <input id={i} type="date" value={v.start_date || ''} onChange={e => set('start_date', e.target.value)} />}
              </Field>
              <Field label={t('due')} error={E('due_date')}>
                {i => <input id={i} type="date" value={v.due_date || ''} className={E('due_date') ? 'input-err' : ''}
                             onChange={e => set('due_date', e.target.value)} />}
              </Field>
            </div>
            <Field label={t('guidance')} hint="تظهر أعلى ملاحظات البند كتوجيه ثابت">
              {i => <textarea id={i} rows="2" value={v.guidance_note} onChange={e => set('guidance_note', e.target.value)} />}
            </Field>
            <Field label={t('side')}>
              {i => <input id={i} value={v.side_note} onChange={e => set('side_note', e.target.value)} />}
            </Field>
          </Card>

          {!editing && (
            <Card title="آلية التنفيذ" className="section"
                  meta="٤ خطوات">
              <p className="t-sm tx-3" style={{ marginBottom: 14 }}>
                نسبة الإنجاز بتتحسب تلقائيًا من الخطوات المنجزة — اكتب خطوات قابلة للقياس.
              </p>
              {steps.map((s, i) => (
                <Field key={i} label={`الخطوة ${i + 1}`}>
                  {fid => <input id={fid} value={s}
                                 onChange={e => setSteps(a => a.map((x, j) => (j === i ? e.target.value : x)))} />}
                </Field>
              ))}
            </Card>
          )}

          <div className="row" style={{ gap: 8 }}>
            <Button type="submit" variant="primary" loading={busy}>
              {editing ? 'حفظ التعديلات' : 'إضافة البند'}
            </Button>
            <Button variant="ghost" onClick={() => nav(-1)}>{t('cancel')}</Button>
          </div>
        </form>
      </div>

      {confirmDel && (
        <Modal title="حذف البند نهائيًا؟" onClose={() => setConfirmDel(false)}
               footer={<>
                 <Button variant="danger" onClick={remove}>نعم، احذف</Button>
                 <Button variant="ghost" onClick={() => setConfirmDel(false)}>إلغاء</Button>
               </>}>
          <Alert tone="danger" title="لا يمكن التراجع عن هذا الإجراء">
            هيتحذف البند <b>{id}</b> ومعاه خطواته وملاحظاته ومرفقاته وسجل تغييراته.
          </Alert>
        </Modal>
      )}
    </>
  )
}
