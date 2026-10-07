export const num = n =>
  n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('en-US')

export const money = n =>
  n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  })

export const dstr = d => (d ? String(d).slice(0, 10) : null)

export const dtstr = d => {
  if (!d) return '—'
  const x = new Date(d)
  const p = n => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}`
}

/** «منذ 3 ساعات» — للسجل والنشاط */
export function ago(d, lang = 'ar') {
  if (!d) return '—'
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  const ar = [[60, 'ثانية'], [3600, 'دقيقة'], [86400, 'ساعة'], [2592000, 'يوم'], [31536000, 'شهر']]
  const en = [[60, 'sec'], [3600, 'min'], [86400, 'hr'], [2592000, 'day'], [31536000, 'month']]
  const units = lang === 'en' ? en : ar
  if (s < 60) return lang === 'en' ? 'just now' : 'الآن'
  let prev = 1
  for (const [lim, label] of units) {
    if (s < lim) {
      const v = Math.floor(s / prev)
      return lang === 'en' ? `${v} ${label}${v > 1 ? 's' : ''} ago` : `منذ ${v} ${label}`
    }
    prev = lim
  }
  const y = Math.floor(s / 31536000)
  return lang === 'en' ? `${y} yr ago` : `منذ ${y} سنة`
}

export const fileSize = b => {
  if (!b) return '—'
  const u = ['B', 'KB', 'MB']
  let i = 0, n = Number(b)
  while (n >= 1024 && i < 2) { n /= 1024; i++ }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`
}

export const daysLeft = due => {
  if (!due) return null
  const a = new Date(due + 'T00:00:00').getTime()
  const b = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
  return Math.round((a - b) / 86400000)
}
