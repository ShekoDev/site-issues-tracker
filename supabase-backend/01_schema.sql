-- =====================================================================
--  Site Tracker — نظام إدارة ومتابعة بنود المشروع
--  الملف 1 من 4 : الجداول والأنواع والفهارس والمُشغّلات (Triggers)
--  المنصّة: Supabase / PostgreSQL
--  الصقه في: Supabase Dashboard ▸ SQL Editor ▸ New query ▸ Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) الأنواع المعتمدة (Enums)
-- ---------------------------------------------------------------------
do $$ begin
  create type task_status   as enum ('pending','in_progress','completed','on_hold','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('critical','high','medium','low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role     as enum ('admin','manager','user','viewer');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2) المستخدمون
--    profiles منفصلة عن auth.users ليمكن ترحيل الأسماء قبل إنشاء الحسابات،
--    ثم يتم الربط تلقائيًا بالبريد عند أول تسجيل دخول.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users(id) on delete set null,
  username      text unique not null,
  email         text unique,
  name_ar       text not null,
  name_en       text,
  job_title     text,
  role          user_role not null default 'user',
  permissions   jsonb not null default '{}'::jsonb,
  language      text not null default 'ar' check (language in ('ar','en')),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);
comment on table public.profiles is 'مستخدمو النظام وصلاحياتهم';

-- الصلاحيات الافتراضية حسب الدور
create or replace function public.default_permissions(p_role user_role)
returns jsonb language sql immutable as $$
  select case p_role
    when 'admin' then '{"canViewOwnTasks":true,"canViewAllTasks":true,"canCreateTask":true,
      "canEditTask":true,"canDeleteTask":true,"canTransferTask":true,"canUpdateProgress":true,
      "canOverrideProgress":true,"canViewCost":true,"canUpdateCost":true,"canAddNotes":true,
      "canUploadFiles":true,"canDeleteFiles":true,"canManageUsers":true,"canGenerateReports":true,
      "canViewHistory":true,"canManageSettings":true}'::jsonb
    when 'manager' then '{"canViewOwnTasks":true,"canViewAllTasks":true,"canCreateTask":true,
      "canEditTask":true,"canDeleteTask":false,"canTransferTask":true,"canUpdateProgress":true,
      "canOverrideProgress":false,"canViewCost":true,"canUpdateCost":true,"canAddNotes":true,
      "canUploadFiles":true,"canDeleteFiles":true,"canManageUsers":false,"canGenerateReports":true,
      "canViewHistory":true,"canManageSettings":false}'::jsonb
    when 'user' then '{"canViewOwnTasks":true,"canViewAllTasks":false,"canCreateTask":false,
      "canEditTask":false,"canDeleteTask":false,"canTransferTask":false,"canUpdateProgress":true,
      "canOverrideProgress":false,"canViewCost":true,"canUpdateCost":true,"canAddNotes":true,
      "canUploadFiles":true,"canDeleteFiles":false,"canManageUsers":false,"canGenerateReports":false,
      "canViewHistory":true,"canManageSettings":false}'::jsonb
    else '{"canViewOwnTasks":true,"canViewAllTasks":true,"canCreateTask":false,
      "canEditTask":false,"canDeleteTask":false,"canTransferTask":false,"canUpdateProgress":false,
      "canOverrideProgress":false,"canViewCost":false,"canUpdateCost":false,"canAddNotes":false,
      "canUploadFiles":false,"canDeleteFiles":false,"canManageUsers":false,"canGenerateReports":false,
      "canViewHistory":true,"canManageSettings":false}'::jsonb
  end;
$$;

-- تعبئة الصلاحيات تلقائيًا لو تُركت فارغة
create or replace function public.trg_profiles_defaults() returns trigger
language plpgsql as $$
begin
  if new.permissions is null or new.permissions = '{}'::jsonb then
    new.permissions := public.default_permissions(new.role);
  end if;
  return new;
end $$;
drop trigger if exists profiles_defaults on public.profiles;
create trigger profiles_defaults before insert or update of role on public.profiles
for each row execute function public.trg_profiles_defaults();

-- ربط حساب الدخول بالملف الشخصي تلقائيًا عبر البريد
create or replace function public.trg_link_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set auth_id = new.id, last_login_at = now()
   where email = new.email and auth_id is null;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.trg_link_auth_user();

