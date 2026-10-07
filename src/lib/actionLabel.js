/** نفس منطق action_label_ar في الملف 06 — للعرض في الواجهة */
const FIELD = {
  status: 'الحالة', progress: 'نسبة الإنجاز', assigned_to: 'المسؤول',
  co_assignee: 'المسؤول المشارك', due_date: 'تاريخ التسليم', start_date: 'تاريخ البدء',
  estimated_cost: 'التكلفة المقدرة', actual_cost: 'التكلفة الفعلية',
  priority: 'الأولوية', category: 'التصنيف', title_ar: 'عنوان البند',
  description: 'الوصف', deleted: 'الحذف'
}

export function actionLabel(action, field, lang = 'ar') {
  if (lang === 'en') {
    if (action === 'login') return 'Signed in'
    if (action === 'logout') return 'Signed out'
    if (action === 'created') return 'Created item'
    if (action === 'transferred') return 'Transferred item'
    if (action === 'note_added') return 'Added a note'
    if (action === 'file_uploaded') return 'Uploaded a file'
    if (action === 'file_deleted') return 'Deleted a file'
    if (action?.startsWith('step')) return `Execution step${field ? ' ' + field.replace('step_', '') : ''}`
    return `Updated ${field || ''}`.trim()
  }
  if (action === 'login') return 'تسجيل دخول'
  if (action === 'logout') return 'تسجيل خروج'
  if (action === 'created') return 'إنشاء البند'
  if (action === 'transferred') return 'نقل البند'
  if (action === 'note_added') return 'إضافة ملاحظة'
  if (action === 'file_uploaded') return 'رفع مرفق'
  if (action === 'file_deleted') return 'حذف مرفق'
  if (action === 'step_completed') return `تحديث خطوة تنفيذ${field ? ' ' + field.replace('step_', '') : ''}`
  if (action === 'status_changed') return 'تغيير الحالة'
  if (action === 'cost_updated') return 'تعديل التكلفة'
  if (action === 'updated') return `تعديل ${FIELD[field] || field || ''}`.trim()
  return action
}
