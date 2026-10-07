-- =====================================================================
--  Site Tracker — الملف 4 من 4 : مخزن المرفقات (Supabase Storage)
--  الصقه بعد ملف الترحيل.
-- =====================================================================

-- bucket خاص (غير عام) بحد 20 ميجا للملف وأنواع محددة
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-attachments', 'task-attachments', false, 20971520,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel','application/msword','text/plain'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

-- مسار الملف المعتمد:  task-attachments/<task_id>/<uuid>-<اسم الملف>
-- أول جزء من المسار هو رقم البند، وعليه تُبنى الصلاحية.

drop policy if exists att_read on storage.objects;
create policy att_read on storage.objects for select to authenticated
using ( bucket_id = 'task-attachments'
        and public.can_see_task((storage.foldername(name))[1]) );

drop policy if exists att_upload on storage.objects;
create policy att_upload on storage.objects for insert to authenticated
with check ( bucket_id = 'task-attachments'
             and public.has_perm('canUploadFiles')
             and public.can_see_task((storage.foldername(name))[1]) );

drop policy if exists att_remove on storage.objects;
create policy att_remove on storage.objects for delete to authenticated
using ( bucket_id = 'task-attachments'
        and ( public.is_admin() or owner = auth.uid() ) );
