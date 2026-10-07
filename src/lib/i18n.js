export const L = {
  ar: {
    // shell
    appName: 'متابعة بنود الموقع', project: 'مشروع تجريبي', company: 'شركة تجريبية',
    dashboard: 'لوحة المعلومات', all: 'كل البنود', mine: 'مهامي', attention: 'تحتاج انتباه',
    users: 'المستخدمون', activity: 'سجل النشاط', reports: 'التقارير', settings: 'الإعدادات',
    logout: 'تسجيل الخروج', dark: 'الوضع الداكن', light: 'الوضع الفاتح', lang: 'English',
    // login
    signIn: 'تسجيل الدخول', email: 'البريد الإلكتروني', password: 'كلمة المرور',
    signingIn: 'جارٍ الدخول…', noConfig: 'لم يتم ربط النظام بقاعدة البيانات بعد. أنشئ ملف .env.local وضع فيه رابط مشروع Supabase ومفتاح anon، ثم أعد تشغيل الخادم.',
    noProfile: 'الحساب موجود في Supabase لكن لا يوجد له ملف شخصي في جدول profiles — راجع الأدمن.',
    // kpis
    total: 'إجمالي البنود', completed: 'منجزة', in_progress: 'جارية', pending: 'لم تبدأ',
    on_hold: 'موقوفة', cancelled: 'ملغاة', overdue: 'متأخرة', noDue: 'بلا تاريخ تسليم',
    avgProg: 'متوسط الإنجاز', estCost: 'التكلفة المقدرة', actCost: 'التكلفة الفعلية',
    variance: 'الانحراف', sar: 'ريال',
    // filters / table
    search: 'بحث في البنود…', status: 'الحالة', priority: 'الأولوية', category: 'التصنيف',
    assignee: 'المسؤول', all_: 'الكل', item: 'البند', progress: 'الإنجاز', due: 'التسليم',
    reset: 'مسح الفلاتر', results: 'نتيجة',
    // detail
    steps: 'آلية التنفيذ', cost: 'التكلفة', notes: 'الملاحظات', history: 'سجل التغييرات',
    files: 'المرفقات', back: 'رجوع', transfer: 'نقل البند', edit: 'تعديل', del: 'حذف',
    critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة',
    addNote: 'أضف ملاحظة…', send: 'إضافة', guidance: 'ملاحظة توجيهية', side: 'ملاحظة جانبية',
    raised: 'تاريخ الرصد', coAssignee: 'مسؤول مشارك', startDate: 'تاريخ البدء',
    none: '—', notSet: 'لم يُحدَّد', save: 'حفظ', saved: 'تم الحفظ', cancel: 'إلغاء',
    noPerm: 'ليست لديك صلاحية التعديل على هذا البند.',
    noTasks: 'لا توجد بنود مطابقة.', upload: 'رفع ملف', uploading: 'جارٍ الرفع…',
    download: 'تنزيل', confirmDel: 'تأكيد الحذف؟ لا يمكن التراجع.',
    // transfer
    tFrom: 'المسؤول الحالي', tTo: 'نقل إلى', tWhy: 'سبب النقل (إلزامي)', confirm: 'تنفيذ النقل',
    // charts
    byPerson: 'الأحمال حسب المسؤول', byCat: 'الإنجاز حسب التصنيف', statusDist: 'توزيع الحالات',
    // users / activity
    role: 'الدور', username: 'اسم الدخول', presence: 'الحضور', lastLogin: 'آخر دخول',
    lastAction: 'آخر إجراء', logins: 'مرات الدخول', actions7: 'إجراءات 7 أيام',
    perms: 'الصلاحيات', mainT: 'بنود رئيسية', online: 'على النظام الآن',
    feed: 'الخلاصة الزمنية', actor: 'المستخدم', when: 'التوقيت', what: 'الإجراء',
    // reports
    printReport: 'طباعة / حفظ PDF', reportAll: 'تقرير شامل', reportUser: 'تقرير مسؤول',
    reportPick: 'اختر نوع التقرير', generatedAt: 'تاريخ الإصدار', preparedFor: 'جهة الإصدار',
    // settings
    dueSoon: 'التنبيه قبل الاستحقاق (أيام)', costOver: 'حد تجاوز التكلفة (%)',
    settingsSaved: 'تم حفظ الإعدادات', categories: 'التصنيفات',
    // errors
    loadErr: 'تعذّر تحميل البيانات', noAccess: 'ليست لديك صلاحية الدخول لهذه الصفحة'
  },
  en: {
    appName: 'Site Issues Tracker', project: 'Demo Project', company: 'Demo Co.',
    dashboard: 'Dashboard', all: 'All Items', mine: 'My Tasks', attention: 'Needs attention',
    users: 'Users', activity: 'Activity log', reports: 'Reports', settings: 'Settings',
    logout: 'Sign out', dark: 'Dark mode', light: 'Light mode', lang: 'العربية',
    signIn: 'Sign in', email: 'Email', password: 'Password',
    signingIn: 'Signing in…',
    noConfig: 'The app is not connected to a database yet. Create .env.local with your Supabase URL and anon key, then restart the dev server.',
    noProfile: 'The auth account exists but has no row in profiles — contact the admin.',
    total: 'Total items', completed: 'Completed', in_progress: 'In progress', pending: 'Not started',
    on_hold: 'On hold', cancelled: 'Cancelled', overdue: 'Overdue', noDue: 'No due date',
    avgProg: 'Avg. progress', estCost: 'Estimated cost', actCost: 'Actual cost',
    variance: 'Variance', sar: 'SAR',
    search: 'Search items…', status: 'Status', priority: 'Priority', category: 'Category',
    assignee: 'Assignee', all_: 'All', item: 'Item', progress: 'Progress', due: 'Due',
    reset: 'Clear filters', results: 'results',
    steps: 'Execution steps', cost: 'Cost', notes: 'Notes', history: 'History',
    files: 'Attachments', back: 'Back', transfer: 'Transfer', edit: 'Edit', del: 'Delete',
    critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
    addNote: 'Add a note…', send: 'Add', guidance: 'Guidance note', side: 'Side note',
    raised: 'Raised', coAssignee: 'Co-assignee', startDate: 'Start date',
    none: '—', notSet: 'Not set', save: 'Save', saved: 'Saved', cancel: 'Cancel',
    noPerm: 'You do not have permission to edit this item.',
    noTasks: 'No matching items.', upload: 'Upload file', uploading: 'Uploading…',
    download: 'Download', confirmDel: 'Delete permanently?',
    tFrom: 'Current owner', tTo: 'Transfer to', tWhy: 'Reason (required)', confirm: 'Transfer',
    byPerson: 'Workload by assignee', byCat: 'Progress by category', statusDist: 'Status distribution',
    role: 'Role', username: 'Username', presence: 'Presence', lastLogin: 'Last login',
    lastAction: 'Last action', logins: 'Logins', actions7: 'Actions (7d)',
    perms: 'Permissions', mainT: 'Primary', online: 'Online now',
    feed: 'Timeline', actor: 'User', when: 'When', what: 'Action',
    printReport: 'Print / Save PDF', reportAll: 'Full report', reportUser: 'Assignee report',
    reportPick: 'Choose report type', generatedAt: 'Generated', preparedFor: 'Prepared by',
    dueSoon: 'Due-soon alert (days)', costOver: 'Cost overrun threshold (%)',
    settingsSaved: 'Settings saved', categories: 'Categories',
    loadErr: 'Failed to load data', noAccess: 'You do not have access to this page'
  }
}

/** أسماء الأدوار */
export const ROLE_LABEL = {
  ar: { admin: 'أدمن', manager: 'مدير', user: 'مستخدم', viewer: 'اطّلاع' },
  en: { admin: 'Admin', manager: 'Manager', user: 'User', viewer: 'Viewer' }
}
