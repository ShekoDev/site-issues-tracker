import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured =
  Boolean(url && key && !url.includes('xxxxxxxx') && !key.startsWith('eyJhbGciOi...'))

/**
 * عميل Supabase الوحيد في التطبيق.
 * مفتاح anon آمن في المتصفح — كل الصلاحيات مفروضة بسياسات RLS داخل القاعدة.
 */
export const db = createClient(url || 'http://localhost', key || 'public-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
})

/** يحوّل خطأ Supabase إلى رسالة عربية مفهومة */
export function errText(e) {
  if (!e) return ''
  const m = e.message || String(e)
  if (/Invalid login credentials/i.test(m)) return 'بيانات الدخول غير صحيحة'
  if (/Email not confirmed/i.test(m)) return 'البريد غير مُفعّل — فعّله من لوحة Supabase'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال بالخادم — راجع رابط المشروع والاتصال بالإنترنت'
  if (/JWT|session/i.test(m)) return 'انتهت الجلسة — سجّل الدخول من جديد'
  return m
}
