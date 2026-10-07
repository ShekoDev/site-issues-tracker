import { useEffect, useState } from 'react'
import { db, errText } from '../lib/supabase'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/ToastContext'
import { PageHeader } from '../components/Layout'
import {
  Card, Bar, Badge, Button, Field, Modal, Alert, EmptyState, ErrorState,
  TableSkeleton, Icon
} from '../components/ui'
import { PERM_LABELS } from '../lib/constants'
import { ROLE_LABEL } from '../lib/i18n'
import { dtstr, ago } from '../lib/format'

const PRESENCE = {
  'نشِط الآن': 'success',
  'دخل خلال 24 ساعة': 'brand',
  'دخل خلال أسبوع': 'neutral',
  'لم يدخل منذ أكثر من أسبوع': 'warning',
  'حساب موجود ولم يدخل بعد': 'neutral',
  'لم يُنشأ حساب دخول': 'danger'
}
const ROLES = ['admin', 'manager', 'user', 'viewer']
const ROLE_HINT = {
  admin: 'تحكّم كامل: كل البنود والمستخدمين والإعدادات',
  manager: 'يرى ويعدّل كل البنود وينقلها — بدون حذف ولا إدارة مستخدمين',
  user: 'يرى بنوده هو فقط ويحدّث إنجازها وتكاليفها',
  viewer: 'اطّلاع فقط بدون أي تعديل'
}

async function adminFn(action, payload) {
  const { data, error } = await db.functions.invoke('admin-users', { body: { action, ...payload } })
  if (error) {
    let m = error.message
    try { m = (await error.context?.json())?.error || m } catch { /* تجاهل */ }
    return { error: m }
  }
  if (data?.error) return { error: data.error }
  return { ok: true, data }
}

const initials = n => (n || '?').replace(/^م\.\s*/, '').trim().charAt(0)

