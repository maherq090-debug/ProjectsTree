# Project Tree

مدير مشاريع بسيط: Projects → Milestones → Tasks → Subtasks (حتى 7 مستويات).
تطبيق أندرويد مبني بـ HTML + CSS + JavaScript عادي، ومغلّف بـ Capacitor.

## بناء التطبيق (APK)

- كل ما ترفع تعديل على فرع `main` يبدأ البناء تلقائيًا (Actions).
- بعد النجاح: Releases ← نزّل `ProjectTree.apk` ← ثبّته.
- ملف `debug.keystore` يثبّت توقيع التطبيق حتى تتحدّث النسخ فوق بعض، لا تحذفه.
