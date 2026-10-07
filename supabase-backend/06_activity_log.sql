-- =====================================================================
--  Site Tracker — الملف 6 : سجل الدخول ونشاط المستخدمين + تفعيل Realtime
--  MIGRATION منفصل — لا يعدّل الملفات 01..04، ويُشغَّل بعدها.
--  الصقه في: Supabase Dashboard ▸ SQL Editor ▸ New query ▸ Run
--
--  إيه اللي بيعمله:
--   1) يفعّل Realtime فعليًا (كان مذكورًا في الدليل وغير منفَّذ في SQL)
--   2) جدول login_events — كل تسجيل دخول وخروج، غير قابل للتعديل أو الحذف
--   3) عمودان على profiles: last_action_at و login_count
--   4) دالتان: record_login و record_logout تُستدعيان من الواجهة
--   5) ثلاثة عروض للأدمن: v_user_activity · v_activity_feed · v_online_now
--   6) سياسات RLS: المستخدم يرى سجله فقط، والأدمن يرى الكل
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) تفعيل Realtime — كان ناقصًا
--    محميّ بـ DO عشان يشتغل برضو على PostgreSQL عادي بدون Supabase
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime'
                      and schemaname = 'public' and tablename = 'tasks') then
      alter publication supabase_realtime add table public.tasks;
    end if;
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime'
                      and schemaname = 'public' and tablename = 'execution_steps') then
      alter publication supabase_realtime add table public.execution_steps;
    end if;
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime'
                      and schemaname = 'public' and tablename = 'task_history') then
      alter publication supabase_realtime add table public.task_history;
    end if;
    raise notice 'Realtime: تم تفعيله على tasks و execution_steps و task_history';
  else
    raise notice 'Realtime: منشور supabase_realtime غير موجود (طبيعي خارج Supabase) — تم التخطي';
  end if;
end $$;

-- REPLICA IDENTITY FULL عشان أحداث UPDATE ترجّع القيم القديمة كمان
alter table public.tasks            replica identity full;
alter table public.execution_steps  replica identity full;

-- ---------------------------------------------------------------------
-- 2) أعمدة إضافية على profiles
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists last_action_at timestamptz;
alter table public.profiles add column if not exists login_count    integer not null default 0;

comment on column public.profiles.last_action_at is 'آخر تعديل فعلي عمله المستخدم على أي بند — يُحدَّث تلقائيًا';
comment on column public.profiles.login_count    is 'عدد مرات تسجيل الدخول';

-- ---------------------------------------------------------------------
-- 3) جدول سجل الدخول والخروج
--    غير قابل للتعديل أو الحذف من أي حد بما فيهم الأدمن — نفس مبدأ task_history
-- ---------------------------------------------------------------------
create table if not exists public.login_events (
  id          bigserial primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  event       text not null check (event in ('login','logout')),
  user_agent  text,
  platform    text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_login_profile on public.login_events(profile_id, created_at desc);
create index if not exists idx_login_time    on public.login_events(created_at desc);
comment on table public.login_events is 'سجل تسجيل الدخول والخروج — للقراءة فقط، الكتابة حصرًا عبر record_login / record_logout';

-- ---------------------------------------------------------------------
-- 4) تحديث last_action_at تلقائيًا من سجل التغييرات
--    مُشغّل جديد على task_history — من غير أي تعديل على مُشغّلات الملف 01
-- ---------------------------------------------------------------------
create or replace function public.trg_touch_last_action() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.actor_id is not null then
    update public.profiles set last_action_at = new.created_at where id = new.actor_id;
  end if;
  return null;
end $$;

drop trigger if exists history_touch_actor on public.task_history;
create trigger history_touch_actor after insert on public.task_history
for each row execute function public.trg_touch_last_action();

