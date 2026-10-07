import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { db, errText } from '../lib/supabase'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/ToastContext'
import { usePeople } from '../lib/useTasks'
import { PageHeader } from '../components/Layout'
import {
  Card, Bar, StatusBadge, PriorityBadge, Badge, Button, Field, Modal,
  EmptyState, ErrorState, Alert, Skeleton, Icon
} from '../components/ui'
import { money, dtstr, fileSize, daysLeft } from '../lib/format'
import { actionLabel } from '../lib/actionLabel'
import { BUCKET, MAX_FILE } from '../lib/constants'

export default function TaskDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { t, lang, profile, can, isAdmin } = useApp()
  const people = usePeople()
  const pmap = useMemo(() => Object.fromEntries(people.map(p => [p.id, p])), [people])
  const pname = uid => (uid && pmap[uid]
    ? (lang === 'en' ? (pmap[uid].name_en || pmap[uid].name_ar) : pmap[uid].name_ar) : '—')

  const [task, setTask] = useState(null)
  const [steps, setSteps] = useState([])
  const [notes, setNotes] = useState([])
  const [hist, setHist] = useState([])
  const [files, setFiles] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    const [a, b, c, d, e] = await Promise.all([
      db.from('v_tasks_visible').select('*').eq('id', id).maybeSingle(),
      db.from('execution_steps').select('*').eq('task_id', id).order('step_order'),
      db.from('task_notes').select('*').eq('task_id', id).order('created_at', { ascending: false }),
      db.from('task_history').select('*').eq('task_id', id).order('created_at', { ascending: false }).limit(100),
      db.from('task_attachments').select('*').eq('task_id', id).order('uploaded_at', { ascending: false })
    ])
    const bad = [a, b, c, d, e].find(r => r.error)
    if (bad) setErr(errText(bad.error))
    setTask(a.data); setSteps(b.data || []); setNotes(c.data || [])
    setHist(d.data || []); setFiles(e.data || []); setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = db.channel(`task-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'execution_steps', filter: `task_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${id}` }, load)
      .subscribe()
    return () => { db.removeChannel(ch) }
  }, [id, load])

  if (loading) return (
    <>
      <PageHeader title={id} />
      <div className="page">
        <div className="detail-head"><Skeleton w="30%" h={14} /><Skeleton w="70%" h={22} style={{ marginTop: 14 }} /><Skeleton w="90%" /></div>
        <div className="detail-grid">
          <div className="card" style={{ padding: 20 }}><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
          <div className="card" style={{ padding: 20 }}><Skeleton /><Skeleton /></div>
        </div>
      </div>
    </>
  )

  if (!task) return (
    <>
      <PageHeader title={id} />
      <div className="page"><div className="card">
        <ErrorState title="البند غير موجود" description={err || 'ممكن يكون اتحذف أو ما عندكش صلاحية رؤيته.'}
                    onRetry={() => nav('/tasks')} />
      </div></div>
    </>
  )

  const mine = task.assigned_to === profile.id || task.co_assignee === profile.id
  const canStep = can('canUpdateProgress') && (can('canEditTask') || mine)
  const title = lang === 'en' ? (task.title_en || task.title_ar) : task.title_ar
  const dl = daysLeft(task.due_date)

  async function run(fn, okMsg) {
    setErr('')
    const { error } = await fn()
    if (error) { toast.error(errText(error)); return false }
    if (okMsg) toast.success(okMsg)
    await load()
    return true
  }

  const toggleStep = (step, checked) =>
    run(() => db.from('execution_steps').update({ completed: checked }).eq('id', step.id),
      checked ? 'تم تعليم الخطوة كمنجزة' : 'تم التراجع عن الخطوة')

  const saveField = (patch, msg) => run(() => db.from('tasks').update(patch).eq('id', id), msg)

  async function addNote() {
    const body = noteText.trim()
    if (!body) return
    setSavingNote(true)
    const ok = await run(() => db.from('task_notes').insert({ task_id: id, body, created_by: profile.id }),
      'تمت إضافة الملاحظة')
    setSavingNote(false)
    if (ok) setNoteText('')
  }

  async function upload(file) {
    if (!file) return
    if (file.size > MAX_FILE) { toast.error('حجم الملف أكبر من 20 ميجابايت'); return }
    setUploading(true)
    const path = `${id}/${crypto.randomUUID()}-${file.name}`
    const up = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (up.error) { toast.error(errText(up.error)); setUploading(false); return }
    await run(() => db.from('task_attachments').insert({
      task_id: id, file_name: file.name, file_type: file.type,
      size_bytes: file.size, storage_path: path, uploaded_by: profile.id
    }), 'تم رفع المرفق')
    setUploading(false)
  }

  async function openFile(f) {
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(f.storage_path, 60)
    if (error) { toast.error(errText(error)); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <>
      <PageHeader title={title}
                  crumbs={[{ label: t('all'), to: '/tasks' }, { label: task.id }]}>
        {can('canTransferTask') &&
          <Button variant="secondary" size="sm" icon="transfer" onClick={() => setShowTransfer(true)}>
            {t('transfer')}
          </Button>}
        {can('canEditTask') &&
          <Link to={`/tasks/${id}/edit`} className="btn btn-secondary btn-sm">
            <Icon name="edit" />{t('edit')}
          </Link>}
      </PageHeader>

      <div className="page">
        {err && <Alert tone="danger" onClose={() => setErr('')}>{err}</Alert>}

        <div className="detail-head">
          <div className="dh-top">
            <span className="code-chip">{task.id}</span>
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            <span className="t-sm tx-3">{task.category}</span>
            {task.is_overdue && <Badge tone="danger">متأخر {Math.abs(dl)} يوم</Badge>}
          </div>
          <h2>{title}</h2>
          {task.description && <p className="dh-desc measure">{task.description}</p>}
          <div className="detail-prog">
            <Bar value={task.progress} done={task.progress === 100} size="lg" label="نسبة الإنجاز" />
            <b>{task.progress}%</b>
            <span className="t-sm tx-3">{task.steps_done} من {task.steps_total} خطوات</span>
          </div>
        </div>

        <div className="detail-grid">
          <div className="col" style={{ gap: 16 }}>
            <Card title={t('steps')} meta={`${task.steps_done} من ${task.steps_total} منجزة`}>
              {!canStep && (
                <Alert tone="warning">{t('noPerm')}</Alert>
              )}
              <ul className="steps">
                {steps.map(s => (
                  <li key={s.id} className={'step' + (s.completed ? ' is-done' : '')}>
                    <input type="checkbox" id={`step-${s.id}`} checked={s.completed} disabled={!canStep}
                           onChange={e => toggleStep(s, e.target.checked)} />
                    <label className="s-txt" htmlFor={`step-${s.id}`} style={{ cursor: canStep ? 'pointer' : 'default' }}>
                      <span><i className="s-num">{s.step_order}</i>{lang === 'en' ? (s.title_en || s.title_ar) : s.title_ar}</span>
                      {s.completed && s.completed_by && (
                        <span className="s-by">
                          <Icon name="check" size={12} />{pname(s.completed_by)} · <span className="mono">{dtstr(s.completed_at)}</span>
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title={t('notes')} meta={String(notes.length)}>
              {task.guidance_note && (
                <div className="callout" style={{ marginBottom: 12 }}>
                  <span className="c-label">{t('guidance')}</span>
                  {task.guidance_note}
                </div>
              )}
              {notes.length === 0 && !task.guidance_note && (
                <EmptyState icon="inbox" title="لا توجد ملاحظات"
                            description="أضف ملاحظة لتوثيق أي تحديث أو قرار على البند." />
              )}
              {notes.map(n => (
                <div className="note" key={n.id}>
                  <div className="n-who">{pname(n.created_by)} · <span className="mono">{dtstr(n.created_at)}</span></div>
                  {n.body}
                </div>
              ))}
              {can('canAddNotes') && (
                <div className="note-form">
                  <input value={noteText} onChange={e => setNoteText(e.target.value)}
                         onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) addNote() }}
                         placeholder={t('addNote')} aria-label={t('addNote')} />
                  <Button variant="primary" onClick={addNote} loading={savingNote}
                          disabled={!noteText.trim()}>{t('send')}</Button>
                </div>
              )}
            </Card>

            <Card title={t('files')} meta={String(files.length)}
                  actions={can('canUploadFiles') && (
                    <label className={`btn btn-secondary btn-sm ${uploading ? 'loading' : ''}`}>
                      <Icon name="upload" />{uploading ? t('uploading') : t('upload')}
                      <input type="file" hidden disabled={uploading}
                             onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
                    </label>
                  )}>
              {files.length === 0
                ? <EmptyState icon="file" title="لا توجد مرفقات"
                              description="ارفع صور الموقع أو المخططات أو المستندات المرتبطة بالبند (حتى 20 ميجابايت للملف)." />
                : files.map(f => (
                  <div className="file-row" key={f.id}>
                    <span className="f-ico"><Icon name="file" size={14} /></span>
                    <span className="f-name">{f.file_name}</span>
                    <span className="mono t-xs tx-3">{fileSize(f.size_bytes)}</span>
                    <Button variant="ghost" size="sm" icon="download" onClick={() => openFile(f)}
                            aria-label={`${t('download')} ${f.file_name}`} />
                    {(can('canDeleteFiles') || isAdmin) && (
                      <Button variant="ghost" size="sm" icon="trash" aria-label="حذف المرفق"
                              onClick={async () => {
                                if (!confirm(`حذف «${f.file_name}» نهائيًا؟`)) return
                                await db.storage.from(BUCKET).remove([f.storage_path])
                                run(() => db.from('task_attachments').delete().eq('id', f.id), 'تم حذف المرفق')
                              }} />
                    )}
                  </div>
                ))}
            </Card>
          </div>

          <div className="col" style={{ gap: 16 }}>
            <Card title="بيانات البند">
              <dl className="kv">
                <dt>{t('assignee')}</dt><dd>{task.assignee_name || <span className="tx-4">غير مُسنَد</span>}</dd>
                <dt>{t('coAssignee')}</dt><dd>{task.co_assignee_name || <span className="tx-4">—</span>}</dd>
                <dt>{t('raised')}</dt><dd className="mono t-sm">{task.raised_date || '—'}</dd>
                <dt>{t('startDate')}</dt>
                <dd>
                  {can('canEditTask')
                    ? <input type="date" value={task.start_date || ''} aria-label={t('startDate')}
                             onChange={e => saveField({ start_date: e.target.value || null }, 'تم حفظ تاريخ البدء')} />
                    : <span className="mono t-sm">{task.start_date || 'لم يُحدَّد'}</span>}
                </dd>
                <dt>{t('due')}</dt>
                <dd>
                  {can('canEditTask')
                    ? <input type="date" value={task.due_date || ''} aria-label={t('due')}
                             className={task.is_overdue ? 'input-err' : ''}
                             onChange={e => saveField({ due_date: e.target.value || null }, 'تم حفظ تاريخ التسليم')} />
                    : <span className="mono t-sm" style={{ color: task.is_overdue ? 'var(--da)' : undefined }}>
                        {task.due_date || 'لم يُحدَّد'}
                      </span>}
                  {task.due_date && (
                    <div className="t-xs" style={{ color: task.is_overdue ? 'var(--da)' : 'var(--tx-3)', marginTop: 4 }}>
                      {dl < 0 ? `متأخر ${Math.abs(dl)} يوم` : dl === 0 ? 'يستحق اليوم' : `باقي ${dl} يوم`}
                    </div>
                  )}
                </dd>
              </dl>
              {task.side_note && (
                <div className="callout" style={{ marginTop: 14 }}>
                  <span className="c-label">{t('side')}</span>{task.side_note}
                </div>
              )}
            </Card>

            {can('canViewCost') && (
              <Card title={t('cost')} meta={t('sar')}>
                <div className="grid g-2" style={{ gap: 12 }}>
                  <Field label={t('estCost')}>
                    {id2 => <input id={id2} defaultValue={task.estimated_cost ?? ''} inputMode="numeric"
                                   disabled={!can('canUpdateCost')} className="mono"
                                   onBlur={e => {
                                     const v = e.target.value.trim() === '' ? null : Number(e.target.value.replace(/[^\d.]/g, ''))
                                     if (String(v ?? '') !== String(task.estimated_cost ?? '')) saveField({ estimated_cost: v }, 'تم حفظ التكلفة المقدرة')
                                   }} />}
                  </Field>
                  <Field label={t('actCost')}>
                    {id2 => <input id={id2} defaultValue={task.actual_cost ?? ''} inputMode="numeric"
                                   disabled={!can('canUpdateCost')} className="mono"
                                   onBlur={e => {
                                     const v = e.target.value.trim() === '' ? null : Number(e.target.value.replace(/[^\d.]/g, ''))
                                     if (String(v ?? '') !== String(task.actual_cost ?? '')) saveField({ actual_cost: v }, 'تم حفظ التكلفة الفعلية')
                                   }} />}
                  </Field>
                </div>
                <div className="t-sm" style={{ color: task.cost_variance > 0 ? 'var(--da)' : 'var(--tx-3)' }}>
                  {t('variance')}: <span className="mono" dir="ltr">
                    {task.cost_variance != null ? (task.cost_variance > 0 ? '+' : '') + money(task.cost_variance) : '—'}
                  </span>
                </div>
              </Card>
            )}

            {can('canViewHistory') && (
              <Card title={t('history')} meta={String(hist.length)}>
                {hist.length === 0
                  ? <EmptyState icon="clock" title="لا توجد تغييرات بعد"
                                description="أي تعديل على البند هيتسجّل هنا تلقائيًا." />
                  : <ul className="timeline">
                    {hist.map(h => (
                      <li key={h.id}>
                        <span className="dot" />
                        <div style={{ minWidth: 0 }}>
                          {actionLabel(h.action, h.field, lang)}
                          {(h.old_value || h.new_value) && (
                            <span className="mono t-xs tx-3"> · {h.old_value ?? '—'} ← {h.new_value ?? '—'}</span>
                          )}
                          {h.reason && <div className="t-sm tx-2">{h.reason}</div>}
                          <time>{pname(h.actor_id)} · {dtstr(h.created_at)}</time>
                        </div>
                      </li>
                    ))}
                  </ul>}
              </Card>
            )}
          </div>
        </div>
      </div>

      {showTransfer && (
        <TransferModal task={task} people={people} onClose={() => setShowTransfer(false)}
                       onDone={async () => { setShowTransfer(false); toast.success('تم نقل البند'); await load() }} />
      )}
    </>
  )
}

function TransferModal({ task, people, onClose, onDone }) {
  const { t } = useApp()
  const [to, setTo] = useState('')
  const [why, setWhy] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  const whyErr = touched && why.trim().length < 3 ? 'اكتب سبب النقل (٣ أحرف على الأقل)' : ''
  const toErr = touched && !to ? 'اختر المسؤول الجديد' : ''

  async function go() {
    setTouched(true)
    if (!to || why.trim().length < 3) return
    setBusy(true); setErr('')
    const { error } = await db.rpc('transfer_task', { p_task: task.id, p_to: to, p_reason: why.trim() })
    setBusy(false)
    if (error) setErr(errText(error)); else onDone()
  }

  return (
    <Modal title={`${t('transfer')} — ${task.id}`} description={task.title_ar} onClose={onClose}
           footer={<>
             <Button variant="primary" onClick={go} loading={busy}>{t('confirm')}</Button>
             <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
           </>}>
      {err && <Alert tone="danger">{err}</Alert>}
      <Field label={t('tFrom')}>
        {id => <input id={id} value={task.assignee_name || '—'} disabled />}
      </Field>
      <Field label={t('tTo')} required error={toErr}>
        {id => (
          <select id={id} value={to} onChange={e => setTo(e.target.value)} className={toErr ? 'input-err' : ''}>
            <option value="">اختر المسؤول…</option>
            {people.filter(p => p.id !== task.assigned_to).map(p => (
              <option key={p.id} value={p.id}>{p.name_ar}</option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t('tWhy')} required error={whyErr}
             hint="السبب بيتسجّل في سجل البند ومش هيتغيّر بعد كده.">
        {id => <input id={id} value={why} onChange={e => setWhy(e.target.value)}
                      className={whyErr ? 'input-err' : ''} placeholder="مثال: إعادة توزيع أحمال أعمال المياه" />}
      </Field>
    </Modal>
  )
}
