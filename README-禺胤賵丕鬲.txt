خطوات تشغيل تطبيق الحاج مقام (Firebase - مجاني للبداية)

1) افتح console.firebase.google.com وأنشئ مشروع جديد.
2) Build > Firestore Database > Create database (production mode).
3) Build > Authentication > Get started > فعّل Email/Password، ثم أضف مستخدم للمطعم (إيميل وكلمة سر).
4) Project settings > Your apps > Web (</>) > انسخ الإعدادات والصقها في ملف firebase-config.js
5) Firestore > Rules: انسخ محتوى firestore.rules، غيّر ADMIN_EMAIL_HERE لإيميل المطعم، ثم Publish.
6) Build > Hosting > Get started. ثبّت الأداة: npm i -g firebase-tools ثم داخل المجلد:
   firebase login
   firebase init hosting   (اختار نفس المشروع، المجلد العام = . ، لا تستبدل index.html)
   firebase deploy
7) رابط الزبائن:  https://مشروعك.web.app
   رابط المطعم:  https://مشروعك.web.app/#admin
8) الزبون يفتح الرابط > "إضافة للشاشة الرئيسية" فيتثبت كتطبيق.

ملاحظة: الإشعارات حاليا تعمل والتطبيق مفتوح. الإشعارات والتطبيق مقفول تحتاج مرحلة تانية (FCM + Cloud Functions).
الأسعار في index.html داخل MENU عدّلها بأسعارك.