-- ---------------------------------------------------------------------
-- 5) دوال تسجيل الدخول والخروج — تُستدعى من الواجهة بعد نجاح signIn / قبل signOut
-- ---------------------------------------------------------------------
create or replace function public.record_login(p_user_agent text default null,
                                               p_platform   text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid := public.current_profile_id();
begin
  if v_id is null then
    raise exception 'لا يوجد ملف شخصي مرتبط بحساب الدخول الحالي';
  end if;
  insert into public.login_events(profile_id, event, user_agent, platform)
  values (v_id, 'login', left(coalesce(p_user_agent,''), 400), left(coalesce(p_platform,''), 80));
  update public.profiles
     set last_login_at = now(),
         login_count   = login_count + 1
   where id = v_id;
end $$;

create or replace function public.record_logout()
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid := public.current_profile_id();
begin
  if v_id is null then return; end if;
  insert into public.login_events(profile_id, event) values (v_id, 'logout');
end $$;

-- ---------------------------------------------------------------------
-- 6) تسمية الأحداث بالعربي — تُستعمل في العروض وفي الواجهة
-- ---------------------------------------------------------------------
create or replace function public.action_label_ar(p_action text, p_field text default null)
returns text language sql immutable as $$
  select case p_action
    when 'created'         then 'إنشاء بند'
    when 'transferred'     then 'نقل بند لمسؤول آخر'
    when 'step_completed'  then 'تحديث خطوة تنفيذ'
    when 'status_changed'  then 'تغيير حالة البند'
    when 'cost_updated'    then 'تحديث التكلفة'
    when 'note_added'      then 'إضافة ملاحظة'
    when 'file_uploaded'   then 'رفع مرفق'
    when 'login'           then 'تسجيل دخول'
    when 'logout'          then 'تسجيل خروج'
    when 'updated'         then 'تعديل ' || coalesce(
        case p_field
          when 'due_date'    then 'تاريخ التسليم'
          when 'start_date'  then 'تاريخ البدء'
          when 'priority'    then 'الأولوية'
          when 'assigned_to' then 'المسؤول'
          when 'co_assignee' then 'المسؤول المشارك'
          when 'title_ar'    then 'عنوان البند'
          when 'category'    then 'التصنيف'
          when 'progress'    then 'نسبة الإنجاز'
          when 'estimated_cost' then 'التكلفة المقدرة'
          when 'actual_cost'    then 'التكلفة الفعلية'
        end, 'بيانات البند')
    else coalesce(p_action, 'إجراء')
  end;
$$;

-- ---------------------------------------------------------------------
-- 7) العروض
-- ---------------------------------------------------------------------

-- 7-أ) ملخص نشاط كل مستخدم — الشاشة الرئيسية للأدمن
create or replace view public.v_user_activity as
select p.id,
       p.username,
       p.name_ar,
       p.name_en,
       p.role,
       p.job_title,
       p.email,
       p.active,
       (p.auth_id is not null)                as account_linked,
       p.last_login_at,
       p.login_count,
       p.last_action_at,
       -- آخر إجراء عمله بالتفصيل
       la.action_text                          as last_action_text,
       la.task_id                              as last_action_task,
       la.task_title                           as last_action_task_title,
       -- عدّادات
       coalesce(a7.cnt, 0)                     as actions_7d,
       coalesce(a30.cnt, 0)                    as actions_30d,
       coalesce(l7.cnt, 0)                     as logins_7d,
       -- حالة الحساب بالعربي
       -- ملاحظة: مُشغّل الربط في الملف 01 بيحطّ last_login_at وقت إنشاء الحساب،
       -- عشان كده الاعتماد على login_count هو الأصحّ في التمييز بين «اتعمله حساب» و«دخل فعلًا»
       case when p.auth_id is null                                   then 'لم يُنشأ حساب دخول'
            when p.login_count = 0                                   then 'حساب موجود ولم يدخل بعد'
            when p.last_login_at is null                             then 'حساب موجود ولم يدخل بعد'
            when p.last_login_at > now() - interval '15 minutes'     then 'نشِط الآن'
            when p.last_login_at > now() - interval '24 hours'       then 'دخل خلال 24 ساعة'
            when p.last_login_at > now() - interval '7 days'         then 'دخل خلال أسبوع'
            else 'لم يدخل منذ أكثر من أسبوع' end                     as presence,
       -- حِمل العمل
       coalesce(ul.tasks_total, 0)             as tasks_total,
       coalesce(ul.tasks_completed, 0)         as tasks_completed,
       coalesce(ul.tasks_overdue, 0)           as tasks_overdue,
       coalesce(ul.avg_progress, 0)            as avg_progress
  from public.profiles p
  left join lateral (
        select public.action_label_ar(h.action, h.field) as action_text,
               h.task_id,
               t.title_ar as task_title
          from public.task_history h
          left join public.tasks t on t.id = h.task_id
         where h.actor_id = p.id
         order by h.created_at desc
         limit 1
  ) la on true
  left join lateral (select count(*) cnt from public.task_history h
                      where h.actor_id = p.id and h.created_at > now() - interval '7 days') a7 on true
  left join lateral (select count(*) cnt from public.task_history h
                      where h.actor_id = p.id and h.created_at > now() - interval '30 days') a30 on true
  left join lateral (select count(*) cnt from public.login_events e
                      where e.profile_id = p.id and e.event = 'login'
                        and e.created_at > now() - interval '7 days') l7 on true
  left join public.v_user_load ul on ul.id = p.id;