-- ---------------------------------------------------------------------
-- 3) البنود
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id              text primary key,                       -- ITEM-001 … ITEM-080
  sn              integer unique not null,                 -- الرقم المسلسل في ملف الوورد
  title_ar        text not null,
  title_en        text,
  description     text,
  category        text not null,
  priority        task_priority not null default 'medium',
  status          task_status   not null default 'pending',
  assigned_to     uuid references public.profiles(id) on delete set null,
  co_assignee     uuid references public.profiles(id) on delete set null,
  created_by      uuid references public.profiles(id) on delete set null,
  progress        smallint not null default 0 check (progress between 0 and 100),
  progress_manual boolean  not null default false,
  estimated_cost  numeric(14,2) check (estimated_cost >= 0),
  actual_cost     numeric(14,2) check (actual_cost >= 0),
  guidance_note   text,                                    -- «ملاحظات» في الصفحة التفصيلية
  side_note       text,                                    -- «ملاحظات جانبية» في الجدول الشامل
  related_tasks   text[] not null default '{}',
  raised_date     date,                                    -- تاريخ الرصد كما في الملف
  start_date      date,
  due_date        date,
  completed_date  date,
  deleted         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_dates check (due_date is null or start_date is null or due_date >= start_date)
);
comment on table public.tasks is 'بنود المشروع الـ80 المستخرجة من ملف الوورد';

create index if not exists idx_tasks_assigned  on public.tasks(assigned_to) where deleted = false;
create index if not exists idx_tasks_co        on public.tasks(co_assignee) where deleted = false;
create index if not exists idx_tasks_status    on public.tasks(status, due_date);
create index if not exists idx_tasks_cat_pri   on public.tasks(category, priority, status);
create index if not exists idx_tasks_due       on public.tasks(due_date) where deleted = false;
create index if not exists idx_tasks_updated   on public.tasks(updated_at desc);

-- ---------------------------------------------------------------------
-- 4) خطوات التنفيذ (آلية التنفيذ)
-- ---------------------------------------------------------------------
create table if not exists public.execution_steps (
  id           bigserial primary key,
  task_id      text not null references public.tasks(id) on delete cascade,
  step_order   smallint not null,
  title_ar     text not null,
  title_en     text,
  completed    boolean not null default false,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  note         text,
  unique (task_id, step_order)
);
create index if not exists idx_steps_task on public.execution_steps(task_id, step_order);
comment on table public.execution_steps is '4 خطوات لكل بند — 320 خطوة إجمالًا';

-- ---------------------------------------------------------------------
-- 5) الملاحظات والمرفقات والسجل
-- ---------------------------------------------------------------------
create table if not exists public.task_notes (
  id         bigserial primary key,
  task_id    text not null references public.tasks(id) on delete cascade,
  body       text not null check (length(btrim(body)) > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);
create index if not exists idx_notes_task on public.task_notes(task_id, created_at desc);

create table if not exists public.task_attachments (
  id          bigserial primary key,
  task_id     text not null references public.tasks(id) on delete cascade,
  step_order  smallint,                          -- اختياري: ربط المرفق بخطوة بعينها
  file_name   text not null,
  file_type   text,
  size_bytes  bigint check (size_bytes > 0 and size_bytes <= 20971520),  -- 20 ميجا
  storage_path text not null unique,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_att_task on public.task_attachments(task_id, uploaded_at desc);

create table if not exists public.task_history (
  id         bigserial primary key,
  task_id    text not null references public.tasks(id) on delete cascade,
  action     text not null,       -- created|updated|transferred|step_completed|status_changed|cost_updated|note_added|file_uploaded
  field      text,
  old_value  text,
  new_value  text,
  reason     text,
  actor_id   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_hist_task on public.task_history(task_id, created_at desc);
create index if not exists idx_hist_time on public.task_history(created_at desc);
comment on table public.task_history is 'سجل غير قابل للتعديل أو الحذف — يُفرض بسياسات RLS';

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6) المستخدم الحالي (يُستعمل في السياسات والمُشغّلات)
-- ---------------------------------------------------------------------
create or replace function public.current_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_id = auth.uid() and active limit 1;
$$;

create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (permissions ->> p)::boolean
                     from public.profiles
                    where auth_id = auth.uid() and active), false);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles
                    where auth_id = auth.uid() and active), false);
