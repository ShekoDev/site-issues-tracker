-- =====================================================================
--  Site Tracker — الملف 2 من 4 : سياسات الصلاحيات (Row Level Security)
--  يحوّل مصفوفة الـ17 صلاحية إلى قواعد تُفرض داخل قاعدة البيانات نفسها،
--  فلا يمكن تجاوزها بتعديل الواجهة أو باستدعاء الـ API مباشرة.
--  الصقه بعد الملف 1.
-- =====================================================================

alter table public.profiles         enable row level security;
alter table public.tasks            enable row level security;
alter table public.execution_steps  enable row level security;
alter table public.task_notes       enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_history     enable row level security;
alter table public.app_settings     enable row level security;

-- هل يرى المستخدم الحالي هذا البند؟
create or replace function public.can_see_task(p_task text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_perm('canViewAllTasks')
      or exists (select 1 from public.tasks t
                  where t.id = p_task
                    and (t.assigned_to = public.current_profile_id()
                      or t.co_assignee = public.current_profile_id()));
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using ( auth_id = auth.uid() or public.has_perm('canViewAllTasks') or public.is_admin() );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using ( auth_id = auth.uid() ) with check ( auth_id = auth.uid() );
-- ملاحظة: تغيير الدور أو الصلاحيات محجوب بالمُشغّل أدناه حتى لو عدّل المستخدم ملفه

create or replace function public.trg_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.permissions is distinct from old.permissions
       or new.active is distinct from old.active
       or new.username is distinct from old.username then
      raise exception 'تغيير الدور أو الصلاحيات أو التفعيل مقصور على الأدمن';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
for each row execute function public.trg_profiles_guard();

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
using ( public.is_admin() ) with check ( public.is_admin() );

-- ---------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
using ( deleted = false and (
        public.has_perm('canViewAllTasks')
     or assigned_to = public.current_profile_id()
     or co_assignee = public.current_profile_id() ) );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
with check ( public.has_perm('canCreateTask') );

-- تعديل كامل لمن يملك canEditTask
drop policy if exists tasks_update_full on public.tasks;
create policy tasks_update_full on public.tasks for update to authenticated
using ( public.has_perm('canEditTask') ) with check ( public.has_perm('canEditTask') );

-- تعديل محدود للمسؤول عن البند: التكلفة الفعلية والحالة فقط
drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks for update to authenticated
using ( public.has_perm('canUpdateProgress')
        and (assigned_to = public.current_profile_id() or co_assignee = public.current_profile_id()) )
with check ( assigned_to = public.current_profile_id() or co_assignee = public.current_profile_id() );

-- حصر الحقول التي يغيّرها المسؤول غير المصرّح له بالتعديل الكامل
create or replace function public.trg_tasks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('canEditTask') then
    if new.id is distinct from old.id
       or new.sn is distinct from old.sn
       or new.title_ar is distinct from old.title_ar
       or new.description is distinct from old.description
       or new.category is distinct from old.category
       or new.priority is distinct from old.priority
       or new.assigned_to is distinct from old.assigned_to
       or new.co_assignee is distinct from old.co_assignee
       or new.due_date is distinct from old.due_date
       or new.start_date is distinct from old.start_date
       or new.deleted is distinct from old.deleted then
      raise exception 'ليست لديك صلاحية تعديل بيانات البند — تحديث الإنجاز والتكلفة فقط';
    end if;
    if new.estimated_cost is distinct from old.estimated_cost
       and not public.has_perm('canUpdateCost') then
      raise exception 'ليست لديك صلاحية تعديل التكاليف';
    end if;
  end if;
  -- تجاوز النسبة يدويًا يتطلب صلاحية خاصة
  if new.progress_manual is distinct from old.progress_manual
     and new.progress_manual and not public.has_perm('canOverrideProgress') then
    raise exception 'تجاوز نسبة الإنجاز يدويًا مقصور على الأدمن';
  end if;
  return new;
end $$;
drop trigger if exists tasks_guard on public.tasks;
create trigger tasks_guard before update on public.tasks
for each row execute function public.trg_tasks_guard();

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
using ( public.has_perm('canDeleteTask') );

-- ---------------------------------------------------------------------
-- execution_steps
-- ---------------------------------------------------------------------
drop policy if exists steps_select on public.execution_steps;
create policy steps_select on public.execution_steps for select to authenticated
using ( public.can_see_task(task_id) );

drop policy if exists steps_update on public.execution_steps;
create policy steps_update on public.execution_steps for update to authenticated
using ( public.has_perm('canUpdateProgress') and public.can_see_task(task_id) )
with check ( public.has_perm('canUpdateProgress') and public.can_see_task(task_id) );

drop policy if exists steps_write on public.execution_steps;
create policy steps_write on public.execution_steps for insert to authenticated
with check ( public.has_perm('canEditTask') );

drop policy if exists steps_delete on public.execution_steps;
create policy steps_delete on public.execution_steps for delete to authenticated
using ( public.has_perm('canEditTask') );

-- ---------------------------------------------------------------------
-- task_notes
-- ---------------------------------------------------------------------
drop policy if exists notes_select on public.task_notes;
create policy notes_select on public.task_notes for select to authenticated
using ( public.can_see_task(task_id) );

drop policy if exists notes_insert on public.task_notes;
create policy notes_insert on public.task_notes for insert to authenticated
with check ( public.has_perm('canAddNotes') and public.can_see_task(task_id)
             and created_by = public.current_profile_id() );

drop policy if exists notes_modify on public.task_notes;
create policy notes_modify on public.task_notes for update to authenticated
using ( created_by = public.current_profile_id() or public.is_admin() )
with check ( created_by = public.current_profile_id() or public.is_admin() );

drop policy if exists notes_delete on public.task_notes;
create policy notes_delete on public.task_notes for delete to authenticated
using ( created_by = public.current_profile_id() or public.is_admin() );

-- ---------------------------------------------------------------------
-- task_attachments
-- ---------------------------------------------------------------------
drop policy if exists att_select on public.task_attachments;
create policy att_select on public.task_attachments for select to authenticated
using ( public.can_see_task(task_id) );

drop policy if exists att_insert on public.task_attachments;
create policy att_insert on public.task_attachments for insert to authenticated
with check ( public.has_perm('canUploadFiles') and public.can_see_task(task_id)
             and uploaded_by = public.current_profile_id() );

drop policy if exists att_delete on public.task_attachments;
create policy att_delete on public.task_attachments for delete to authenticated
using ( public.is_admin()
        or (uploaded_by = public.current_profile_id() and public.has_perm('canUploadFiles')) );

-- ---------------------------------------------------------------------
-- task_history — قراءة فقط. لا تعديل ولا حذف لأي مستخدم بما فيهم الأدمن.
-- ---------------------------------------------------------------------
drop policy if exists hist_select on public.task_history;
create policy hist_select on public.task_history for select to authenticated
using ( public.has_perm('canViewHistory') and public.can_see_task(task_id) );
-- لا توجد سياسات insert/update/delete: الكتابة تتم حصريًا من المُشغّلات
-- (security definer) وليست متاحة للمستخدمين إطلاقًا.

-- ---------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------
drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings for select to authenticated using ( true );

drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all to authenticated
using ( public.has_perm('canManageSettings') ) with check ( public.has_perm('canManageSettings') );

-- ---------------------------------------------------------------------
-- إخفاء التكاليف عمّن لا يملك canViewCost (عرض بديل للواجهة)
-- ---------------------------------------------------------------------
create or replace view public.v_tasks_visible as
select t.id, t.sn, t.title_ar, t.title_en, t.description, t.category, t.priority, t.status,
       t.assigned_to, t.co_assignee, t.assignee_name, t.co_assignee_name,
       t.progress, t.steps_total, t.steps_done, t.notes_count, t.attachments_count,
       t.guidance_note, t.side_note, t.related_tasks,
       t.raised_date, t.start_date, t.due_date, t.completed_date, t.is_overdue,
       case when public.has_perm('canViewCost') then t.estimated_cost end as estimated_cost,
       case when public.has_perm('canViewCost') then t.actual_cost    end as actual_cost,
       case when public.has_perm('canViewCost') then t.cost_variance  end as cost_variance,
       t.updated_at
  from public.v_tasks_full t;

-- ---------------------------------------------------------------------
-- نقل بند مع تسجيل السبب (يُستدعى من الواجهة بدل UPDATE مباشر)
-- ---------------------------------------------------------------------
create or replace function public.transfer_task(p_task text, p_to uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_from uuid;
begin
  if not public.has_perm('canTransferTask') then
    raise exception 'ليست لديك صلاحية نقل البنود';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'سبب النقل مطلوب';
  end if;
  select assigned_to into v_from from public.tasks where id = p_task;
  if v_from is not distinct from p_to then
    raise exception 'البند مُسنَد بالفعل لهذا الشخص';
  end if;
  perform set_config('cr18.in_transfer', '1', true);   -- يمنع ازدواج السطر في السجل
  update public.tasks set assigned_to = p_to where id = p_task;
  perform set_config('cr18.in_transfer', '', true);
  insert into public.task_history(task_id, action, field, old_value, new_value, reason, actor_id)
  values (p_task, 'transferred', 'assigned_to',
          (select name_ar from public.profiles where id = v_from),
          (select name_ar from public.profiles where id = p_to),
          p_reason, public.current_profile_id());
end $$;
revoke all on function public.transfer_task(text, uuid, text) from public;
grant execute on function public.transfer_task(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- الصلاحيات على مستوى الجداول (RLS تُفلتر الصفوف، وهذه تفتح الوصول أصلًا)
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.tasks, public.execution_steps,
      public.task_notes, public.task_attachments to authenticated;
grant select on public.task_history to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- بنود تحتاج انتباه: متأخرة، أو تستحق خلال 7 أيام، أو بلا تاريخ تسليم
create or replace view public.v_attention as
select id, sn, title_ar, category, priority, status, progress,
       assignee_name, due_date,
       case when due_date is null then 'بلا تاريخ تسليم'
            when is_overdue      then 'متأخر'
            else 'يستحق خلال 7 أيام' end as flag,
       case when due_date is null then null else due_date - current_date end as days_left
  from public.v_tasks_full
 where status not in ('completed','cancelled')
   and (due_date is null or due_date <= current_date + 7)
 order by (due_date is null), due_date, priority;

grant select on public.v_tasks_full, public.v_tasks_visible, public.v_dashboard,
                 public.v_user_load, public.v_category_progress, public.v_attention to authenticated;
alter view public.v_tasks_full     set (security_invoker = on);
alter view public.v_tasks_visible  set (security_invoker = on);
alter view public.v_dashboard      set (security_invoker = on);
alter view public.v_user_load      set (security_invoker = on);
alter view public.v_category_progress set (security_invoker = on);
alter view public.v_attention       set (security_invoker = on);