-- 7-ب) الخلاصة الزمنية الموحّدة — صفحة «سجل النشاط» /activity
create or replace view public.v_activity_feed as
select 'task'::text                             as source,
       h.id                                     as event_id,
       h.created_at,
       h.actor_id                               as profile_id,
       p.name_ar                                as actor_name,
       p.username                               as actor_username,
       p.role                                   as actor_role,
       h.action,
       public.action_label_ar(h.action, h.field) as action_text,
       h.field,
       h.old_value,
       h.new_value,
       h.reason,
       h.task_id,
       t.sn                                     as task_sn,
       t.title_ar                               as task_title
  from public.task_history h
  left join public.profiles p on p.id = h.actor_id
  left join public.tasks    t on t.id = h.task_id
union all
select 'auth'::text,
       e.id,
       e.created_at,
       e.profile_id,
       p.name_ar,
       p.username,
       p.role,
       e.event,
       public.action_label_ar(e.event, null),
       null, null,
       coalesce(e.platform, e.user_agent),
       null, null, null, null
  from public.login_events e
  left join public.profiles p on p.id = e.profile_id;

-- 7-ج) مَن على النظام دلوقتي
create or replace view public.v_online_now as
select id, username, name_ar, role, last_login_at, last_action_at
  from public.profiles
 where last_login_at > now() - interval '15 minutes'
    or last_action_at > now() - interval '15 minutes'
 order by greatest(coalesce(last_login_at,'epoch'), coalesce(last_action_at,'epoch')) desc;

-- ---------------------------------------------------------------------
-- 8) الصلاحيات — نفس مبدأ task_history: قراءة فقط، والكتابة من الدوال
-- ---------------------------------------------------------------------
alter table public.login_events enable row level security;

-- المستخدم يرى سجله، والأدمن يرى الكل. لا insert ولا update ولا delete لأي حد.
drop policy if exists login_events_select on public.login_events;
create policy login_events_select on public.login_events for select to authenticated
using ( profile_id = public.current_profile_id() or public.is_admin() );

revoke all on public.login_events from authenticated;
grant  select on public.login_events to authenticated;
grant  usage, select on sequence public.login_events_id_seq to authenticated;

revoke all on function public.record_login(text, text) from public;
revoke all on function public.record_logout()          from public;
grant  execute on function public.record_login(text, text) to authenticated;
grant  execute on function public.record_logout()          to authenticated;
grant  execute on function public.action_label_ar(text, text) to authenticated;

grant select on public.v_user_activity, public.v_activity_feed, public.v_online_now to authenticated;
alter view public.v_user_activity set (security_invoker = on);
alter view public.v_activity_feed set (security_invoker = on);
alter view public.v_online_now    set (security_invoker = on);

commit;

-- =====================================================================
--  التحقق بعد التشغيل
-- =====================================================================
--  select count(*) from public.login_events;                     -- 0 (طبيعي، لسه محدش دخل)
--  select username, presence, last_login_at, last_action_text
--    from public.v_user_activity order by role, username;        -- 11 صف
--  select count(*) from public.v_activity_feed;                  -- 80 (سطر إنشاء لكل بند)
--  select * from public.v_online_now;                            -- فاضي
--
--  الواجهة تستدعي بعد نجاح تسجيل الدخول:
--    await supabase.rpc('record_login', { p_user_agent: navigator.userAgent, p_platform: 'web' })
--  وقبل تسجيل الخروج:
--    await supabase.rpc('record_logout')