$$;

-- ---------------------------------------------------------------------
-- 7) المُشغّلات: تحديث التوقيت، حساب الإنجاز، تسجيل التغييرات
-- ---------------------------------------------------------------------
create or replace function public.trg_touch_updated() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
for each row execute function public.trg_touch_updated();

-- إعادة حساب نسبة الإنجاز والحالة من الخطوات
create or replace function public.recalc_task(p_task text) returns void
language plpgsql security definer set search_path = public as $$
declare v_total int; v_done int; v_pct smallint; v_manual boolean; v_status task_status; v_old task_status;
begin
  select count(*), count(*) filter (where completed) into v_total, v_done
    from public.execution_steps where task_id = p_task;
  if v_total = 0 then return; end if;

  select progress_manual, status into v_manual, v_old from public.tasks where id = p_task;
  v_pct := round(v_done::numeric * 100 / v_total);

  v_status := case when v_pct = 100 then 'completed'::task_status
                   when v_pct > 0   then 'in_progress'::task_status
                   else 'pending'::task_status end;

  -- الحالات اليدوية (موقوف / ملغي) لا يلغيها الحساب الآلي
  if v_old in ('on_hold','cancelled') then v_status := v_old; end if;

  update public.tasks
     set progress = case when v_manual then progress else v_pct end,
         status   = case when v_manual then status   else v_status end,
         completed_date = case when v_status = 'completed' and completed_date is null
                               then current_date
                               when v_status <> 'completed' then null
                               else completed_date end
   where id = p_task;
end $$;

create or replace function public.trg_steps_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_task text;
begin
  v_task := coalesce(new.task_id, old.task_id);

  -- ختم مَن نفّذ الخطوة ومتى + تسجيلها في السجل
  if tg_op = 'UPDATE' and new.completed is distinct from old.completed then
    insert into public.task_history(task_id, action, field, old_value, new_value, actor_id)
    values (v_task, 'step_completed', 'step_' || new.step_order,
            case when old.completed then 'منجزة' else 'غير منجزة' end,
            case when new.completed then 'منجزة' else 'غير منجزة' end,
            public.current_profile_id());
  end if;

  perform public.recalc_task(v_task);
  return null;
end $$;
drop trigger if exists steps_after on public.execution_steps;
create trigger steps_after after insert or update or delete on public.execution_steps
for each row execute function public.trg_steps_after();

-- ختم completed_by / completed_at قبل الحفظ
create or replace function public.trg_steps_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.completed is distinct from old.completed then
    if new.completed then
      new.completed_by := coalesce(new.completed_by, public.current_profile_id());
      new.completed_at := coalesce(new.completed_at, now());
    else
      new.completed_by := null; new.completed_at := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists steps_before on public.execution_steps;
create trigger steps_before before update on public.execution_steps
for each row execute function public.trg_steps_before();

-- تسجيل تغييرات البند حقلًا حقلًا
create or replace function public.trg_tasks_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_profile_id();
begin
  if tg_op = 'INSERT' then
    insert into public.task_history(task_id, action, actor_id)
    values (new.id, 'created', v_actor);
    return null;
  end if;

  -- النقل عبر دالة transfer_task يسجّل بنفسه مع السبب، فلا نكرّره هنا
  if new.assigned_to is distinct from old.assigned_to
     and coalesce(current_setting('cr18.in_transfer', true),'') <> '1' then
    insert into public.task_history(task_id, action, field, old_value, new_value, actor_id)
    values (new.id, 'transferred', 'assigned_to',
            (select name_ar from public.profiles where id = old.assigned_to),
            (select name_ar from public.profiles where id = new.assigned_to), v_actor);
  end if;
  if new.status is distinct from old.status then
    insert into public.task_history(task_id, action, field, old_value, new_value, actor_id)
    values (new.id, 'status_changed', 'status', old.status::text, new.status::text, v_actor);
  end if;
  if new.estimated_cost is distinct from old.estimated_cost then
    insert into public.task_history(task_id, action, field, old_value, new_value, actor_id)
    values (new.id, 'cost_updated', 'estimated_cost', old.estimated_cost::text, new.estimated_cost::text, v_actor);
  end if;
  if new.actual_cost is distinct from old.actual_cost then
    insert into public.task_history(task_id, action, field, old_value, new_value, actor_id)
    values (new.id, 'cost_updated', 'actual_cost', old.actual_cost::text, new.actual_cost::text, v_actor);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.task_history(task_id, action, field, old_value, new_value, actor_id)
    values (new.id, 'updated', 'due_date', old.due_date::text, new.due_date::text, v_actor);
  end if;
  if new.priority is distinct from old.priority then
    insert into public.task_history(task_id, action, field, old_value, new_value, actor_id)
    values (new.id, 'updated', 'priority', old.priority::text, new.priority::text, v_actor);
  end if;
  if new.progress is distinct from old.progress and new.progress_manual then
    insert into public.task_history(task_id, action, field, old_value, new_value, actor_id)
    values (new.id, 'updated', 'progress (يدوي)', old.progress::text, new.progress::text, v_actor);
  end if;
  return null;
