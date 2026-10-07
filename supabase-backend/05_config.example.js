// =====================================================================
//  Site Tracker — ملف الاتصال بقاعدة البيانات (للواجهة)
//  انسخه باسم config.js وضع فيه بيانات مشروعك من:
//  Supabase Dashboard ▸ Project Settings ▸ API
// =====================================================================

export const SUPABASE_URL      = 'https://xxxxxxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';   // مفتاح anon public — آمن في الواجهة

// ملاحظة أمنية مهمة:
// مفتاح anon آمن تمامًا للاستخدام في المتصفح لأن كل الصلاحيات مفروضة
// بسياسات RLS داخل قاعدة البيانات. أما مفتاح service_role فلا يُوضع
// في الواجهة إطلاقًا — يتجاوز كل السياسات.

// ---------------------------------------------------------------------
// أمثلة الاستخدام مع مكتبة supabase-js
// ---------------------------------------------------------------------
//
// import { createClient } from '@supabase/supabase-js';
// const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//
// // تسجيل الدخول
// await db.auth.signInWithPassword({ email, password });
//
// // البنود التي يحق للمستخدم رؤيتها (RLS تفلترها تلقائيًا)
// const { data: tasks } = await db.from('v_tasks_visible')
//        .select('*').order('sn');
//
// // بنود شخص بعينه
// const { data } = await db.from('v_tasks_visible')
//        .select('*').eq('assigned_to', userId);
//
// // فتح بند بخطواته وملاحظاته
// const { data: task } = await db.from('tasks')
//        .select('*, execution_steps(*), task_notes(*), task_history(*)')
//        .eq('id', 'ITEM-001').single();
//
// // تعليم خطوة كمنجزة — النسبة والحالة والسجل تتحدّث تلقائيًا في القاعدة
// await db.from('execution_steps').update({ completed: true }).eq('id', stepId);
//
// // نقل بند (السبب إلزامي)
// await db.rpc('transfer_task', {
//   p_task: 'ITEM-023', p_to: newUserId, p_reason: 'إعادة توزيع أحمال المياه'
// });
//
// // لوحة المعلومات
// const { data: kpis }   = await db.from('v_dashboard').select('*').single();
// const { data: load }   = await db.from('v_user_load').select('*');
// const { data: cats }   = await db.from('v_category_progress').select('*');
// const { data: urgent } = await db.from('v_attention').select('*');
//
// // رفع مرفق — المسار لازم يبدأ برقم البند عشان الصلاحيات تشتغل
// const path = `${taskId}/${crypto.randomUUID()}-${file.name}`;
// await db.storage.from('task-attachments').upload(path, file);
// await db.from('task_attachments').insert({
//   task_id: taskId, file_name: file.name, file_type: file.type,
//   size_bytes: file.size, storage_path: path, uploaded_by: myProfileId
// });
//
// // تحديث لحظي لكل المستخدمين
// db.channel('tasks').on('postgres_changes',
//   { event: '*', schema: 'public', table: 'tasks' }, () => refresh()
// ).subscribe();
