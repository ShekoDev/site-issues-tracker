export const STATUS = ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']
export const PRIORITY = ['critical', 'high', 'medium', 'low']

export const STATUS_COLOR = {
  pending: 'var(--ink-3)',
  in_progress: 'var(--blue)',
  completed: 'var(--ok)',
  on_hold: 'var(--high)',
  cancelled: 'var(--low)'
}
export const PRIORITY_COLOR = {
  critical: 'var(--crit)',
  high: 'var(--high)',
  medium: 'var(--med)',
  low: 'var(--low)'
}

/** التصنيفات الافتراضية — تُقرأ فعليًا من app_settings عند التشغيل */
export const FALLBACK_CATEGORIES = [
  'هندسي وفني', 'مكتب فني ومستندات', 'تخطيط ومتابعة', 'مشتريات وتوريد',
  'تجهيز الموقع', 'معدات ومكائن', 'كهرباء وإنارة', 'مياه', 'لوجستيات ونقل',
  'خدمات ومرافق العمال', 'مالية وإدارية', 'جودة وسلامة', 'عمالة وموارد بشرية'
]

/** كل الصلاحيات كما يولّدها default_permissions في الملف 01 */
export const PERM_LABELS = {
  canViewOwnTasks: ['رؤية بنودي', 'View own tasks'],
  canViewAllTasks: ['رؤية كل البنود', 'View all tasks'],
  canCreateTask: ['إضافة بند', 'Create task'],
  canEditTask: ['تعديل بند', 'Edit task'],
  canDeleteTask: ['حذف بند', 'Delete task'],
  canTransferTask: ['نقل بند', 'Transfer task'],
  canUpdateProgress: ['تحديث الإنجاز', 'Update progress'],
  canOverrideProgress: ['تجاوز النسبة يدويًا', 'Override progress'],
  canViewCost: ['رؤية التكاليف', 'View cost'],
  canUpdateCost: ['تعديل التكاليف', 'Update cost'],
  canAddNotes: ['إضافة ملاحظات', 'Add notes'],
  canUploadFiles: ['رفع مرفقات', 'Upload files'],
  canDeleteFiles: ['حذف مرفقات', 'Delete files'],
  canManageUsers: ['إدارة المستخدمين', 'Manage users'],
  canGenerateReports: ['التقارير', 'Reports'],
  canViewHistory: ['سجل التغييرات', 'History'],
  canManageSettings: ['الإعدادات', 'Settings']
}

export const BUCKET = 'task-attachments'
export const MAX_FILE = 20 * 1024 * 1024