end $$;
drop trigger if exists tasks_history on public.tasks;
create trigger tasks_history after insert or update on public.tasks
for each row execute function public.trg_tasks_history();

create or replace function public.trg_notes_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_history(task_id, action, new_value, actor_id)
  values (new.task_id, 'note_added', left(new.body, 120), public.current_profile_id());
  return null;
end $$;
drop trigger if exists notes_history on public.task_notes;
create trigger notes_history after insert on public.task_notes
for each row execute function public.trg_notes_history();

create or replace function public.trg_att_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_history(task_id, action, new_value, actor_id)
  values (new.task_id, 'file_uploaded', new.file_name, public.current_profile_id());
  return null;
end $$;
drop trigger if exists att_history on public.task_attachments;
create trigger att_history after insert on public.task_attachments
for each row execute function public.trg_att_history();

-- ---------------------------------------------------------------------
-- 8) العروض الجاهزة للوحة المعلومات والتقارير
-- ---------------------------------------------------------------------
create or replace view public.v_tasks_full as
select t.*,
       (t.due_date is not null and t.due_date < current_date and t.status <> 'completed') as is_overdue,
       a.name_ar as assignee_name, c.name_ar as co_assignee_name,
       (select count(*) from public.execution_steps s where s.task_id = t.id) as steps_total,
       (select count(*) from public.execution_steps s where s.task_id = t.id and s.completed) as steps_done,
       (select count(*) from public.task_notes n where n.task_id = t.id) as notes_count,
       (select count(*) from public.task_attachments f where f.task_id = t.id) as attachments_count,
       (t.actual_cost - t.estimated_cost) as cost_variance
  from public.tasks t
  left join public.profiles a on a.id = t.assigned_to
  left join public.profiles c on c.id = t.co_assignee
 where t.deleted = false;

create or replace view public.v_dashboard as
select count(*) as total,
       count(*) filter (where status = 'completed')    as completed,
       count(*) filter (where status = 'in_progress')  as in_progress,
       count(*) filter (where status = 'pending')      as pending,
       count(*) filter (where status = 'on_hold')      as on_hold,
       count(*) filter (where is_overdue)              as overdue,
       count(*) filter (where due_date is null)        as without_due_date,
       coalesce(round(avg(progress)),0)                as avg_progress,
       coalesce(sum(estimated_cost),0)                 as total_estimated,
       coalesce(sum(actual_cost),0)                    as total_actual
  from public.v_tasks_full;

create or replace view public.v_user_load as
select p.id, p.name_ar, p.username, p.role,
       count(t.id)                                     as tasks_total,
       count(t.id) filter (where t.status='completed')  as tasks_completed,
       count(t.id) filter (where t.is_overdue)          as tasks_overdue,
       coalesce(round(avg(t.progress)),0)               as avg_progress,
       coalesce(sum(t.estimated_cost),0)                as estimated_cost,
       coalesce(sum(t.actual_cost),0)                   as actual_cost
  from public.profiles p
  left join public.v_tasks_full t on t.assigned_to = p.id
 group by p.id, p.name_ar, p.username, p.role;

create or replace view public.v_category_progress as
select category,
       count(*)                          as tasks_total,
       count(*) filter (where status='completed') as completed,
       coalesce(round(avg(progress)),0)  as avg_progress,
       coalesce(sum(estimated_cost),0)   as estimated_cost,
       coalesce(sum(actual_cost),0)      as actual_cost
  from public.v_tasks_full
 group by category
 order by tasks_total desc;
