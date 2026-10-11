# SYNQ

تطبيق عربي لإدارة المهمات والوقت وشيتات العمل والمواعيد باستخدام React Native + Expo (SDK 54) + TypeScript، بواجهة عربية وإنجليزية، يعمل على Android وiOS.


الواجهة الحالية فيها يومي، مهامي، شيتاتي، مواعيدي، إحصائياتي وحسابي. المهام تشمل الإضافة والتعديل والإنجاز والحذف والمؤقّت مع الاحتفاظ بالبيانات القديمة. تفاصيل السلوك الحالي في [FEATURES.md](./FEATURES.md)، وخطة الإطلاق والمزايا المدفوعة في [ROADMAP.md](./ROADMAP.md).

> **اقرأ الخطوات بالترتيب.** كل خطوة معتمدة على اللي قبلها، وكل مشكلة واجهتنا أول مرة مكتوب حلها في قسم [المشاكل المعروفة وحلولها](#المشاكل-المعروفة-وحلولها).

---

## المحتويات

1. [أوامر المشروع](#أوامر-المشروع)
2. [الموجود في المشروع](#الموجود-في-المشروع)
3. [ملخص الإعداد الحالي](#ملخص-الإعداد-الحالي)
4. [الخطوة 1: المتطلبات والتثبيت](#الخطوة-1-المتطلبات-والتثبيت)
5. [الخطوة 2: إعداد Firebase](#الخطوة-2-إعداد-firebase)
6. [الخطوة 3: التشغيل على موبايل Android](#الخطوة-3-التشغيل-على-موبايل-android)
7. [الخطوة 4: ربط المشروع بـ EAS](#الخطوة-4-ربط-المشروع-بـ-eas)
8. [الخطوة 5: رفع ملفات Firebase لـ EAS](#الخطوة-5-رفع-ملفات-firebase-لـ-eas)
9. [الخطوة 6: أول build من جهازك (التوقيع)](#الخطوة-6-أول-build-من-جهازك-التوقيع)
10. [الخطوة 7: GitHub Actions](#الخطوة-7-github-actions)
11. [المشاكل المعروفة وحلولها](#المشاكل-المعروفة-وحلولها)
12. [قواعد لازم تفضل ماشي عليها](#قواعد-لازم-تفضل-ماشي-عليها)
13. [طريقة حساب الإحصائيات](#طريقة-حساب-الإحصائيات)
14. [الاختبار والتحقق](#الاختبار-والتحقق)

## أوامر المشروع

### أول تشغيل بعد تنزيل المشروع

```bash
nvm use
npm ci
npx expo install --check
```

لازم يكون `google-services.json` موجودًا في جذر المشروع لتشغيل Android محليًا. تشغيل iOS يحتاج أيضًا `GoogleService-Info.plist`.

### التشغيل اليومي

```bash
# شغّل Metro للـ development build الموجود على الجهاز
npm start

# لو Metro علّق أو احتفظ بكاش قديم
npx expo start --dev-client --clear

# بناء وتشغيل Android محليًا
npm run android

# بناء وتشغيل iOS محليًا — يحتاج macOS وXcode
npm run ios
```

### بعد تغيير مكتبة native أو `app.config.js` أو النغمات

```bash
npx expo prebuild --platform android --clean
npm run android
```

استخدم الأمر السابق بعد تغيير `expo-audio` أو Firebase أو أي ملف داخل `plugins/` أو `assets/sounds/`. خيار `--clean` يعيد إنشاء مجلد Android، لذلك لا تضع تعديلات يدوية مهمة داخله.

### الفحص قبل أي push أو build

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform android --output-dir /tmp/synq-export --clear
```

ولتشغيل الفحوصات الأساسية مرة واحدة:

```bash
npm run typecheck && npm test && npx expo install --check
```

### Firebase

```bash
# تسجيل الدخول واختيار مشروع Firebase — أول مرة فقط
npx firebase-tools login
npx firebase-tools use --add

# نشر صلاحيات المهمات والشيتات والمواعيد
npx firebase-tools deploy --only firestore:rules
```

### معلومات EAS والبيئات

```bash
npx eas-cli login
npx eas-cli whoami
npx eas-cli project:info
npx eas-cli env:list preview
npx eas-cli env:list production
```

### نسخ الاختبار

```bash
# APK داخلي قابل للتثبيت المباشر على Android
npx eas-cli build --platform android --profile preview

# نسخة تطوير تحتوي على dev client
npx eas-cli build --platform android --profile development

# iOS داخلي — يحتاج Apple Developer وإضافة الجهاز
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
```

### نسخة Google Play

```bash
# ينتج Android App Bundle بصيغة AAB ويرفعه إلى EAS
npx eas-cli build --platform android --profile production
```

نزّل ملف الـ AAB من رابط EAS الناتج، ثم ارفعه أولًا إلى **Internal testing** في Play Console. ملف `eas.json` مهيأ لزيادة رقم إصدار Android تلقائيًا في production.

### بعد سحب تحديث يحتوي تغييرات native

```bash
git pull
nvm use
npm ci
npx expo prebuild --platform android --clean
npm run android
```

---

## الموجود في المشروع

- حساب مستقل لكل مستخدم: إنشاء حساب، دخول، استعادة كلمة المرور، خروج، واستمرار جلسة الدخول.
- Firebase Auth وFirestore وFirebase Analytics native؛ موافقة اختيارية للتحليلات من الإعدادات.
- مهمة باسم ورمز ولون وأيام تكرار محددة؛ المدة الفعلية تُحسب تلقائيًا من تسجيلات الوقت.
- قائمة اليوم، إنجاز مرة واحدة لكل مهمة/يوم، إلغاء إنجاز، وعدد مرات التنفيذ.
- عدّاد تصاعدي start/pause/resume يمكن تشغيله أكثر من مرة لنفس المهمة وفي أيام مختلفة؛ إيقافه يسجل جلسة العمل، ويمكن أيضًا تسجيل الوقت يدويًا. لكل مهمة سجل وقت يمكن حذف أي تسجيل منه. على Android يظهر إشعار باسم المهمة والوقت المنقضي خارج التطبيق.
- شيتات عمل بعنوان وفترة وسعر ساعة بالجنيه أو الدولار، مع سجل الجلسات وإجمالي الساعات والقيمة وتصدير PDF أو Excel من قائمة مشاركة الهاتف.
- انتظام آخر 30 يوم، streak لكل مهمة، أعمدة الأسبوع، وتقويم إنجاز 30 يوم مع عرض اليوم وتعديل إنجازه.
- Firestore يعزل بيانات كل مستخدم ويستخدم التخزين المحلي native.
- GitHub Actions: فحص كل PR، وبناء Android وiOS على EAS مع كل push إلى `main`.

---

## ملخص الإعداد الحالي

| الحاجة | القيمة / المكان |
|---|---|
| حساب Expo | `andrewmelad` |
| مشروع EAS | `@andrewmelad/daily-bloom` |
| EAS Project ID | `7f26d4cb-21f6-49f7-bd6d-b106b0f4571b` (مكتوب مباشرة في `app.config.js`) |
| Android package / iOS bundle ID | `com.andrew.dailybloom` |
| مستودع GitHub | `AndrewMelad108/Daily-Bloom` |
| سيكرتس GitHub | Settings ← Environments ← **Production** ← `EXPO_TOKEN` |
| ملفات Firebase على EAS | `GOOGLE_SERVICES_JSON` و`GOOGLE_SERVICES_PLIST` (نوع File) في بيئات preview وproduction |

---

## الخطوة 1: المتطلبات والتثبيت

محتاج:
- Node.js 22 وnpm.
- حساب Firebase وحساب Expo.
- Android Studio (أو موبايل Android بـ USB debugging) للتشغيل المحلي.
- iOS محليًا محتاج macOS + Xcode. على Linux استخدم EAS بس.

التطبيق **native** ومش بيشتغل في Expo Go بسبب React Native Firebase.

```bash
nvm install
nvm use
npm ci
npx expo install --check     # لازم يقول: Dependencies are up to date
```

> ⚠️ **ثبّت أي مكتبة Expo بـ `npx expo install` مش `npm install`**، عشان ياخد النسخة المتوافقة مع SDK 54. شوف [مشكلة expo-font](#2-الأبلكيشن-بيقفل-أول-ما-يفتح-nosuchmethoderror-getdirectconverter).

---

## الخطوة 2: إعداد Firebase

1. أنشئ مشروعًا في https://console.firebase.google.com وفعّل Google Analytics.
2. Authentication ← Sign-in method ← Email/Password ← Enable.
3. Firestore Database ← Create database ← Production mode.
4. Project settings ← **Add app**:
   - **Android** بـ package: `com.andrew.dailybloom`
   - **iOS** بـ bundle ID: `com.andrew.dailybloom`
5. نزّل `google-services.json` و`GoogleService-Info.plist` وحطهم جنب `package.json`.
   - الملفين دول في `.gitignore` ومش بيترفعوا على GitHub. هنرفعهم لـ EAS في [الخطوة 5](#الخطوة-5-رفع-ملفات-firebase-لـ-eas).
   - متستخدمش Firebase Admin service-account جوه التطبيق.
6. انشر قواعد Firestore:

```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules
```

هيكل البيانات:

```text
users/{uid}                         { analytics: boolean }
users/{uid}/globalTasks/{taskId}     المهمة وجدولها ومدتها
users/{uid}/globalEntries/{id}       إنجاز واحد للمهمة في اليوم
users/{uid}/workSessions/{sessionId} جلسة عمل مستقلة بالثواني (عداد أو يدوي)
users/{uid}/sheets/{sheetId}         عنوان وفترة وسعر ومهمات الشيت
users/{uid}/appointments/{id}        المواعيد المهمة
```

القواعد بتمنع أي مستخدم يوصل لبيانات مستخدم تاني. التحقق من الجدول بيتم في العميل، فمتستخدمش البيانات دي لمكافآت مالية أو منافسة من غير تحقق backend.

---

## الخطوة 3: التشغيل على موبايل Android

وصّل الموبايل بـ USB (فعّل **USB debugging**) أو افتح Android Emulator، وبعدين:

```bash
npx expo prebuild --platform android --clean
npm run android
```

بعد ما الـ development build يتسطب، تقدر تشغّل الـ JavaScript بس:

```bash
npm start
```

> **امتى لازم تعيد `prebuild --clean` و`npm run android`؟** بعد أي تغيير في native modules، أو `app.config.js`، أو ملفات Firebase. زرار **Reload** في الأبلكيشن مش كفاية في الحالات دي.

---

## الخطوة 4: ربط المشروع بـ EAS

**اتعملت خلاص.** المشروع مربوط بـ `@andrewmelad/daily-bloom`، والـ ID مكتوب في `app.config.js`:

```js
extra: {
  eas: {
    projectId: "7f26d4cb-21f6-49f7-bd6d-b106b0f4571b",
  },
},
```

لو احتجت تعيدها من الأول على حساب جديد:

```bash
npx eas-cli login
npx eas-cli whoami           # اتأكد إنه الحساب الصح
npx eas-cli init
```

`app.config.js` ملف JavaScript، فـ `eas init` **مش هيقدر يكتب فيه لوحده**. هيطبعلك الـ ID، وإنت تحطه بإيدك مكان القيمة اللي فوق. وبعدها اتأكد:

```bash
npx eas-cli project:info     # لازم يطبع fullName و ID
```

> الـ Project ID مش سر، لأنه بيتحط جوه الأبلكيشن نفسه. عشان كده مكتوب في الكود ومش محطوط كسيكرت في GitHub.

---

## الخطوة 5: رفع ملفات Firebase لـ EAS

الـ build على GitHub بياخد الكود من الريبو، والريبو مفيهوش ملفات Firebase. فلازم ترفعهم لـ EAS كمتغيرات من نوع **File**:

```bash
# Android
npx eas-cli env:create --environment preview    --name GOOGLE_SERVICES_JSON  --type file --value ./google-services.json     --visibility sensitive
npx eas-cli env:create --environment production --name GOOGLE_SERVICES_JSON  --type file --value ./google-services.json     --visibility sensitive

# iOS
npx eas-cli env:create --environment preview    --name GOOGLE_SERVICES_PLIST --type file --value ./GoogleService-Info.plist --visibility sensitive
npx eas-cli env:create --environment production --name GOOGLE_SERVICES_PLIST --type file --value ./GoogleService-Info.plist --visibility sensitive
```

> ⚠️ **لازم `--visibility sensitive` مش `secret`.** الـ GitHub runner بيقرا `app.config.js` قبل ما يبعت الـ build لـ EAS، ومتغيرات `secret` مش بتوصله. ولو الملف موصلش، plugin بتاع `@react-native-firebase` بيفشل على طول.

اتأكد إنهم اترفعوا:

```bash
npx eas-cli env:list preview
npx eas-cli env:list production
```

`app.config.js` بيستخدم المسار اللي EAS بيوفّره (`process.env.GOOGLE_SERVICES_JSON`)، ولو المتغير مش موجود بيرجع للملف المحلي. لو غيّرت ملف Firebase، ارفعه تاني بنفس الأمر وضيف `--force`.

---

## الخطوة 6: أول build من جهازك (التوقيع)

الـ workflow على GitHub شغّال بـ `--non-interactive`، فمش هيقدر يسألك أسئلة. أول مرة لازم تعمل الـ signing credentials من جهازك:

```bash
# Android: قول Yes لما يسألك يعمل keystore جديد
npx eas-cli build --platform android --profile preview

# iOS: محتاج Apple Developer account (99$ في السنة)
npx eas-cli device:create                      # سجّل الآيفون بتاعك
npx eas-cli build --platform ios --profile preview
```

- EAS بيحفظ الـ Android keystore وشهادات Apple، وبعد كده GitHub بيستخدمهم تلقائي.
- `preview` = توزيع داخلي: APK لـ Android، وIPA لـ iOS بيتسطب **على الأجهزة المسجلة بس**. لو ضفت جهاز جديد لازم build جديد.
- قبل أول build بـ `production` اعمل نفس الخطوة بـ `--profile production`.

---

## الخطوة 7: GitHub Actions

الملف: `.github/workflows/build.yml`

### الإعداد (مرة واحدة)

1. **اعمل توكن Expo** من https://expo.dev/settings/access-tokens ← **Create token**.
   - ⚠️ ده توكن **Expo**. توكن GitHub (بيبدأ بـ `ghp_` أو `github_pat_`) **مش هيشتغل**.
2. **جرّب التوكن على جهازك قبل ما تحطه في GitHub:**
   ```bash
   EXPO_TOKEN=التوكن_هنا npx eas-cli whoami
   ```
   لازم يطبع `andrewmelad`. **متلصقش التوكن في أي شات أو ملف.**
3. **حطه في GitHub:** Settings ← Environments ← **Production** ← Add environment secret:
   - Name: `EXPO_TOKEN`
   - Value: التوكن من غير مسافات أو سطور زيادة

   الـ build job فيه `environment: Production`، فهو بيقرا السيكرتس من هنا. لو نقلت السيكرت لمكان تاني (repository secret مثلًا) لازم تعدّل السطر ده.

### بيشتغل إمتى

| الحدث | اللي بيحصل |
|---|---|
| Pull request على `main` | typecheck + اختبارات بس (من غير build ومن غير سيكرتس) |
| Push على `main` | typecheck + اختبارات، وبعدها EAS build لـ Android وiOS بالتوازي (profile `preview`) |
| Actions ← Run workflow | تقدر تختار `preview` أو `production` |

### خطوات الـ build job

1. **Check EAS credentials:** بيوقف على طول برسالة واضحة لو `EXPO_TOKEN` فاضي.
2. **checkout، وsetup-node، و`npm ci`**
3. **expo-github-action:** بيسطب `eas` ويعمل `eas whoami`. لو التوكن غلط بيفشل هنا.
4. **Build signed binaries on EAS:** بيعمل `eas build` وبيستنى لحد ما يخلص.
5. **Save EAS build result:** بيرفع `build-result.json` كـ artifact، وجواه رابط التحميل.

ملفات APK/IPA نفسها محفوظة على EAS: https://expo.dev/accounts/andrewmelad/projects/daily-bloom/builds

### Re-run ولا push جديد؟

- **Re-run jobs:** بيستخدم **نفس نسخة** الـ workflow القديمة، بس بيقرا السيكرتس من جديد. استخدمه لو غيّرت سيكرت بس.
- **Push جديد:** لازم لو غيّرت أي ملف، زي `build.yml` أو `app.config.js`.

### إصدار المتاجر

Actions ← Validate and build Android + iOS ← Run workflow ← profile `production`. الناتج AAB لـ Google Play وIPA لـ App Store/TestFlight. الـ build **مش بينشر لوحده**، النشر محتاج `eas submit`.

---

## المشاكل المعروفة وحلولها

المشاكل دي كلها حصلت فعلًا أول مرة، وبالترتيب ده.

### 1. `userInterfaceStyle: Install expo-system-ui`

**العَرَض:** warning وقت `expo prebuild`، والـ dark mode مش بيتطبق على Android.
**السبب:** `userInterfaceStyle: "dark"` محتاج مكتبة `expo-system-ui`.
**الحل (اتعمل):**
```bash
npx expo install expo-system-ui
```

### 2. الأبلكيشن بيقفل أول ما يفتح: `NoSuchMethodError: getDirectConverter`

**العَرَض:** شاشة "There was a problem loading the project"، والخطأ جاي من `expo.modules.font.FontLoaderModule`.
**السبب:** `@expo/vector-icons` بيطلب `expo-font` كـ peer dependency بشرط `>=14.0.4` ومن غير حد أقصى. فـ npm سطّب `expo-font@57` (بتاع SDK 57) جوه vector-icons، والنسخة دي بتنادي method مش موجودة في `expo-modules-core` بتاع SDK 54.
**الحل (اتعمل):**
```bash
npx expo install expo-font     # بيثبت 14.0.x المتوافقة مع SDK 54
npm ls expo-font               # لازم تبقى نسخة واحدة "deduped"
```
وضفنا `"expo-font"` في `plugins` جوه `app.config.js`. وبعد كده **لازم** `prebuild --clean` و`npm run android`، لأن الـ Reload مش كفاية.

**عشان متتكررش:** بعد أي `npm install` شغّل `npm ls expo-font expo-modules-core` واتأكد إن مفيش نسخ أعلى من SDK 54.

### 3. `An Expo user account is required to proceed`

**العَرَض:** خطوة "Build signed binaries on EAS" بتفشل في ثانيتين.
**السبب:** السيكرت `EXPO_TOKEN` كان محطوط في Environment اسمه **Production**، والـ job مكانش معلن إنه بيستخدم الـ environment ده، فالسيكرت كان بيوصل فاضي. وexpo-github-action بيعدّي من غير login لو التوكن فاضي، ومبيطلعش أي خطأ.
**الحل (اتعمل):** ضفنا `environment: Production` للـ build job، وخطوة **Check EAS credentials** اللي بتوقف برسالة واضحة لو التوكن فاضي.

### 4. `The bearer token is invalid`

**العَرَض:** خطوة `expo-github-action` بتفشل عند `eas whoami`.
**السبب:** اللي اتحط في `EXPO_TOKEN` كان **GitHub Personal Access Token** (بيبدأ بـ `ghp_`) مش توكن Expo.
**الحل:** اعمل توكن من **expo.dev** (مش github.com)، وجرّبه بـ `eas-cli whoami` قبل ما تحطه. شوف [الخطوة 7](#الخطوة-7-github-actions).
**مهم:** لو لصقت أي توكن في مكان عام أو شات، اعمله **revoke** على طول.

### 5. `Experience with id '***' does not exist`

**العَرَض:** التوكن شغّال (`andrewmelad (authenticated using EXPO_TOKEN)`)، بس `eas build` بيفشل.
**السبب:** الـ Project ID القديم في `.env` وفي GitHub مكانش موجود على حساب `andrewmelad`، يعني كان اتعمل على حساب تاني أو اتمسح. وكمان `eas-cli` **مبيقراش `.env`** لوحده، فمحليًا كان بيشوف `REPLACE_WITH_EAS_PROJECT_ID`.
**الحل (اتعمل):** `eas init` عمل مشروع جديد على الحساب الصح، وكتبنا الـ ID مباشرة في `app.config.js`، وشلنا `EXPO_PUBLIC_EAS_PROJECT_ID` من الـ workflow. تقدر تمسح السيكرت القديم `EXPO_PUBLIC_EAS_PROJECT_ID` من Production في GitHub.

### 6. `ENOENT: no such file or directory ... GoogleService-Info.plist`

**العَرَض:** build الـ iOS بيفشل وهو بيقرا الـ config، ومعاه رسالة `No environment variables ... found for the "preview" environment`.
**السبب:** ملفات Firebase في `.gitignore`، فمش موجودة على GitHub، ومكانتش اترفعت لـ EAS.
**الحل:** [الخطوة 5](#الخطوة-5-رفع-ملفات-firebase-لـ-eas). نفس المشكلة هتحصل لـ Android مع `google-services.json` لو ملفه ماترفعش.

### 7. `app.config.js is missing ios.infoPlist.ITSAppUsesNonExemptEncryption`

**العَرَض:** warning في build الـ iOS.
**الحل (اتعمل):** ضفنا `infoPlist: { ITSAppUsesNonExemptEncryption: false }` في `ios` جوه `app.config.js`.

### 8. خطأ قديم: `Could not find any matches for app.notifee:core:+`

**العَرَض:** Android يفشل عند `:app:processDebugResources`، والمسارات التي بحث فيها Gradle تشير إلى اسم قديم لمجلد المشروع أو إلى `android/node_modules`.

**السبب:** مستودع Notifee عبارة عن Maven repository محلي داخل `node_modules`. استخدام مسار مطلق يجعله يتعطل بعد نقل المشروع، والمسار النسبي يُحسب من `android/app`.

**الحل الحالي:** تم استبدال Notifee غير المُصانة بـ `expo-notifications` الرسمية، لذلك Maven repository الإضافي لم يعد موجودًا. بعد سحب التحديث شغّل `npm ci` ثم أعد `prebuild`.

لو مجلد `android` كان متولد قبل الإصلاح، حدّثه ثم ابنِ المشروع:

```bash
npx expo prebuild --platform android --no-install
npm run android
```

لا ترجع لإضافة Notifee أو مسار Maven مطلق؛ إشعارات المؤقت الآن من Expo Notifications.

### رسائل تقدر تتجاهلها

- `! No git repo found` / `Continue with uncommitted changes?`: الرسالة دي كانت بتظهر قبل ما المشروع يبقى git repo.
- `Warning: Failed to save: Our services aren't available right now` في expo-github-action: ده cache بتاع GitHub وملوش علاقة بالـ build.
- `Error: The process '.../eas' failed with exit code 1`: سطر عام بيظهر مع أي فشل. **السبب الحقيقي دايمًا في السطور اللي فوقه.**
- `npm audit` vulnerabilities: تحذيرات في dev dependencies. **متشغّلش `npm audit fix --force`** لأنه ممكن يكسر توافق SDK 54.
- تحذيرات `Deprecated Gradle features` وتحذيرات namespace داخل المكتبات: لا تمنع البناء الحالي. عالجها فقط عند ترقية Expo/React Native/Gradle، ولا تعدّل ملفات `node_modules` يدويًا.

---

## قواعد لازم تفضل ماشي عليها

1. **`npx expo install` لأي مكتبة**، مش `npm install`.
2. **بعد أي تغيير native**، زي مكتبة جديدة أو `app.config.js` أو ملفات Firebase: اعمل `npx expo prebuild --clean` وبعدها `npm run android`.
3. **توكن Expo ييجي من expo.dev بس.** جرّبه بـ `eas-cli whoami` قبل ما تحطه في GitHub، ومتلصقوش في أي مكان.
4. **ملفات Firebase عمرها ما تترفع على git.** لو اتغيرت، ارفعها لـ EAS تاني بـ `env:create ... --force`.
5. **لما الـ workflow يفشل** افتح الـ step الحمرا واقرا السطور اللي **فوق** `exit code 1`.
6. **غيّرت سيكرت؟** Re-run كفاية. **غيّرت ملف؟** لازم push جديد.
7. **قبل أي push** شغّل:
   ```bash
   npm run typecheck && npm test && npx expo install --check
   ```

---

## طريقة حساب الإحصائيات

- اليوم بيتحسب حسب التاريخ المحلي للجهاز. خلّي الـ timezone ثابت لو بتقارن فترات ورا بعض وإنت مسافر.
- نسبة الانتظام = عدد المهام المجدولة اللي اتعملت ÷ عدد المهام المجدولة في آخر 30 يوم × 100.
- الأيام اللي قبل إنشاء المهمة وأيام الراحة مش بتدخل في المقام، ولا أيام المستقبل.
- تعديل المدة أو أيام التكرار بيبدأ من بكرة، أما الاسم واللون والرمز فبيتغيروا على طول. تاريخ المدة والجدول محفوظ في schedules.
- الأرشفة بتبدأ من بكرة ومش بتمسح الإنجازات اللي فاتت.
- الـ streak بيتجاهل أيام الراحة، ومش بينكسر عشان مهمة النهارده لسه ماخلصتش لحد ما اليوم يعدّي.
- مدة المهمة وإجماليات الشيتات تُحسب من وقت العمل الفعلي المسجل بالعداد أو يدويًا.
- المؤقّت اللي بيعدّي نص الليل بيسجّل الإنجاز بتاريخ اليوم اللي بدأ فيه.
- تقدر تصحّح إنجازات آخر 30 يوم بإيدك من الإحصائيات.

---

## الاختبار والتحقق

```bash
npm run typecheck
npm test
npx expo install --check
# أو كل الفحوصات السابقة معًا
npm run validate
```

اختبارات منطق الإحصائيات بتغطي تغيير الجدول والأرشفة وأيام الراحة وعدم تكرار الإنجاز وحدود الشهر.

اختبار يدوي على Android وiOS متصلين بمشروع Firebase: تسجيل ودخول، وإعادة تشغيل، واستعادة كلمة المرور، وإنشاء وتعديل، ومؤقّت في الخلفية، وإلغاء إنجاز، وقطع الشبكة ورجوعها، ورفض وصول حساب تاني للمسارات.

---

## قبل Google Play

راجع [PLAY_STORE_CHECKLIST.md](./PLAY_STORE_CHECKLIST.md) و[DATA_SAFETY.md](./DATA_SAFETY.md). حذف الحساب وسياسة الخصوصية موجودان داخل التطبيق، وصفحات الويب الجاهزة موجودة في `docs/` وتحتاج فقط بريد الدعم والنشر على رابط HTTPS عام.

## المراجع

- https://rnfirebase.io/
- https://docs.expo.dev/guides/using-firebase/
- https://docs.expo.dev/build/building-on-ci/
- https://docs.expo.dev/eas/environment-variables/
- https://docs.expo.dev/build/internal-distribution/
