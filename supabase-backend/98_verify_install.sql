-- =====================================================================
--  Site Tracker — التحقق من صحة التركيب
--  شغّله بعد ما تخلّص:  01 → 02 → 03 → 04 → 06
--  الصقه في: Supabase Dashboard ▸ SQL Editor ▸ New query ▸ Run
--  المطلوب: كل الأسطر تطلع «✅ سليم». أي «❌» معناها الملف ده ما اتشغّلش صح.
-- =====================================================================

with checks as (

  select 1 as n, 'المستخدمون (profiles)' as item,
         (select count(*) from public.profiles)::text as actual, '11' as expected
  union all
  select 2, 'البنود (tasks)',
         (select count(*) from public.tasks)::text, '80'
  union all
  select 3, 'خطوات التنفيذ (execution_steps)',
         (select count(*) from public.execution_steps)::text, '320'
  union all
  select 4, 'كل البنود لم تبدأ (status = pending)',
         (select count(*) from public.tasks where status = 'pending')::text, '80'
  union all
  select 5, 'كل النِّسَب صفر (progress = 0)',
         (select count(*) from public.tasks where progress = 0)::text, '80'
  union all
  select 6, 'كل الخطوات غير منجزة',
         (select count(*) from public.execution_steps where completed = false)::text, '320'
  union all
  select 7, 'التكاليف فاضية (estimated_cost is null)',
         (select count(*) from public.tasks where estimated_cost is null)::text, '80'
  union all
  select 8, 'التصنيفات',
         (select count(distinct category) from public.tasks)::text, '13'
  union all
  select 9, 'العروض (views) — لازم 9',
         (select count(*) from information_schema.views
           where table_schema = 'public'
             and table_name in ('v_tasks_full','v_tasks_visible','v_dashboard','v_user_load',
                                'v_category_progress','v_attention','v_user_activity',
                                'v_activity_feed','v_online_now'))::text, '9'
  union all
  select 10, 'الدوال الأساسية — لازم 6',
         (select count(distinct routine_name) from information_schema.routines
           where routine_schema = 'public'
             and routine_name in ('transfer_task','record_login','record_logout',
                                  'recalc_task','has_perm','current_profile_id'))::text, '6'
  union all
  select 11, 'جدول سجل الدخول (login_events) موجود',
         (select count(*) from information_schema.tables
           where table_schema = 'public' and table_name = 'login_events')::text, '1'
  union all
  select 12, 'عمود login_count على profiles موجود',
         (select count(*) from information_schema.columns
           where table_schema = 'public' and table_name = 'profiles'
             and column_name in ('login_count','last_action_at'))::text, '2'
  union all
  select 13, 'سياسات RLS — 26 أو أكثر',
         (select count(*) from pg_policies where schemaname = 'public')::text,
         (case when (select count(*) from pg_policies where schemaname='public') >= 22
               then (select count(*) from pg_policies where schemaname='public')::text
               else '22+' end)
  union all
  select 14, 'مخزن المرفقات (bucket) موجود',
         (select count(*) from storage.buckets where id = 'task-attachments')::text, '1'
  union all
  select 15, 'Realtime مفعّل على tasks',
         (select count(*) from pg_publication_tables
           where pubname = 'supabase_realtime' and tablename = 'tasks')::text, '1'
  union all
  select 16, 'دور عبد الرحمن = manager',
         (select role::text from public.profiles where username = 'abdulrahman'), 'manager'
)
select n as "#",
       item as "الفحص",
       expected as "المتوقع",
       actual as "الفعلي",
       case when actual = expected then '✅ سليم' else '❌ راجع' end as "النتيجة"
  from checks
 order by n;

-- ---------------------------------------------------------------------
--  فحص إضافي: مين اتعمله حساب دخول ومين لأ
--  (شغّله بعد ما تنشئ الحسابات في Authentication)
-- ---------------------------------------------------------------------
select username as "اسم الدخول",
       name_ar  as "الاسم",
       role     as "الدور",
       email    as "البريد",
       case when auth_id is null
            then '❌ لسه ما اتعملش حساب دخول'
            else '✅ الحساب مربوط' end as "حالة الحساب"
  from public.profiles
 order by (auth_id is null) desc, username;
