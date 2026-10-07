import { useEffect, useState } from 'react'
import { db, errText } from '../lib/supabase'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/ToastContext'
import { PageHeader } from '../components/Layout'
import { Card, Field, Button, Alert, Skeleton, ErrorState } from '../components/ui'

export default function Settings() {
  const { t, settings, setSettings } = useApp()
  const toast = useToast()
  const [alerts, setAlerts] = useState({ due_soon_days: 7, cost_overrun_pct: 10 })
  const [initial, setInitial] = useState(null)
  const [project, setProject] = useState({})
  const [cats, setCats] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.from('app_settings').select('key,value').then(({ data, error }) => {
      if (error) setErr(errText(error))
      const m = Object.fromEntries((data || []).map(r => [r.key, r.value]))
      if (m.alerts) { setAlerts(m.alerts); setInitial(m.alerts) }
      if (m.project) setProject(m.project)
      if (m.categories) setCats(m.categories)
      setLoading(false)
    })
  }, [])

  const dirty = initial && JSON.stringify(initial) !== JSON.stringify(alerts)

  async function save() {
    setBusy(true); setErr('')
    const { error } = await db.from('app_settings').upsert([{ key: 'alerts', value: alerts }], { onConflict: 'key' })
    setBusy(false)
    if (error) { setErr(errText(error)); return }
    setSettings({ ...settings, alerts })
    setInitial(alerts)
    toast.success(t('settingsSaved'))
  }

  if (loading) return (
    <><PageHeader title={t('settings')} /><div className="page" style={{ maxWidth: 760 }}>
      <div className="card" style={{ padding: 24 }}><Skeleton w="40%" h={14} /><Skeleton /><Skeleton /></div>
    </div></>
  )

  return (
    <>
      <PageHeader title={t('settings')} crumbs={[{ label: 'الإدارة' }, { label: t('settings') }]}>
        {dirty && <Button variant="primary" size="sm" onClick={save} loading={busy}>حفظ التغييرات</Button>}
      </PageHeader>

      <div className="page" style={{ maxWidth: 760 }}>
        {err && <Alert tone="danger" onClose={() => setErr('')}>{err}</Alert>}

        <Card title="التنبيهات" className="section"
              footer={
                <div className="row" style={{ gap: 8 }}>
                  <Button variant="primary" onClick={save} loading={busy} disabled={!dirty}>
                    {dirty ? 'حفظ التغييرات' : 'محفوظ'}
                  </Button>
                  {dirty && <Button variant="ghost" onClick={() => setAlerts(initial)}>تراجع</Button>}
                </div>
              }>
          <div className="grid g-2" style={{ gap: 0, columnGap: 16 }}>
            <Field label={t('dueSoon')} hint="عدد الأيام اللي يعتبر البند بعدها قريب الاستحقاق">
              {i => <input id={i} type="number" min="1" max="60" value={alerts.due_soon_days}
                           onChange={e => setAlerts({ ...alerts, due_soon_days: Number(e.target.value) })} />}
            </Field>
            <Field label={t('costOver')} hint="النسبة اللي لو التكلفة الفعلية تجاوزت المقدرة بها يتنبّه النظام">
              {i => <input id={i} type="number" min="0" max="100" value={alerts.cost_overrun_pct}
                           onChange={e => setAlerts({ ...alerts, cost_overrun_pct: Number(e.target.value) })} />}
            </Field>
          </div>
          <Alert tone="info">
            صفحة «تحتاج انتباه» تستخدم ٧ أيام ثابتة داخل قاعدة البيانات؛ القيمة دي تُستعمل في تنبيهات الواجهة،
            ولتغيير العرض نفسه يلزم تعديل في القاعدة.
          </Alert>
        </Card>

        <Card title="بيانات المشروع" className="section">
          <dl className="kv">
            <dt>الكود</dt><dd className="mono">{project.code || '—'}</dd>
            <dt>الاسم</dt><dd>{project.name_ar || '—'}</dd>
            <dt>العملة</dt><dd className="mono">{project.currency || '—'}</dd>
            <dt>الملف المصدر</dt><dd className="t-sm" style={{ fontWeight: 400 }}>{project.source_file || '—'}</dd>
          </dl>
        </Card>

        <Card title="التصنيفات" meta={String(cats.length)}>
          <p className="t-sm tx-3" style={{ marginBottom: 12 }}>
            التصنيفات المعتمدة للبنود — تُستخدم في الفلاتر والتجميع والتقارير.
          </p>
          <div className="row wrapf" style={{ gap: 6 }}>
            {cats.map(c => <span key={c} className="badge badge-neutral" style={{ padding: '4px 10px' }}>{c}</span>)}
          </div>
        </Card>
      </div>
    </>
  )
}
