// =====================================================================
//  Site Tracker — Edge Function: إدارة حسابات الدخول من داخل الموقع
//  الاسم عند النشر:  admin-users
//
//  ليه Edge Function ومش استدعاء مباشر من المتصفح؟
//  إنشاء حساب دخول يحتاج مفتاح service_role اللي بيتجاوز كل سياسات RLS.
//  المفتاح ده ممنوع يوصل للمتصفح إطلاقًا، فبيفضل هنا على الخادم،
//  والدالة بتتأكد الأول إن اللي بينادي عليها أدمن فعلًا قبل أي إجراء.
//
//  الإجراءات: create · set_password · delete
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    // ---- 1) التحقق من هوية المُنادي ----
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!jwt) return json({ error: 'غير مصرّح — لا يوجد رمز جلسة' }, 401)

    const { data: caller, error: callerErr } = await admin.auth.getUser(jwt)
    if (callerErr || !caller?.user) return json({ error: 'جلسة غير صالحة' }, 401)

    // ---- 2) التأكد أنه أدمن نشط ----
    const { data: me } = await admin
      .from('profiles')
      .select('id, role, active, name_ar')
      .eq('auth_id', caller.user.id)
      .maybeSingle()

    if (!me || me.role !== 'admin' || !me.active)
      return json({ error: 'هذا الإجراء مقصور على الأدمن' }, 403)

    // ---- 3) تنفيذ الإجراء ----
    const { action, email, password, user_email } = await req.json()
    const target = (email || user_email || '').trim().toLowerCase()

    if (action === 'create') {
      if (!target || !password) return json({ error: 'البريد وكلمة المرور مطلوبان' }, 400)
      if (String(password).length < 8) return json({ error: 'كلمة المرور 8 أحرف على الأقل' }, 400)

      // لازم يكون فيه ملف شخصي بنفس البريد — المُشغّل بيربطهما تلقائيًا
      const { data: prof } = await admin
        .from('profiles').select('id, auth_id').eq('email', target).maybeSingle()
      if (!prof) return json({ error: 'لا يوجد ملف شخصي بهذا البريد — أضف المستخدم أولًا' }, 400)
      if (prof.auth_id) return json({ error: 'هذا المستخدم لديه حساب دخول بالفعل' }, 400)

      const { data, error } = await admin.auth.admin.createUser({
        email: target,
        password,
        email_confirm: true            // بدونها الحساب لا يستطيع الدخول
      })
      if (error) return json({ error: error.message }, 400)

      // شبكة أمان: لو المُشغّل ما ربطش لأي سبب، نربط يدويًا
      await admin.from('profiles').update({ auth_id: data.user.id })
        .eq('id', prof.id).is('auth_id', null)

      return json({ ok: true, user_id: data.user.id })
    }

    if (action === 'set_password') {
      if (!target || !password) return json({ error: 'البريد وكلمة المرور مطلوبان' }, 400)
      if (String(password).length < 8) return json({ error: 'كلمة المرور 8 أحرف على الأقل' }, 400)

      const { data: prof } = await admin
        .from('profiles').select('auth_id').eq('email', target).maybeSingle()
      if (!prof?.auth_id) return json({ error: 'لا يوجد حساب دخول لهذا المستخدم' }, 400)

      const { error } = await admin.auth.admin.updateUserById(prof.auth_id, { password })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (action === 'delete') {
      if (!target) return json({ error: 'البريد مطلوب' }, 400)

      const { data: prof } = await admin
        .from('profiles').select('id, auth_id, role').eq('email', target).maybeSingle()
      if (!prof) return json({ error: 'المستخدم غير موجود' }, 400)
      if (prof.id === me.id) return json({ error: 'لا يمكنك حذف حسابك أنت' }, 400)

      if (prof.auth_id) {
        const { error } = await admin.auth.admin.deleteUser(prof.auth_id)
        if (error) return json({ error: error.message }, 400)
      }
      // الملف الشخصي يفضل موجودًا مع auth_id = null حفاظًا على سجل البنود والتاريخ
      await admin.from('profiles').update({ auth_id: null, active: false }).eq('id', prof.id)
      return json({ ok: true })
    }

    return json({ error: 'إجراء غير معروف' }, 400)
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
})
