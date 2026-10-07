import { useEffect, useRef, useId } from 'react'
import Icon from './Icon'
import { useApp } from '../state/AppContext'

/* ============================== الأزرار ============================== */
export function Button({
  variant = 'secondary', size = '', loading = false, icon, iconEnd,
  children, className = '', type = 'button', ...rest
}) {
  const cls = [
    'btn', `btn-${variant}`, size && `btn-${size}`,
    loading && 'loading', !children && icon && 'btn-icon', className
  ].filter(Boolean).join(' ')
  return (
    <button type={type} className={cls} aria-busy={loading || undefined}
            disabled={rest.disabled || loading} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconEnd && <Icon name={iconEnd} />}
    </button>
  )
}

/* ============================== الحقول ============================== */
export function Field({ label, hint, error, required, children, id }) {
  const auto = useId()
  const fid = id || auto
  const child = typeof children === 'function' ? children(fid) : children
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={fid}>
          {label}{required && <span className="req" aria-hidden="true">*</span>}
        </label>
      )}
      {child}
      {error
        ? <span className="field-error" role="alert"><Icon name="alertCircle" size={13} />{error}</span>
        : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder, ...rest }) {
  return (
    <span className="input-icon">
      <Icon name="search" />
      <input type="search" value={value} placeholder={placeholder}
             onChange={e => onChange(e.target.value)} {...rest} />
      {value && (
        <button type="button" className="clear" onClick={() => onChange('')} aria-label="مسح البحث">
          <Icon name="x" size={13} />
        </button>
      )}
    </span>
  )
}

/* ============================== البطاقات ============================== */
export function Card({ title, meta, actions, children, footer, className = '', bodyClass = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h3>{title}</h3>}
          {meta != null && meta !== '' && <span className="meta">{meta}</span>}
          {actions && <span style={{ marginInlineStart: 'auto' }} className="row">{actions}</span>}
        </header>
      )}
      <div className={`card-body ${bodyClass}`}>{children}</div>
      {footer && <div className="card-foot">{footer}</div>}
    </section>
  )
}

export function Kpi({ label, value, sub, tone, icon, hero, as: As = 'div', ...rest }) {
  return (
    <As className={`kpi ${hero ? 'kpi-hero' : ''} ${tone ? `is-${tone}` : ''}`} {...rest}>
      <span className="k-label">{icon && <Icon name={icon} size={14} />}{label}</span>
      <span className="k-value">{value}</span>
      {sub && <span className="k-sub">{sub}</span>}
    </As>
  )
}

/* ============================== الشارات ============================== */
const STATUS_TONE = {
  completed: 'success', in_progress: 'brand', pending: 'neutral',
  on_hold: 'warning', cancelled: 'neutral'
}
const PRIORITY_TONE = { critical: 'danger', high: 'warning', medium: 'brand', low: 'neutral' }

export function Badge({ tone = 'neutral', dot = true, children }) {
  return <span className={`badge badge-${tone}`}>{dot && <i className="dot" />}{children}</span>
}
export function StatusBadge({ status }) {
  const { t } = useApp()
  return <Badge tone={STATUS_TONE[status] || 'neutral'}>{t(status)}</Badge>
}
export function PriorityBadge({ priority }) {
  const { t } = useApp()
  return <Badge tone={PRIORITY_TONE[priority] || 'neutral'}>{t(priority)}</Badge>
}

/* ============================== التقدّم ============================== */
export function Bar({ value = 0, done, size = '', label }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <span className={`bar ${size ? `bar-${size}` : ''}`} role="progressbar"
          aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i className={done ? 'is-done' : ''} style={{ width: `${v}%` }} />
    </span>
  )
}

/* ============================== الحالات ============================== */
export function Skeleton({ w, h = 11, style }) {
  return <span className="sk" style={{ width: w, height: h, ...style }} />
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-live="polite">
      <div style={{ padding: 14 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="row-3" style={{ padding: '10px 0', gap: 16 }}>
            <Skeleton w={26} />
            <Skeleton w={`${34 + (i % 3) * 8}%`} h={13} />
            <span className="spacer" />
            {Array.from({ length: cols - 2 }).map((_, j) => <Skeleton key={j} w={64} />)}
          </div>
        ))}
      </div>
      <span className="sr-only">جارٍ تحميل البيانات…</span>
    </div>
  )
}

export function CardsSkeleton({ n = 6 }) {
  return (
    <div className="task-cards" aria-busy="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 16 }}>
          <Skeleton w={80} h={16} style={{ marginBottom: 12 }} />
          <Skeleton className="sk-title" w="80%" h={14} />
          <Skeleton w="100%" />
          <Skeleton w="60%" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="state">
      <span className="ico-wrap"><Icon name={icon} size={20} /></span>
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ title = 'تعذّر تحميل البيانات', description, onRetry }) {
  return (
    <div className="state is-error">
      <span className="ico-wrap"><Icon name="alertCircle" size={20} /></span>
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {onRetry && <Button variant="secondary" icon="refresh" onClick={onRetry}>حاول مرة أخرى</Button>}
    </div>
  )
}

const ALERT_ICON = { danger: 'alertCircle', success: 'checkCircle', warning: 'alert', info: 'info' }
export function Alert({ tone = 'info', title, children, onClose }) {
  if (!children && !title) return null
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICON[tone]} />
      <div className="alert-body">{title && <b>{title}</b>}{children}</div>
      {onClose && (
        <button onClick={onClose} aria-label="إغلاق" style={{ color: 'inherit', opacity: .7 }}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  )
}

/* ============================== النوافذ ============================== */
export function Modal({ title, description, onClose, children, footer, wide }) {
  const ref = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = ref.current?.querySelector('input,select,textarea,button')
    first?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}
           style={wide ? { width: 'min(720px,100%)' } : undefined}>
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          <button className="modal-x" onClick={onClose} aria-label="إغلاق"><Icon name="x" size={15} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export { Icon }

/* ============================== رسوم بسيطة ============================== */
/** قائمة أشرطة أفقية بلون واحد — لمقارنة مقادير */
export function BarList({ rows, max }) {
  const top = max ?? Math.max(1, ...rows.map(r => r.value || 0))
  return (
    <div className="barlist">
      {rows.map((r, i) => (
        <div className="barlist-row" key={i}>
          <span className="lb" title={r.label}>{r.label}</span>
          <span className="bar bar-lg">
            <i style={{ width: `${((r.value || 0) / top) * 100}%`, background: r.color }} />
          </span>
          <span className="vv">{r.note ?? r.value}</span>
        </div>
      ))}
    </div>
  )
}

/** شريط مكدّس + مفتاح نصّي — الحالة لا تُفهم باللون وحده */
export function StackBar({ parts }) {
  const total = parts.reduce((a, p) => a + (p.value || 0), 0) || 1
  return (
    <>
      <div className="stack" role="img"
           aria-label={parts.map(p => `${p.label}: ${p.value}`).join('، ')}>
        {parts.filter(p => p.value > 0).map((p, i) => (
          <i key={i} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <div className="legend">
        {parts.map((p, i) => (
          <span key={i}><i style={{ background: p.color }} />{p.label} <b>{p.value}</b></span>
        ))}
      </div>
    </>
  )
}