export default function Users() {
  const { t, lang, isAdmin } = useApp()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [perms, setPerms] = useState({})
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(null)
  const [tab, setTab] = useState('people')

  const load = () => {
    setErr('')
    Promise.all([
      db.from('v_user_activity').select('*').order('tasks_total', { ascending: false }),
      db.from('profiles').select('id,permissions')
    ]).then(([a, b]) => {
      if (a.error) setErr(errText(a.error))
      setRows(a.data || [])
      setPerms(Object.fromEntries((b.data || []).map(p => [p.id, p.permissions || {}])))
    })
  }

  useEffect(() => { load() }, [])

  const done = msg => { setModal(null); toast.success(msg); load() }

  if (err && !rows) return (
    <><PageHeader title={t('users')} /><div className="page"><div className="card">
      <ErrorState description={err} onRetry={load} /></div></div></>
  )

  const noAccount = (rows || []).filter(u => !u.account_linked).length

  return (
    <>
      <PageHeader title={t('users')} crumbs={[{ label: 'الإدارة' }, { label: t('users') }]}>
        <Button variant="ghost" size="sm" icon="refresh" onClick={load} aria-label="تحديث" />
        {isAdmin && (
          <Button variant="primary" size="sm" icon="userPlus" onClick={() => setModal({ kind: 'new' })}>
            مستخدم جديد
          </Button>
        )}
      </PageHeader>

      <div className="page">
        {isAdmin && noAccount > 0 && (
          <Alert tone="warning" title={`${noAccount} مستخدم بلا حساب دخول`}>
            الأسماء موجودة في النظام لكن مش هيقدروا يدخلوا لحد ما تنشئ لهم حساب — زرّ «إنشاء حساب» في صفّهم.
          </Alert>
        )}

        <div className="segment section" role="tablist">
          <button role="tab" aria-selected={tab === 'people'} className={tab === 'people' ? 'on' : ''}
                  onClick={() => setTab('people')}>
            <Icon name="users" size={14} />المستخدمون والنشاط
          </button>
          <button role="tab" aria-selected={tab === 'perms'} className={tab === 'perms' ? 'on' : ''}
                  onClick={() => setTab('perms')}>
            <Icon name="key" size={14} />مصفوفة الصلاحيات
          </button>
        </div>

        {!rows ? <TableSkeleton rows={6} cols={6} /> : tab === 'people' ? (
          <div className="table-wrap">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>{t('role')}</th>
                    <th>{t('presence')}</th>
                    <th>{t('lastAction')}</th>
                    <th style={{ width: 150 }}>حِمل العمل</th>
                    {isAdmin && <th className="actions-cell">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(u => (
                    <tr key={u.id}>
                      <td style={{ minWidth: 230 }}>
                        <div className="row" style={{ gap: 10 }}>
                          <span className="avatar" aria-hidden="true">{initials(u.name_ar)}</span>
                          <div style={{ minWidth: 0 }}>
                            <span className="cell-title">{lang === 'en' ? (u.name_en || u.name_ar) : u.name_ar}</span>
                            <div className="t-xs tx-3 truncate">{u.job_title}</div>
                            <div className="mono t-xs tx-4 truncate" dir="ltr">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="nw t-sm">{ROLE_LABEL[lang][u.role] || u.role}</td>
                      <td className="nw">
                        <Badge tone={PRESENCE[u.presence] || 'neutral'}>{u.presence}</Badge>
                        <div className="t-xs tx-3" style={{ marginTop: 4 }}>
                          {u.login_count ? `${u.login_count} مرة دخول` : 'لم يسجّل دخولًا'}
                          {u.last_login_at && ` · ${ago(u.last_login_at, lang)}`}
                        </div>
                      </td>
                      <td style={{ minWidth: 200 }}>
                        {u.last_action_text ? (
                          <>
                            <span className="t-sm">{u.last_action_text}</span>
                            {u.last_action_task && (
                              <div className="cell-meta" style={{ maxWidth: 260 }}>
                                <span className="code-chip">{u.last_action_task}</span>
                                <span className="t-xs tx-3 truncate">{u.last_action_task_title}</span>
                              </div>
                            )}
                            <div className="t-xs tx-4">{ago(u.last_action_at, lang)} · {u.actions_7d} إجراء آخر ٧ أيام</div>
                          </>
                        ) : <span className="tx-4 t-sm">لا يوجد نشاط</span>}
                      </td>
                      <td className="nw">
                        <div className="progress-cell">
                          <Bar value={u.avg_progress} />
                          <span className="pct">{u.avg_progress}%</span>
                        </div>
                        <span className="mono t-xs tx-3">{u.tasks_completed}/{u.tasks_total} بند</span>
                      </td>
                      {isAdmin && (
                        <td className="nw actions-cell">
                          <div className="row" style={{ gap: 4 }}>
                            {!u.account_linked
                              ? <Button variant="primary" size="sm" icon="key"
                                        onClick={() => setModal({ kind: 'account', user: u })}>إنشاء حساب</Button>
                              : <Button variant="ghost" size="sm" icon="key" aria-label="تغيير كلمة المرور"
                                        onClick={() => setModal({ kind: 'password', user: u })} />}
                            <Button variant="ghost" size="sm" icon="edit" aria-label="تعديل المستخدم"
                                    onClick={() => setModal({ kind: 'edit', user: u })} />
                            {u.account_linked && u.role !== 'admin' &&
                              <Button variant="ghost" size="sm" icon="logout" aria-label="تعطيل الحساب"
                                      onClick={() => setModal({ kind: 'remove', user: u })} />}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Card title="مصفوفة الصلاحيات" meta={`${rows.length} مستخدم`} bodyClass="tight">
            <p className="t-sm tx-3" style={{ marginBottom: 12 }}>
              الصلاحيات مفروضة داخل قاعدة البيانات نفسها — إخفاء الأزرار في الواجهة للتسهيل فقط.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    {Object.keys(PERM_LABELS).map(k => (
                      <th key={k} style={{ writingMode: 'vertical-rl', height: 116, fontSize: 10.5, padding: '8px 4px' }}>
                        {PERM_LABELS[k][lang === 'en' ? 1 : 0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(u => (
                    <tr key={u.id}>
                      <td className="nw t-sm">{u.name_ar}</td>
                      {Object.keys(PERM_LABELS).map(k => {
                        const on = perms[u.id]?.[k]
                        return (
                          <td key={k} style={{ textAlign: 'center', padding: '10px 4px' }}>
                            <span aria-label={on ? 'مفعّلة' : 'غير مفعّلة'}
                                  style={{ color: on ? 'var(--su)' : 'var(--line)' }}>
                              {on ? <Icon name="check" size={14} style={{ margin: '0 auto' }} /> : '·'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {modal?.kind === 'new' && <NewUser onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'account' && <MakeAccount u={modal.user} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'password' && <SetPassword u={modal.user} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'edit' && <EditUser u={modal.user} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'remove' && <RemoveUser u={modal.user} onClose={() => setModal(null)} onDone={done} />}
    </>
  )
}

/* ---------------- مستخدم جديد ---------------- */
function NewUser({ onClose, onDone }) {
  const [v, setV] = useState({ name_ar: '', name_en: '', username: '', job_title: '', role: 'user', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const set = (k, val) => setV(s => ({ ...s, [k]: val }))
  const email = v.username ? `${v.username.trim().toLowerCase()}@tracker.local` : ''

  const e = {
    name_ar: !v.name_ar.trim() ? 'الاسم مطلوب' : '',
    username: !v.username.trim() ? 'اسم الدخول مطلوب'
      : !/^[a-z0-9._-]+$/.test(v.username.trim().toLowerCase())
        ? 'حروف إنجليزية صغيرة وأرقام ونقطة فقط' : '',
    password: v.password.length < 8 ? 'كلمة المرور 8 أحرف على الأقل' : ''
  }
  const E = k => (touched ? e[k] : '')

  async function save() {
    setTouched(true)
    if (Object.values(e).some(Boolean)) return
    setBusy(true); setErr('')
    const { error: pErr } = await db.from('profiles').insert({
      username: v.username.trim().toLowerCase(), email,
      name_ar: v.name_ar.trim(), name_en: v.name_en.trim() || null,
      job_title: v.job_title.trim() || null, role: v.role
    })
    if (pErr) {
      setBusy(false)
      setErr(/duplicate|unique/i.test(pErr.message) ? 'اسم الدخول أو البريد مستخدم بالفعل' : errText(pErr))
      return
    }
    const r = await adminFn('create', { email, password: v.password })
    setBusy(false)
    if (r.error) { setErr(`اتضاف المستخدم لكن فشل إنشاء حساب الدخول: ${r.error} — استخدم زر «إنشاء حساب» من الجدول.`); return }
    onDone(`تمت إضافة ${v.name_ar} — يدخل بـ ${email}`)
  }

  return (
    <Modal title="إضافة مستخدم جديد"
           description="هيتعمل له ملف شخصي وحساب دخول في خطوة واحدة"
           onClose={onClose}
           footer={<>
             <Button variant="primary" onClick={save} loading={busy}>إضافة المستخدم</Button>
             <Button variant="ghost" onClick={onClose}>إلغاء</Button>
           </>}>
      {err && <Alert tone="danger">{err}</Alert>}
      <Field label="الاسم بالعربي" required error={E('name_ar')}>
        {i => <input id={i} value={v.name_ar} className={E('name_ar') ? 'input-err' : ''}
                     placeholder="م. أحمد علي" onChange={ev => set('name_ar', ev.target.value)} />}
      </Field>
      <Field label="الاسم بالإنجليزي">
        {i => <input id={i} dir="ltr" value={v.name_en} onChange={ev => set('name_en', ev.target.value)} />}
      </Field>
      <Field label="اسم الدخول" required error={E('username')}
             hint={email ? `يدخل بالبريد: ${email}` : 'حروف إنجليزية صغيرة بدون مسافات'}>
        {i => <input id={i} dir="ltr" value={v.username} className={E('username') ? 'input-err' : ''}
                     placeholder="ahmed.ali" onChange={ev => set('username', ev.target.value)} />}
      </Field>
      <Field label="المسمى الوظيفي">
        {i => <input id={i} value={v.job_title} onChange={ev => set('job_title', ev.target.value)} />}
      </Field>
      <Field label="الدور" hint={ROLE_HINT[v.role]}>
        {i => (
          <select id={i} value={v.role} onChange={ev => set('role', ev.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL.ar[r]}</option>)}
          </select>
        )}
      </Field>
      <Field label="كلمة مرور مؤقتة" required error={E('password')}
             hint="سلّمها للمستخدم واطلب منه تغييرها بعد أول دخول">
        {i => <input id={i} dir="ltr" value={v.password} className={E('password') ? 'input-err' : ''}
                     onChange={ev => set('password', ev.target.value)} />}
      </Field>
    </Modal>
  )
}

/* ---------------- إنشاء حساب دخول ---------------- */
function MakeAccount({ u, onClose, onDone }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false); const [touched, setTouched] = useState(false)
  const e = pw.length < 8 ? 'كلمة المرور 8 أحرف على الأقل' : ''

  async function go() {
    setTouched(true); if (e) return
    setBusy(true); setErr('')
    const r = await adminFn('create', { email: u.email, password: pw })
    setBusy(false)
    if (r.error) setErr(r.error); else onDone(`تم إنشاء حساب دخول لـ ${u.name_ar}`)
  }

  return (
    <Modal title={`إنشاء حساب دخول — ${u.name_ar}`} onClose={onClose}
           footer={<>
             <Button variant="primary" onClick={go} loading={busy}>إنشاء الحساب</Button>
             <Button variant="ghost" onClick={onClose}>إلغاء</Button>
           </>}>
      {err && <Alert tone="danger">{err}</Alert>}
      <Field label="البريد">{i => <input id={i} dir="ltr" value={u.email || ''} disabled />}</Field>
      <Field label="كلمة مرور مؤقتة" required error={touched ? e : ''}>
        {i => <input id={i} dir="ltr" value={pw} className={touched && e ? 'input-err' : ''}
                     onChange={ev => setPw(ev.target.value)} />}
      </Field>
    </Modal>
  )
}

/* ---------------- كلمة المرور ---------------- */
function SetPassword({ u, onClose, onDone }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false); const [touched, setTouched] = useState(false)
  const e = pw.length < 8 ? 'كلمة المرور 8 أحرف على الأقل' : ''

  async function go() {
    setTouched(true); if (e) return
    setBusy(true); setErr('')
    const r = await adminFn('set_password', { email: u.email, password: pw })
    setBusy(false)
    if (r.error) setErr(r.error); else onDone(`تم تغيير كلمة مرور ${u.name_ar}`)
  }

  return (
    <Modal title={`كلمة المرور — ${u.name_ar}`} onClose={onClose}
           footer={<>
             <Button variant="primary" onClick={go} loading={busy}>حفظ كلمة المرور</Button>
             <Button variant="ghost" onClick={onClose}>إلغاء</Button>
           </>}>
      {err && <Alert tone="danger">{err}</Alert>}
      <Field label="كلمة المرور الجديدة" required error={touched ? e : ''}>
        {i => <input id={i} dir="ltr" value={pw} className={touched && e ? 'input-err' : ''}
                     onChange={ev => setPw(ev.target.value)} />}
      </Field>
    </Modal>
  )
}

/* ---------------- تعديل ---------------- */
function EditUser({ u, onClose, onDone }) {
  const [role, setRole] = useState(u.role)
  const [active, setActive] = useState(u.active)
  const [jobTitle, setJobTitle] = useState(u.job_title || '')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true); setErr('')
    const patch = { active, job_title: jobTitle.trim() || null }
    if (role !== u.role) { patch.role = role; patch.permissions = {} }
    const { error } = await db.from('profiles').update(patch).eq('id', u.id)
    setBusy(false)
    if (error) setErr(errText(error)); else onDone('تم حفظ التعديلات')
  }

  return (
    <Modal title={`تعديل — ${u.name_ar}`} onClose={onClose}
           footer={<>
             <Button variant="primary" onClick={save} loading={busy}>حفظ</Button>
             <Button variant="ghost" onClick={onClose}>إلغاء</Button>
           </>}>
      {err && <Alert tone="danger">{err}</Alert>}
      <Field label="المسمى الوظيفي">
        {i => <input id={i} value={jobTitle} onChange={e => setJobTitle(e.target.value)} />}
      </Field>
      <Field label="الدور" hint={ROLE_HINT[role]}>
        {i => (
          <select id={i} value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL.ar[r]}</option>)}
          </select>
        )}
      </Field>
      {role !== u.role && (
        <Alert tone="info">تغيير الدور يعيد ضبط الصلاحيات على الافتراضي المعرّف في القاعدة للدور الجديد.</Alert>
      )}
      <label className="check">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        حساب نشط
      </label>
    </Modal>
  )
}

/* ---------------- تعطيل ---------------- */
function RemoveUser({ u, onClose, onDone }) {
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true); setErr('')
    const r = await adminFn('delete', { email: u.email })
    setBusy(false)
    if (r.error) setErr(r.error); else onDone(`تم تعطيل حساب ${u.name_ar}`)
  }
  return (
    <Modal title={`تعطيل حساب — ${u.name_ar}`} onClose={onClose}
           footer={<>
             <Button variant="danger" onClick={go} loading={busy}>تعطيل الحساب</Button>
             <Button variant="ghost" onClick={onClose}>إلغاء</Button>
           </>}>
      {err && <Alert tone="danger">{err}</Alert>}
      <Alert tone="warning" title="ماذا سيحدث؟">
        هيتحذف حساب الدخول ومش هيقدر يدخل النظام تاني.
      </Alert>
      <p className="t-sm tx-2">
        <b>بنوده وسجل تغييراته وملاحظاته تفضل كما هي</b> — النظام ما بيمسحش التاريخ.
        وتقدر تعمله حساب جديد في أي وقت بزرّ «إنشاء حساب».
      </p>
    </Modal>
  )
}
