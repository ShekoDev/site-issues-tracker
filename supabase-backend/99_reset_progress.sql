-- =====================================================================
--  Site Tracker — أداة تصفير الإنجاز
--  شغّلها في أي وقت عايز فيه ترجّع كل البنود لنقطة الصفر.
--  آمنة ومتكررة (idempotent) — تقدر تشغّلها أكتر من مرة.
--
--  بتصفّر: كل الخطوات الـ320 · نسب الإنجاز · الحالات · تواريخ الإغلاق
--  ما بتمسّش: البنود نفسها · المسؤولين · التصنيفات · الأولويات · التواريخ
--             · الملاحظات · المرفقات · وسجل task_history (غير قابل للحذف أصلًا)
-- =====================================================================

begin;

-- 1) تصفير الخطوات الـ320
update public.execution_steps
   set completed    = false,
       completed_by = null,
       completed_at = null
 where completed = true or completed_by is not null or completed_at is not null;

-- 2) تصفير البنود — إلغاء أي تجاوز يدوي للنسبة كمان
update public.tasks
   set progress        = 0,
       progress_manual = false,
       status          = 'pending',
       completed_date  = null
 where progress <> 0
    or progress_manual
    or status <> 'pending'
    or completed_date is not null;

commit;

-- =====================================================================
--  التحقق — لازم كل الأرقام تطلع صفر ما عدا الأعداد الإجمالية
-- =====================================================================
select (select count(*) from public.tasks)                                  as البنود,            -- 80
       (select count(*) from public.execution_steps)                        as الخطوات,           -- 320
       (select count(*) from public.execution_steps where completed)        as خطوات_منجزة,       -- 0
       (select count(*) from public.tasks where progress <> 0)              as بنود_بنسبة,        -- 0
       (select count(*) from public.tasks where status <> 'pending')        as بنود_مش_معلقة,     -- 0
       (select count(*) from public.tasks where completed_date is not null) as بنود_لها_تاريخ_إغلاق; -- 0

-- ملاحظة: التصفير نفسه بيتسجّل في task_history (السجل غير قابل للحذف بالتصميم)،
--         يعني هيفضل واضح إن فيه عملية تصفير حصلت ومين عملها وإمتى.
