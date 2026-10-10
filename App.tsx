import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import {
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { setAnalyticsCollectionEnabled } from "@react-native-firebase/analytics";
import {
  auth,
  db,
  analytics,
  track,
  globalTasksRef,
  globalEntriesRef,
  sheetsRef,
  appointmentsRef,
  workSessionsRef,
  saveGlobalTask,
  deleteGlobalTask,
  completeGlobalTask,
  undoGlobalTask,
  saveSheet,
  deleteSheet,
  saveAppointment,
  deleteAppointment,
  saveWorkSession,
  deleteWorkSession,
  deleteAccountData,
} from "./src/firebase";
import {
  dateKey,
  shift,
  metrics,
  range,
  streak,
  globalTaskDue,
  parseMinutes,
  GlobalTask,
  GlobalTaskEntry,
  WorkSheet,
  Appointment,
  WorkSession,
  isDateKey,
} from "./src/model";
import { LanguageProvider, useLanguage, Translator } from "./src/i18n";
import { requestTimerPermission, syncTimerNotification } from "./src/timerNotifications";
import { TaskItem, taskList, visibleTasks, taskStatisticsData } from "./src/tasks";
import { restoreTaskTimer } from "./src/timerState";
import { CalendarPanel, SheetsPanel } from "./src/FeaturePanels";
import { SoundChoice, deleteSoundData, loadSound, pickCustomSound, playFinishSound, saveSound, sounds } from "./src/sounds";
import { ToastInput, ToastProvider, useToast } from "./src/Toast";
const C = {
  bg: "#0B1017",
  card: "#151D28",
  line: "#263140",
  text: "#F2F5FA",
  muted: "#8B9AAF",
  mint: "#B5F4CB",
  purple: "#C4B5FD",
};

const emojis = ["🌿", "📖", "💪", "💧", "🧠", "🎨", "💻", "🧘"];
const colors = ["#B5F4CB", "#C4B5FD", "#FDCB92", "#9ACAFB"];
const error = (e: unknown, t: Translator, showToast: (input: ToastInput) => void) => {
  const code = (e as { code?: string })?.code || "";
  showToast({
    type: "error",
    title: t("تعذّر إكمال الطلب"),
    message: code.includes("invalid-credential") || code.includes("wrong-password")
      ? t("راجع البريد وكلمة المرور.")
      : code.includes("email-already-in-use")
        ? t("البريد ده مسجّل بالفعل.")
        : code.includes("network")
          ? t("راجع اتصال الإنترنت وحاول تاني.")
          : code.includes("permission-denied")
            ? t("راجع نشر Firestore Rules للمشروع.")
            : code.includes("too-many-requests")
              ? t("محاولات كتير، جرّب بعد شوية.")
              : t("حصل خطأ. راجع البيانات وإعداد Firebase وحاول تاني."),
  });
};
function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const { language } = useLanguage();
  const s = makeStyles(language === "ar");
  return <Text style={[s.text, style]}>{children}</Text>;
}
function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  const s = makeStyles(language === "ar");
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && { backgroundColor: C.line },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Label style={{ color: secondary ? C.text : C.bg, fontWeight: "800" }}>
        {title}
      </Label>
    </Pressable>
  );
}
function Field(props: React.ComponentProps<typeof TextInput>) {
  const { language } = useLanguage();
  const s = makeStyles(language === "ar");
  return (
    <TextInput
      placeholderTextColor={C.muted}
      {...props}
      style={[s.input, props.style]}
    />
  );
}
function LanguageSwitch() {
  const { language, changeLanguage, t } = useLanguage();
  const s = makeStyles(language === "ar");
  return (
    <View style={[s.row, { marginVertical: 12 }]}>
      <Label>{t("اللغة")}</Label>
      {(["ar", "en"] as const).map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityState={{ selected: language === value }}
          onPress={() => changeLanguage(value)}
          style={[s.chip, language === value && { backgroundColor: C.mint }]}
        >
          <Label style={{ color: language === value ? C.bg : C.text }}>
            {value === "ar" ? "العربية" : "English"}
          </Label>
        </Pressable>
      ))}
    </View>
  );
}
function Login() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const s = makeStyles(language === "ar");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8)
      return showToast({ type: "warning", title: t("راجع البيانات"), message: t("اكتب بريد صحيح وكلمة مرور ٨ أحرف على الأقل.") });
    setBusy(true);
    try {
      await (
        register ? createUserWithEmailAndPassword : signInWithEmailAndPassword
      )(auth, email.trim(), password);
    } catch (e) {
      error(e, t, showToast);
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.login}>
        <Image
          source={require("./logo-saay.png")}
          style={s.logo}
          accessibilityLabel={t("SYNQ")}
        />
        <LanguageSwitch />
        <Label style={s.brand}>{t("SYNQ")}</Label>
        <Label style={s.heroTitle}>
          {t("كل يوم أحسن،")}
          {"\n"}
          {t("خطوة بخطوة.")}
        </Label>
        <Label style={s.subtitle}>
          {t("كل مهامك في مكان واحد.")}
        </Label>
        <View style={[s.card, { marginTop: 32, width: "100%" }]}>
          <Label style={s.heading}>
            {register ? t("ابدأ رحلتك") : t("أهلًا برجوعك")}
          </Label>
          <Field
            accessibilityLabel={t("البريد الإلكتروني")}
            placeholder={t("البريد الإلكتروني")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            accessibilityLabel={t("كلمة المرور")}
            placeholder={t("كلمة المرور · ٨ أحرف على الأقل")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={register ? "new-password" : "current-password"}
          />
          <Button
            title={
              busy
                ? t("لحظة…")
                : register
                  ? t("إنشاء حساب")
                  : t("دخول لمساحتي ←")
            }
            disabled={busy}
            onPress={submit}
          />
          <Button
            secondary
            title={register ? t("عندي حساب بالفعل") : t("أول مرة؟ اعمل حساب")}
            onPress={() => setRegister(!register)}
          />
          <Pressable
            onPress={async () => {
              if (!email.trim()) return showToast({ type: "warning", title: t("اكتب بريدك أولًا") });
              try {
                await sendPasswordResetEmail(auth, email.trim());
                showToast({ type: "success", title: t("راجع بريدك"), message: t("لو البريد مسجّل هيوصلك رابط لتغيير كلمة المرور.") });
              } catch (e) {
                error(e, t, showToast);
              }
            }}
          >
            <Label style={[s.subtitle, { marginTop: 18 }]}>
              {" "}
              {t("نسيت كلمة المرور؟")}{" "}
            </Label>
          </Pressable>
        </View>
        <Label style={[s.subtitle, { marginTop: 24 }]}>
          {" "}
          {t("بياناتك خاصة بحسابك • التحليلات اختيارية")}{" "}
        </Label>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
type Timer = {
  taskId: string;
  date: string;
  remaining: number;
  end: number | null;
  sessionId: string;
  plannedSeconds: number;
};
function Home({ user }: { user: FirebaseAuthTypes.User }) {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const s = makeStyles(language === "ar");
  const days = [
    t("أحد"),
    t("إثنين"),
    t("ثلاثاء"),
    t("أربعاء"),
    t("خميس"),
    t("جمعة"),
    t("سبت"),
  ];
  const [filter, setFilter] = useState<"all" | "done" | "pending">("all"),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState<"today" | "tasks" | "sheets" | "calendar" | "stats" | "settings">("today"),
    [today, setToday] = useState(dateKey()),
    [busy, setBusy] = useState(false),
    [timer, setTimer] = useState<Timer | null>(null),
    [timerReady, setTimerReady] = useState(false),
    [tick, setTick] = useState(Date.now()),
    [consent, setConsent] = useState(false),
    [historyDate, setHistoryDate] = useState(dateKey());
  const [globalTasks, setGlobalTasks] = useState<GlobalTask[]>([]);
  const [globalEntries, setGlobalEntries] = useState<GlobalTaskEntry[]>([]);
  const [sheets, setSheets] = useState<WorkSheet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState(dateKey());
  const [finishSound, setFinishSound] = useState<SoundChoice>(sounds[0]);
  const [globalReady, setGlobalReady] = useState(false);
  const [globalFailed, setGlobalFailed] = useState(false);
  const [globalEntriesReady, setGlobalEntriesReady] = useState(false);
  const [gtMinutes, setGtMinutes] = useState("20");
  const [manualLogTask, setManualLogTask] = useState<TaskItem | null>(null);
  const [manualMinutes, setManualMinutes] = useState("60");
  const [manualDate, setManualDate] = useState(dateKey());
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [globalTaskEditor, setGlobalTaskEditor] = useState<
    GlobalTask | null | undefined
  >(undefined);
  // global task editor fields
  const [gtName, setGtName] = useState("");
  const [gtEmoji, setGtEmoji] = useState("✅");
  const [gtColor, setGtColor] = useState(colors[0]);
  const [gtIsEssential, setGtIsEssential] = useState(false);
  const [gtDays, setGtDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const timerKey = "timer:" + user.uid;
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(timerKey)
      .then((v) => {
        if (active) {
          if (v) {
            try {
              setTimer(restoreTaskTimer(v));
            } catch {}
          }
          setTimerReady(true);
        }
      })
      .catch(() => {
        if (active) setTimerReady(true);
      });
    loadSound(user.uid).then(value => { if (active) setFinishSound(value); }).catch(() => {});
    getDoc(doc(db, "users", user.uid))
      .then(async (d) => {
        if (active) {
          const enabled = d.data()?.analytics === true;
          setConsent(enabled);
          await setAnalyticsCollectionEnabled(analytics, enabled);
        }
      })
      .catch(() => {});
    const interval = setInterval(() => {
      setTick(Date.now());
      setToday(dateKey());
    }, 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setTick(Date.now());
        setToday(dateKey());
      }
    });
    const c = onSnapshot(
      globalTasksRef(user.uid),
      (snap) => {
        setGlobalTasks(
          snap.docs.map(
            (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
              d.data() as GlobalTask,
          ),
        );
        setGlobalReady(true);
        setGlobalFailed(false);
      },
      () => {
        setGlobalFailed(true);
        setGlobalReady(true);
      },
    );
    const d2 = onSnapshot(
      globalEntriesRef(user.uid),
      (snap) => {
        setGlobalEntries(
          snap.docs.map(
            (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
              d.data() as GlobalTaskEntry,
          ),
        );
        setGlobalEntriesReady(true);
      },
      () => { setGlobalFailed(true); setGlobalEntriesReady(true); },
    );
    const e = onSnapshot(sheetsRef(user.uid), snap => {
      setSheets(snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => d.data() as WorkSheet));
    }, () => setGlobalFailed(true));
    const f = onSnapshot(appointmentsRef(user.uid), snap => {
      setAppointments(snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => d.data() as Appointment));
    }, () => setGlobalFailed(true));
    const g = onSnapshot(workSessionsRef(user.uid), snap => {
      setWorkSessions(snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => d.data() as WorkSession));
    }, () => setGlobalFailed(true));
    return () => {
      active = false;
      c();
      d2();
      e();
      f();
      g();
      clearInterval(interval);
      sub.remove();
    };
  }, [user.uid]);
  useEffect(() => {
    if (timerReady)
      AsyncStorage.setItem(timerKey, JSON.stringify(timer)).catch(() => {});
  }, [timer, timerReady]);
  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (e) {
      error(e, t, showToast);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const tasks = taskList(globalTasks, globalEntries, today);
  const shownTasks = visibleTasks(tasks, filter, query);
  const history = taskStatisticsData(globalTasks, globalEntries);
  const dayStats = metrics(history.tasks, history.entries, today, 1);
  const summary = metrics(history.tasks, history.entries, today);
  const activeHistoryTasks = history.tasks.filter(task => !task.archivedDate || task.archivedDate > today);
  const todays = tasks.filter(task => task.scheduled);
  const tasksForDate = (date: string) => taskList(globalTasks, globalEntries, date).filter(task => task.scheduled);
  const filteredDateTasks = (date: string) => visibleTasks(tasksForDate(date), filter, query);
  const formatDate = (date: string) => new Date(date + "T12:00:00").toLocaleDateString(
    language === "ar" ? "ar-EG" : "en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const filters = (date: string) => <View style={{ gap: 8 }}>
    <Field placeholder={t("ابحث عن مهمة")} accessibilityLabel={t("ابحث عن مهمة")} value={query} onChangeText={setQuery} />
    <View style={s.wrap}>
      {(["all", "pending", "done"] as const).map(value => <Pressable key={value}
        accessibilityRole="button" accessibilityState={{ selected: filter === value }}
        onPress={() => setFilter(value)} style={[s.chip, filter === value && { backgroundColor: C.mint }]}>
        <Label style={{ color: filter === value ? C.bg : C.text }}>
          {t(value === "all" ? "الكل" : value === "done" ? "مكتملة" : "غير مكتملة")} · {visibleTasks(tasksForDate(date), value, "").length}
        </Label>
      </Pressable>)}
    </View>
  </View>;

  const remaining = timer
      ? Math.max(
          0,
          timer.end ? Math.ceil((timer.end - tick) / 1000) : timer.remaining,
        )
      : 0;
  const timerName = tasks.find(h => h.id === timer?.taskId)?.name || t("جلسة التركيز");
  const timerFinished = remaining === 0;
  const previousRemaining = useRef<number | null>(null);
  const recordedSessions = useRef(new Set<string>());
  const timerElapsed = (value: Timer, secondsLeft: number) =>
    Math.max(0, value.plannedSeconds - secondsLeft);
  const persistTimerSession = (value: Timer, seconds: number) => {
    if (seconds < 1) return Promise.resolve();
    return saveWorkSession(user.uid, {
      id: value.sessionId,
      taskId: value.taskId.replace(/^global:/, ""),
      date: value.date,
      seconds: Math.min(86400, Math.round(seconds)),
      source: "timer",
      createdAt: Date.now(),
    });
  };
  useEffect(() => {
    if (timer && previousRemaining.current !== null && previousRemaining.current > 0 && remaining === 0) {
      playFinishSound(finishSound);
    }
    previousRemaining.current = timer ? remaining : null;
  }, [remaining, !!timer, finishSound.id, finishSound.uri]);
  useEffect(() => {
    if (!timer || remaining !== 0 || recordedSessions.current.has(timer.sessionId)) return;
    recordedSessions.current.add(timer.sessionId);
    void persistTimerSession(timer, timerElapsed(timer, remaining))
      .then(() => showToast({ type: "success", title: t("تم تسجيل الوقت") }))
      .catch(e => {
        recordedSessions.current.delete(timer.sessionId);
        error(e, t, showToast);
      });
  }, [timer?.sessionId, remaining]);
  useEffect(() => {
    if (!timerReady) return;
    void syncTimerNotification(timerFinished ? null : timer, timerName, language, finishSound.id)
      .catch(() => showToast({ type: "warning", title: t("تعذّر عرض إشعار المؤقّت"), message: t("المؤقّت شغال داخل التطبيق. جرّب تفعيل الإشعارات من الإعدادات.") }));
  }, [timer, timerReady, timerName, timerFinished, language, finishSound.id]);
  useEffect(() => () => { void syncTimerNotification(null, "", language).catch(() => {}); }, [user.uid]);
  function mark(task: TaskItem, date = today) {
    if (date > today) return;
    const scheduled = date >= task.source.createdDate && globalTaskDue(task.source, date);
    if (!scheduled) return;
    void run(async () => {
      const measured = timer?.taskId === task.id && timer.date === date
        ? timerElapsed(timer, remaining) : undefined;
      if (timer?.taskId === task.id && timer.date === date && measured)
        await persistTimerSession(timer, measured);
      await completeGlobalTask(user.uid, task.source, date, measured);
      if (timer?.taskId === task.id && timer.date === date) setTimer(null);
      void track("task_completed");
      showToast({ type: "success", title: t("تم إنجاز المهمة") });
    });
  }
  function start(h: TaskItem) {
    const go = async () => {
      try {
        if (!(await requestTimerPermission()))
          showToast({ type: "warning", title: t("إشعارات المؤقّت"), message: t("فعّل الإشعارات من إعدادات التطبيق لمتابعة الوقت خارج التطبيق.") });
      } catch {
        showToast({ type: "warning", title: t("تعذّر عرض إشعار المؤقّت"), message: t("المؤقّت شغال داخل التطبيق. جرّب تفعيل الإشعارات من الإعدادات.") });
      }
      setTick(Date.now());
      setTimer({
        taskId: h.id,
        date: today,
        remaining: h.minutes * 60,
        end: Date.now() + h.minutes * 60000,
        sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        plannedSeconds: h.minutes * 60,
      });
    };
    if (timer && timer.taskId !== h.id)
      Alert.alert(t("تغيير المؤقّت؟"), t("هيتم إلغاء المؤقّت الحالي."), [
        { text: t("رجوع") },
        { text: t("ابدأ"), onPress: go },
      ]);
    else if (!timer) go();
  }
  function stopAndSaveTimer() {
    if (!timer) return;
    const current = { ...timer, remaining, end: null };
    const elapsed = timerElapsed(current, remaining);
    if (elapsed < 1) return showToast({ type: "warning", title: t("لا يوجد وقت لتسجيله") });
    setTimer(current);
    void run(async () => {
      await persistTimerSession(current, elapsed);
      recordedSessions.current.add(current.sessionId);
      setTimer(null);
      showToast({ type: "success", title: t("تم تسجيل الوقت") });
    });
  }
  function openManualLog(task: TaskItem, date = today) {
    setManualLogTask(task);
    setManualDate(date);
    setManualMinutes("60");
  }
  function saveManualLog() {
    if (!manualLogTask) return;
    const minutes = parseMinutes(manualMinutes);
    if (!isDateKey(manualDate) || manualDate > today || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440)
      return showToast({ type: "warning", title: t("راجع الوقت"), message: t("اكتب تاريخًا صحيحًا ومدة من ١ إلى ١٤٤٠ دقيقة.") });
    void run(async () => {
      await saveWorkSession(user.uid, {
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        taskId: manualLogTask.source.id,
        date: manualDate,
        seconds: minutes * 60,
        source: "manual",
        createdAt: Date.now(),
      });
      setManualLogTask(null);
      showToast({ type: "success", title: t("تم تسجيل الوقت") });
    });
  }
  function requestAccountDeletion() {
    if (!deletePassword)
      return showToast({ type: "warning", title: t("اكتب كلمة المرور الحالية") });
    Alert.alert(t("حذف الحساب نهائيًا؟"), t("سيتم حذف الحساب وكل المهمات والجلسات والشيتات والمواعيد. لا يمكن التراجع."), [
      { text: t("رجوع"), style: "cancel" },
      { text: t("حذف نهائي"), style: "destructive", onPress: () => void run(async () => {
        if (!user.email) throw new Error("Account has no email");
        const credential = EmailAuthProvider.credential(user.email, deletePassword);
        await reauthenticateWithCredential(user, credential);
        await deleteAccountData(user.uid);
        await deleteSoundData(user.uid).catch(() => {});
        await AsyncStorage.removeItem(timerKey).catch(() => {});
        await syncTimerNotification(null, "", language).catch(() => {});
        await setAnalyticsCollectionEnabled(analytics, false).catch(() => {});
        await deleteUser(user);
        setDeletePassword("");
        setDeleteAccountOpen(false);
        showToast({ type: "success", title: t("تم حذف الحساب والبيانات") });
      }) },
    ]);
  }
  function openGlobalTask(task: GlobalTask | null) {
    setGlobalTaskEditor(task);
    setGtName(task?.name || "");
    setGtMinutes(String(task?.minutes ?? 20));
    setGtEmoji(task?.emoji || "✅");
    setGtColor(task?.color || colors[0]);
    setGtIsEssential(task?.isEssential ?? false);
    setGtDays(task?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  }
  async function saveGt() {
    if (
      !gtName.trim() ||
      gtName.trim().length > 60 ||
      !Number.isInteger(parseMinutes(gtMinutes)) ||
      parseMinutes(gtMinutes) < 1 || parseMinutes(gtMinutes) > 720 ||
      (!gtIsEssential && !gtDays.length)
    )
      return showToast({ type: "warning", title: t("راجع بيانات المهمة"), message: t("الاسم من ١ إلى ٦٠ حرف، المدة من ١ إلى ٧٢٠ دقيقة، واختار يوم واحد على الأقل.") });
    await run(async () => {
      const task: GlobalTask = {
        id:
          globalTaskEditor?.id ||
          `gt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: gtName.trim(),
        minutes: parseMinutes(gtMinutes),
        emoji: gtEmoji,
        color: gtColor,
        isEssential: gtIsEssential,
        days: gtIsEssential ? [] : [...gtDays].sort(),
        createdDate: globalTaskEditor?.createdDate || today,
        archivedDate: null,
      };
      await saveGlobalTask(user.uid, task);
      setGlobalTaskEditor(undefined);
      void track("global_task_saved");
      showToast({ type: "success", title: t("تم حفظ المهمة") });
    });
  }
  function removeGlobalTask(task: GlobalTask) {
    if (task.isEssential || busy) return;
    Alert.alert(t("حذف المهمة؟"), t("هيتم حذف المهمة نهائيًا."), [
      { text: t("رجوع"), style: "cancel" },
      { text: t("حذف"), style: "destructive", onPress: () => void run(async () => {
        await deleteGlobalTask(user.uid, task);
        setGlobalTasks(current => current.filter(item => item.id !== task.id));
        if (timer?.taskId === `global:${task.id}`) setTimer(null);
        setGlobalTaskEditor(undefined);
        showToast({ type: "success", title: t("تم حذف المهمة") });
      }) },
    ]);
  }
  function toggleTask(task: TaskItem, date = today) {
    if (!task.scheduled || date > today) return;
    if (!task.done) return mark(task, date);
    Alert.alert(t("إلغاء الإنجاز؟"), t("هيتم إلغاء إنجاز المهمة."), [
      { text: t("رجوع"), style: "cancel" },
      { text: t("إلغاء الإنجاز"), onPress: () => void run(async () => {
        await undoGlobalTask(user.uid, task.source.id + "_" + date);
        showToast({ type: "success", title: t("تم إلغاء الإنجاز") });
      }) },
    ]);
  }
  const taskCard = (task: TaskItem, date = today) => (
    <View key={task.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: task.color }]}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Label style={s.heading}>{task.name}</Label>
          <Label style={s.small}>{task.minutes} {t("دقيقة")} · {task.isEssential ? t("مهمة أساسية (كل يوم)") : t("مهمة مرنة (أيام معينة)")}</Label>
        </View>
        <Label style={{ fontSize: 25 }}>{task.emoji}</Label>
      </View>
      <Label style={{ color: task.done ? C.mint : C.muted }}>
        {task.done ? t("✓ تم الإنجاز") : task.scheduled ? t("غير مكتملة") : t("غير مجدولة")}
      </Label>
      {workSessions.some(session => session.taskId === task.source.id && session.date === date) && <Label style={s.small}>
        {t(date === today ? "وقت مسجل اليوم" : "وقت مسجل")}: {(workSessions.filter(session => session.taskId === task.source.id && session.date === date)
          .reduce((total, session) => total + session.seconds, 0) / 3600).toFixed(2)} {t("ساعة")}
      </Label>}
      <View style={s.wrap}>
        {task.scheduled && <Pressable disabled={busy || date > today} style={s.pill} onPress={() => toggleTask(task, date)}>
          <Label style={s.link}>{task.done ? t("إلغاء الإنجاز") : t("○ علّم كمكتملة")}</Label>
        </Pressable>}
        {date === today && task.scheduled && !task.done && <Pressable disabled={!timerReady || busy} style={s.pill} onPress={() => start(task)}>
          <Label style={s.link}>{t("ابدأ التركيز ▷")}</Label>
        </Pressable>}
        {date <= today && <Pressable disabled={busy} style={s.pill} onPress={() => openManualLog(task, date)}>
          <Label style={s.link}>{t("سجل وقت")}</Label>
        </Pressable>}
        <Pressable style={s.pill} disabled={busy} onPress={() => openGlobalTask(task.source)}>
          <Label style={s.link}>{t("تعديل")}</Label>
        </Pressable>
        {!task.isEssential && <Pressable style={s.pill} disabled={busy} accessibilityLabel={`${t("حذف")} ${task.name}`} onPress={() => removeGlobalTask(task.source)}>
          <Label style={{ color: "#ff6b6b" }}>{t("حذف")}</Label>
        </Pressable>}
      </View>
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.row}>
          <Image
            source={require("./logo-saay.png")}
            style={s.avatar}
            accessibilityLabel={t("SYNQ")}
          />
          <View>
            <Label style={s.small}>{t("كل مهامك في مكان واحد.")}</Label>
            <Label style={s.brand}>{t("SYNQ")}</Label>
          </View>
        </View>
        <Label style={[s.heroTitle, { marginTop: 26 }]}>
          {tab === "today" ? t("يوم جديد، فرصة جديدة.") : tab === "tasks" ? t("مهامي") : tab === "sheets" ? t("شيتات العمل") : tab === "calendar" ? t("مواعيدي") : tab === "stats" ? t("بص على اللي حققته.") : t("مساحتك الخاصة.")}
        </Label>
        <Label style={s.subtitle}>
          {new Date(today + "T12:00:00").toLocaleDateString(
            language === "ar" ? "ar-EG" : "en-US",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
            },
          )}
        </Label>
        {globalFailed && (
          <View style={s.card}>
            <Label>
              {" "}
              {t(
                "تعذّر تحميل بعض البيانات. راجع الإنترنت وFirestore Rules.",
              )}{" "}
            </Label>
          </View>
        )}
        {!globalReady || !globalEntriesReady ? (
          <ActivityIndicator color={C.mint} style={{ margin: 40 }} />
        ) : (
          <>
            {tab === "today" && (
              <>
                <LinearGradient colors={["#264936", "#182C29"]} style={s.hero}>
                  <Label style={{ color: C.mint }}>{t("زخمك اليومي")}</Label>
                  <View style={s.row}>
                    <View>
                      <Label style={[s.heroTitle, { fontSize: 46 }]}>
                        {dayStats.rate}
                        <Text style={{ fontSize: 22 }}>%</Text>
                      </Label>
                      <Label style={s.small}>
                        {dayStats.done} {" "}{t("من")}{" "}{dayStats.expected} {" "}{t("مهام النهارده")}{" "}</Label>
                    </View>
                    <View style={s.orbit}>
                      <Label style={{ fontSize: 42 }}>✳</Label>
                    </View>
                  </View>
                  <View style={s.track}>
                    <View style={[s.fill, { width: `${dayStats.rate}%` }]} />
                  </View>
                  <Label style={{ marginTop: 14, color: C.mint }}>
                    {dayStats.expected && dayStats.done === dayStats.expected
                      ? t("رائع! خلصت كل مهام النهارده ✨")
                      : t("مش لازم تكون مثالي، المهم تستمر.")}
                  </Label>
                </LinearGradient>
                <View style={s.card}>
                  <Label style={s.heading}>{t("سجل الأيام")}</Label>
                  <View style={[s.wrap, { gap: 6 }]}>
                    {range(today, 7).map(date => {
                      const stats = metrics(history.tasks, history.entries, date, 1);
                      return <Pressable key={date} accessibilityRole="button"
                        accessibilityLabel={formatDate(date) + ": " + stats.done + "/" + stats.expected + " " + t("مكتملة")}
                        onPress={() => { setHistoryDate(date); setFilter("all"); setQuery(""); setTab("stats"); }}
                        style={[s.chip, { minWidth: 54, alignItems: "center", borderWidth: 1, borderColor: date === today ? C.mint : C.line }]}>
                        <Label style={s.small}>{days[new Date(date + "T12:00:00").getDay()]}</Label>
                        <Label style={{ color: stats.expected && stats.done === stats.expected ? C.mint : C.text }}>{stats.done}/{stats.expected}</Label>
                      </Pressable>;
                    })}
                  </View>
                </View>
                <View style={s.row}>
                  <Pressable onPress={() => openGlobalTask(null)}>
                    <Label style={s.link}>{t("＋ مهمة جديدة")}</Label>
                  </Pressable>
                  <Label style={s.heading}>{t("خطة النهارده")}</Label>
                </View>
                {filters(today)}
                <Label style={s.small}>{t("باقي اليوم")}: {dayStats.expected - dayStats.done}</Label>
                {filteredDateTasks(today).map(h => taskCard(h, today))}
                {!!todays.length && !filteredDateTasks(today).length && <Label style={s.subtitle}>{t("لا توجد مهام مطابقة")}</Label>}
                {!todays.length && (
                  <View style={s.card}>
                    <Label style={{ fontSize: 40 }}>🌱</Label>
                    <Label style={s.heading}>{t("ابدأ بخطوة بسيطة")}</Label>
                    <Label style={s.subtitle}>
                      {" "}{t("مفيش مهام مجدولة لليوم. أضف قراءة أو رياضة أو وقت لنفسك.")}{" "}</Label>
                    <Button title={t("أضف أول مهمة")} onPress={() => openGlobalTask(null)} />
                  </View>
                )}
              </>
            )}
            {tab === "tasks" && (
              <>
                <Button title={t("＋ مهمة جديدة")} onPress={() => openGlobalTask(null)} />
                <Field placeholder={t("ابحث عن مهمة")} accessibilityLabel={t("ابحث عن مهمة")} value={query} onChangeText={setQuery} />
                <View style={s.wrap}>
                  {(["all", "pending", "done"] as const).map(value => (
                    <Pressable key={value} style={[s.chip, filter === value && { backgroundColor: C.mint }]} onPress={() => setFilter(value)}>
                      <Label style={{ color: filter === value ? C.bg : C.text }}>{t(value === "all" ? "الكل" : value === "done" ? "مكتملة" : "غير مكتملة")}</Label>
                    </Pressable>
                  ))}
                </View>
                {shownTasks.map(task => taskCard(task))}
                {!shownTasks.length && <Label style={s.subtitle}>{tasks.length ? t("لا توجد مهام مطابقة") : t("أضف أول مهمة وابدأ.")}</Label>}
              </>
            )}
            {tab === "sheets" && (
              <SheetsPanel
                sheets={sheets}
                tasks={globalTasks}
                sessions={workSessions}
                language={language}
                t={t}
                busy={busy}
                onSave={sheet => run(() => saveSheet(user.uid, sheet))}
                onDelete={id => run(() => deleteSheet(user.uid, id))}
                onDeleteSession={id => run(() => deleteWorkSession(user.uid, id))}
              />
            )}
            {tab === "calendar" && (
              <CalendarPanel
                appointments={appointments}
                selectedDate={selectedAppointmentDate}
                setSelectedDate={setSelectedAppointmentDate}
                t={t}
                busy={busy}
                onSave={item => run(() => saveAppointment(user.uid, item))}
                onDelete={id => run(() => deleteAppointment(user.uid, id))}
              />
            )}
            {tab === "stats" && (
              <>
                <View style={s.card}>
                  <Label>{t("المنجز هذا الأسبوع")}: {metrics(history.tasks, history.entries, today, 7).done}</Label>
                  <Label>{t("أفضل سلسلة حالية")}: {Math.max(0, ...activeHistoryTasks.map(h => streak(h, history.entries, today)))} {t("يوم")}</Label>
                </View>
                <View style={s.statRow}>
                  {[
                    [`${summary.rate}%`, t("انتظام آخر ٣٠ يوم")],
                    [`${history.entries.length}`, t("إجمالي الإنجازات")],
                    [
                      `${history.entries.reduce((n, e) => n + e.minutes, 0)}`,
                      t("دقائق مخططة منجزة"),
                    ],
                  ].map(([v, l]) => (
                    <View key={l} style={[s.card, { flex: 1, padding: 12 }]}>
                      <Label
                        style={[s.heading, { color: C.mint, fontSize: 24 }]}
                      >
                        {v}
                      </Label>
                      <Label style={[s.small, { fontSize: 10 }]}>{l}</Label>
                    </View>
                  ))}
                </View>
                <View style={s.card}>
                  <Label style={s.heading}>{t("إيقاع الأسبوع")}</Label>
                  <View style={s.chart}>
                    {range(today, 7).map((d) => {
                      const m = metrics(history.tasks, history.entries, d, 1);
                      return (
                        <View key={d} style={s.barColumn}>
                          <Label style={{ fontSize: 10, color: C.muted }}>
                            {m.expected ? m.rate + "%" : "—"}
                          </Label>
                          <View style={s.barTrack}>
                            <View
                              style={[
                                s.bar,
                                {
                                  height: `${m.rate}%`,
                                  backgroundColor:
                                    d === today ? C.mint : C.purple,
                                },
                              ]}
                            />
                          </View>
                          <Label style={{ fontSize: 10 }}>
                            {days[new Date(d + "T12:00:00").getDay()]}
                          </Label>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={s.card}>
                  <Label style={s.heading}>{t("كل خطوة بتفرق")}</Label>
                  <Label style={s.small}>
                    {" "}{t("آخر ٣٠ يوم · اضغط على يوم لعرض تفاصيله")}{" "}</Label>
                  <View style={s.heatmap}>
                    {range(today, 30).map((d) => {
                      const m = metrics(history.tasks, history.entries, d, 1);
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: historyDate === d }}
                          accessibilityLabel={formatDate(d) + ": " + m.done + "/" + m.expected + " " + t("مكتملة")}
                          key={d}
                          onPress={() => setHistoryDate(d)}
                          style={[
                            s.cell,
                            {
                              backgroundColor: !m.done
                                ? C.line
                                : m.rate === 100
                                  ? C.mint
                                  : "#528D70",
                              borderWidth: historyDate === d ? 2 : 0,
                              borderColor: "#FFFFFF",
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Label>{formatDate(historyDate)}</Label>
                </View>
                <View style={s.card}>
                  <Label style={s.heading}>{t("سجل الأيام")}</Label>
                  <View style={s.row}>
                    <Button secondary title={t("اليوم السابق")} onPress={() => setHistoryDate(shift(historyDate, -1))} />
                    <Button secondary title={t("اليوم التالي")} disabled={historyDate >= today} onPress={() => setHistoryDate(shift(historyDate, 1))} />
                  </View>
                  <Label>{formatDate(historyDate)}</Label>
                  <Button secondary title={t("اليوم")} onPress={() => setHistoryDate(today)} />
                  <Label>{t("مكتملة")}: {metrics(history.tasks, history.entries, historyDate, 1).done} · {t("غير مكتملة")}: {metrics(history.tasks, history.entries, historyDate, 1).expected - metrics(history.tasks, history.entries, historyDate, 1).done}</Label>
                  {filters(historyDate)}
                </View>
                {filteredDateTasks(historyDate).map(h => taskCard(h, historyDate))}
                {!filteredDateTasks(historyDate).length && <Label style={s.subtitle}>{t(tasksForDate(historyDate).length > 0 ? "لا توجد مهام مطابقة" : "لا توجد مهام مجدولة لهذا اليوم")}</Label>}
                <Label style={s.small}>
                  {" "}{t("الانتظام = الإنجازات ÷ المهام المجدولة. الدقائق هي مدة المهام المنجزة، وليست قياسًا لوقت استخدام الهاتف.")}{" "}</Label>
              </>
            )}
            {tab === "settings" && (
              <>
                <LanguageSwitch />
                <View style={s.card}>
                  <Label style={s.heading}>{t("نغمة انتهاء المهمة")}</Label>
                  <Label style={s.small}>{t("اختر نغمة من SYNQ أو حمّل ملفًا صوتيًا من جهازك.")}</Label>
                  <View style={s.wrap}>
                    {sounds.map(sound => <Pressable key={sound.id}
                      style={[s.chip, finishSound.id === sound.id && { backgroundColor: C.mint }]}
                      onPress={() => void saveSound(user.uid, sound)
                        .then(() => { setFinishSound(sound); playFinishSound(sound); showToast({ type: "success", title: t("تم اختيار النغمة") }); })
                        .catch(e => error(e, t, showToast))}>
                      <Label style={{ color: finishSound.id === sound.id ? C.bg : C.text }}>{t(sound.name as any)}</Label>
                    </Pressable>)}
                    <Pressable style={[s.chip, finishSound.id === "custom" && { backgroundColor: C.mint }]}
                      onPress={() => void pickCustomSound(user.uid).then(sound => { if (sound) { setFinishSound(sound); playFinishSound(sound); showToast({ type: "success", title: t("تم اختيار النغمة") }); } }).catch(() => showToast({ type: "error", title: t("تعذّر تحميل النغمة"), message: t("اختر ملفًا صوتيًا بحجم أقل من 15 MB.") }))}>
                      <Label style={{ color: finishSound.id === "custom" ? C.bg : C.text }}>{t("تحميل من الجهاز")}</Label>
                    </Pressable>
                  </View>
                  {finishSound.id === "custom" && <Label style={s.small}>{finishSound.name}</Label>}
                </View>
                <View style={s.card}>
                  <Label style={s.heading}>{t("حسابي")}</Label>
                  <Label style={s.small}>{user.email}</Label>
                  <Label style={[s.small, { marginTop: 15 }]}>
                    {" "}
                    {t("المظهر: ليلي 🌙 · اليوم حسب توقيت جهازك")}{" "}
                  </Label>
                </View>
                <View style={s.card}>
                  <Label style={s.heading}>{t("الخصوصية والبيانات")}</Label>
                  <Label style={s.small}>{t("اعرف البيانات التي يحفظها SYNQ أو احذف حسابك وبياناتك نهائيًا.")}</Label>
                  <Button secondary title={t("سياسة الخصوصية")} onPress={() => setPrivacyOpen(true)} />
                  <Pressable disabled={busy} style={[s.pill, { alignSelf: "stretch", alignItems: "center", backgroundColor: "#48242B" }]} onPress={() => setDeleteAccountOpen(true)}>
                    <Label style={{ color: "#FF93A0", fontWeight: "800" }}>{t("حذف حسابي وبياناتي")}</Label>
                  </Pressable>
                </View>
                <View style={s.card}>
                  <View style={s.row}>
                    <Switch
                      value={consent}
                      trackColor={{ true: "#528D70" }}
                      onValueChange={(v) =>
                        void run(async () => {
                          await setDoc(
                            doc(db, "users", user.uid),
                            { analytics: v },
                            { merge: true },
                          );
                          await setAnalyticsCollectionEnabled(analytics, v);
                          setConsent(v);
                        })
                      }
                    />
                    <Label style={s.heading}>{t("تحليلات الاستخدام")}</Label>
                  </View>
                  <Label style={s.small}>
                    {" "}
                    {t(
                      "اختياري: إرسال أحداث عامة مثل إكمال مهمة لتحسين التطبيق. لا نرسل أسماء المهام أو البريد في الأحداث.",
                    )}{" "}
                  </Label>
                </View>
                <View style={s.card}>
                  <Label style={s.heading}>{t("على مهلك، لكن استمر 🌿")}</Label>
                  <Label style={s.small}>
                    {" "}
                    {t(
                      "المؤقّت لا يسجّل الإنجاز تلقائيًا.",
                    )}{" "}
                  </Label>
                </View>
                <Button
                  secondary
                  title={t("تسجيل الخروج")}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await setAnalyticsCollectionEnabled(analytics, false);
                      await signOut(auth);
                    })
                  }
                />
              </>
            )}
          </>
        )}
      </ScrollView>
      {timer && (
        <View style={s.timer}>
          <View style={s.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("إلغاء المؤقت")}
              onPress={() => setTimer(null)}
            >
              <Ionicons name="close" size={24} color={C.muted} />
            </Pressable>
            <Label>
              {tasks.find((h) => h.id === timer.taskId)?.name ||
                t("جلسة التركيز")}{" "}
              · {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("إيقاف أو استئناف المؤقت")}
              onPress={() =>
                setTimer({
                  ...timer,
                  remaining,
                  end: timer.end ? null : Date.now() + remaining * 1000,
                })
              }
            >
              <Ionicons
                name={timer.end ? "pause" : "play"}
                size={24}
                color={C.mint}
              />
            </Pressable>
          </View>
          {remaining > 0 && timerElapsed(timer, remaining) > 0 && (
            <Button disabled={busy} title={t("إنهاء وتسجيل الوقت")} onPress={stopAndSaveTimer} />
          )}
          {remaining === 0 && (
            <Button
              disabled={busy}
              title={t("الجلسة خلصت ✨ سجّل الإنجاز")}
              onPress={() => {
                const h = tasks.find((x) => x.id === timer.taskId);
                if (h) mark(h, timer.date);
              }}
            />
          )}
        </View>
      )}
      <View style={s.nav}>
        {([
          ["settings", "options-outline", t("حسابي")],
          ["stats", "stats-chart-outline", t("إحصائياتي")],
          ["calendar", "calendar-outline", t("مواعيدي")],
          ["sheets", "document-text-outline", t("شيتاتي")],
          ["tasks", "checkmark-circle-outline", t("مهامي")],
          ["today", "sunny-outline", t("يومي")],
        ] as const).map(([key, icon, title]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            style={s.navItem}
            onPress={() => {
              setTab(key);
              void track("tab_opened");
            }}
          >
            <Ionicons
              name={icon as any}
              size={23}
              color={tab === key ? C.mint : C.muted}
            />
            <Label
              style={{ fontSize: 11, color: tab === key ? C.mint : C.muted }}
            >
              {title}
            </Label>
          </Pressable>
        ))}
      </View>
      <Modal visible={privacyOpen} animationType="slide" onRequestClose={() => setPrivacyOpen(false)}>
        <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content}>
          <View style={s.row}>
            <Pressable onPress={() => setPrivacyOpen(false)}><Label style={s.link}>{t("إغلاق")}</Label></Pressable>
            <Label style={s.heading}>{t("سياسة خصوصية SYNQ")}</Label>
          </View>
          <View style={s.card}>
            <Label style={s.heading}>{t("البيانات التي نحفظها")}</Label>
            <Label>{t("نحفظ بريدك لتسجيل الدخول، والمهمات والجلسات والشيتات والمواعيد التي تدخلها لتشغيل التطبيق ومزامنتها عبر Firebase.")}</Label>
          </View>
          <View style={s.card}>
            <Label style={s.heading}>{t("التحليلات والملفات")}</Label>
            <Label>{t("تحليلات Firebase اختيارية ومتوقفة حتى توافق عليها. لا نرسل أسماء المهمات أو بريدك كأحداث تحليلية. النغمة التي تختارها تظل على جهازك.")}</Label>
          </View>
          <View style={s.card}>
            <Label style={s.heading}>{t("الاستخدام والحماية")}</Label>
            <Label>{t("تُستخدم البيانات لتشغيل SYNQ فقط ولا نبيعها أو نستخدمها للإعلانات. تُنقل البيانات باتصال مشفر ويعالجها Google Firebase كمقدم خدمة.")}</Label>
          </View>
          <View style={s.card}>
            <Label style={s.heading}>{t("الاحتفاظ والحذف")}</Label>
            <Label>{t("نحتفظ ببياناتك حتى تحذفها أو تحذف حسابك. يمكنك حذف الحساب وكل بياناته من صفحة حسابي، أو التواصل عبر بيانات المطور في صفحة Google Play.")}</Label>
          </View>
          <Label style={s.small}>{t("آخر تحديث: 10 أكتوبر 2026")}</Label>
        </ScrollView></SafeAreaView>
      </Modal>
      <Modal visible={deleteAccountOpen} animationType="slide" onRequestClose={() => setDeleteAccountOpen(false)}>
        <SafeAreaView style={s.screen}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={s.content}>
              <View style={s.row}>
                <Pressable onPress={() => setDeleteAccountOpen(false)}><Label style={s.link}>{t("إغلاق")}</Label></Pressable>
                <Label style={s.heading}>{t("حذف الحساب والبيانات")}</Label>
              </View>
              <View style={[s.card, { borderColor: "#7B3641" }]}>
                <Label style={[s.heading, { color: "#FF93A0" }]}>{t("هذا الإجراء نهائي")}</Label>
                <Label>{t("سيتم حذف بيانات تسجيل الدخول وكل المهمات والجلسات والشيتات والمواعيد من Firebase، بالإضافة إلى بيانات SYNQ المحلية.")}</Label>
              </View>
              <Label>{t("كلمة المرور الحالية")}</Label>
              <Field value={deletePassword} onChangeText={setDeletePassword} secureTextEntry autoComplete="current-password" />
              <Pressable disabled={busy} style={[s.button, { backgroundColor: "#FF8091" }, busy && { opacity: .45 }]} onPress={requestAccountDeletion}>
                <Label style={{ color: C.bg, fontWeight: "900" }}>{busy ? t("لحظة…") : t("حذف نهائي")}</Label>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      {/* ── Editors ── */}
      <Modal visible={manualLogTask !== null} animationType="slide" onRequestClose={() => setManualLogTask(null)}>
        <SafeAreaView style={s.screen}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={s.content}>
              <View style={s.row}>
                <Pressable onPress={() => setManualLogTask(null)}><Label style={s.link}>{t("إغلاق")}</Label></Pressable>
                <Label style={s.heading}>{t("تسجيل وقت يدوي")}</Label>
              </View>
              <Label style={s.heading}>{manualLogTask?.emoji} {manualLogTask?.name}</Label>
              <Label>{t("التاريخ")}</Label>
              <Field value={manualDate} onChangeText={setManualDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" />
              <Label>{t("الدقائق التي عملتها")}</Label>
              <Field value={manualMinutes} onChangeText={setManualMinutes} keyboardType="number-pad" maxLength={4} />
              <Button disabled={busy} title={busy ? t("جاري الحفظ…") : t("حفظ الوقت")} onPress={saveManualLog} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={globalTaskEditor !== undefined}
        animationType="slide"
        onRequestClose={() => setGlobalTaskEditor(undefined)}
      >
        <SafeAreaView style={s.screen}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView contentContainerStyle={s.content}>
              <View style={s.row}>
                <Pressable onPress={() => setGlobalTaskEditor(undefined)}>
                  <Label style={s.link}>{t("إغلاق")}</Label>
                </Pressable>
                <Label style={s.heading}>
                  {globalTaskEditor ? t("تعديل المهمة") : t("مهمة جديدة ✅")}
                </Label>
              </View>
              <Label style={s.subtitle}> {t("اختار نوع المهمة")} </Label>
              <Label>{t("اسم المهمة")}</Label>
              <Field
                value={gtName}
                onChangeText={setGtName}
                maxLength={60}
                placeholder={t("مثلًا: قراءة ١٠ صفحات")}
              />
              <Label>{t("مدة المهمة بالدقائق")}</Label>
              <Field value={gtMinutes} onChangeText={setGtMinutes} keyboardType="number-pad" maxLength={3} />
              {/* Type toggle */}
              <Label style={s.heading}>{t("اختار نوع المهمة")}</Label>
              <View style={s.wrap}>
                <Pressable
                  style={[
                    s.chip,
                    !gtIsEssential && { backgroundColor: C.mint },
                  ]}
                  onPress={() => setGtIsEssential(false)}
                >
                  <Label style={{ color: !gtIsEssential ? C.bg : C.text }}>
                    {t("مهمة مرنة (أيام معينة)")}
                  </Label>
                </Pressable>
                <Pressable
                  style={[s.chip, gtIsEssential && { backgroundColor: C.mint }]}
                  onPress={() => setGtIsEssential(true)}
                >
                  <Label style={{ color: gtIsEssential ? C.bg : C.text }}>
                    {t("مهمة أساسية (كل يوم)")}
                  </Label>
                </Pressable>
              </View>
              {/* Day picker for flexible tasks */}
              {!gtIsEssential && (
                <>
                  <Label>{t("أيام التكرار")}</Label>
                  <View style={s.wrap}>
                    {(
                      [
                        ["كل يوم", [0, 1, 2, 3, 4, 5, 6]],
                        [
                          "أيام العمل",
                          language === "ar" ? [0, 1, 2, 3, 4] : [1, 2, 3, 4, 5],
                        ],
                        ["نهاية الأسبوع", language === "ar" ? [5, 6] : [0, 6]],
                      ] as const
                    ).map(([title, values]) => (
                      <Pressable
                        key={title}
                        accessibilityRole="button"
                        style={s.chip}
                        onPress={() => setGtDays([...values])}
                      >
                        <Label>{t(title)}</Label>
                      </Pressable>
                    ))}
                  </View>
                  <View style={s.wrap}>
                    {days.map((d, i) => (
                      <Pressable
                        key={d}
                        style={[
                          s.chip,
                          gtDays.includes(i) && { backgroundColor: C.mint },
                        ]}
                        onPress={() =>
                          setGtDays(
                            gtDays.includes(i)
                              ? gtDays.filter((n) => n !== i)
                              : [...gtDays, i],
                          )
                        }
                      >
                        <Label
                          style={{
                            color: gtDays.includes(i) ? C.bg : C.text,
                            fontSize: 12,
                          }}
                        >
                          {d}
                        </Label>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              <Label>{t("رمز المهمة")}</Label>
              <View style={s.wrap}>
                {["✅", "⭐", "🎯", "💡", "🔑", "📌", "🚀", "🛡️"].map((e) => (
                  <Pressable
                    key={e}
                    style={[
                      s.chip,
                      gtEmoji === e && { borderColor: C.mint, borderWidth: 1 },
                    ]}
                    onPress={() => setGtEmoji(e)}
                  >
                    <Label style={{ fontSize: 24 }}>{e}</Label>
                  </Pressable>
                ))}
              </View>
              <Label>{t("لونك المفضّل")}</Label>
              <View style={s.wrap}>
                {colors.map((c) => (
                  <Pressable
                    accessibilityLabel={t("لون") + c}
                    key={c}
                    onPress={() => setGtColor(c)}
                    style={[
                      s.color,
                      {
                        backgroundColor: c,
                        borderWidth: gtColor === c ? 3 : 0,
                        borderColor: "white",
                      },
                    ]}
                  />
                ))}
              </View>
              {!!globalTaskEditor && !globalTaskEditor.isEssential && (
                <Pressable disabled={busy} onPress={() => removeGlobalTask(globalTaskEditor)}>
                  <Label style={[s.small, { color: "#ff6b6b" }]}>{t("حذف")}</Label>
                </Pressable>
              )}
              <Button
                title={busy ? t("جاري الحفظ…") : t("احفظ الخطوة ←")}
                disabled={busy}
                onPress={saveGt}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
function AppContent() {
  const { language } = useLanguage();
  const s = makeStyles(language === "ar");
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      }),
    [],
  );
  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style="light" />
      {loading ? (
        <ActivityIndicator color={C.mint} style={{ flex: 1 }} />
      ) : user ? (
        <Home key={user.uid} user={user} />
      ) : (
        <Login />
      )}
    </SafeAreaView>
  );
}
const createStyles = (rtl: boolean) =>
  StyleSheet.create({
    screen: { direction: "ltr", flex: 1, backgroundColor: C.bg },
    text: {
      color: C.text,
      textAlign: rtl ? "right" : "left",
      writingDirection: rtl ? "rtl" : "ltr",
      fontSize: 15,
      lineHeight: 24,
    },
    content: {
      padding: 22,
      gap: 18,
      paddingBottom: 35,
      width: "100%",
      maxWidth: 650,
      alignSelf: "center",
    },
    login: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 26,
      maxWidth: 540,
      width: "100%",
      alignSelf: "center",
    },
    brand: { fontSize: 27, fontWeight: "900", lineHeight: 38 },
    logo: {
      width: 86,
      height: 86,
      borderRadius: 28,
      backgroundColor: "#31513E",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    heroTitle: { fontSize: 29, fontWeight: "800", lineHeight: 43 },
    subtitle: { color: C.muted, fontSize: 14, lineHeight: 24 },
    heading: { fontSize: 18, fontWeight: "700", lineHeight: 28 },
    small: { color: C.muted, fontSize: 12, lineHeight: 21 },
    card: {
      backgroundColor: C.card,
      padding: 20,
      borderRadius: 24,
      gap: 12,
      borderWidth: 1,
      borderColor: C.line,
    },
    row: {
      flexDirection: rtl ? "row" : "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    avatar: {
      backgroundColor: "#263D32",
      width: 46,
      height: 46,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    hero: { padding: 24, borderRadius: 28, gap: 14 },
    orbit: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 1,
      borderColor: "#609777",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#365B45",
    },
    track: {
      height: 7,
      backgroundColor: "#365244",
      borderRadius: 8,
      overflow: "hidden",
    },
    fill: { height: 7, backgroundColor: C.mint, borderRadius: 8 },
    button: {
      flexShrink: 1,
      padding: 15,
      borderRadius: 16,
      backgroundColor: C.mint,
      alignItems: "center",
      marginTop: 8,
    },
    input: {
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 15,
      padding: 16,
      color: C.text,
      textAlign: rtl ? "right" : "left",
      writingDirection: rtl ? "rtl" : "ltr",
      fontSize: 16,
      marginVertical: 5,
    },
    emoji: {
      width: 54,
      height: 54,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    pill: {
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: "#243E32",
    },
    link: { color: C.mint, fontSize: 13 },
    statRow: { flexDirection: rtl ? "row" : "row-reverse", gap: 8 },
    chart: {
      flexDirection: rtl ? "row-reverse" : "row",
      gap: 9,
      height: 185,
      alignItems: "flex-end",
      marginTop: 20,
    },
    barColumn: { flex: 1, alignItems: "center", gap: 6 },
    barTrack: {
      height: 120,
      width: "75%",
      backgroundColor: C.line,
      borderRadius: 8,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    bar: { width: "100%", borderRadius: 8 },
    heatmap: {
      flexDirection: rtl ? "row-reverse" : "row",
      flexWrap: "wrap",
      gap: 7,
      marginVertical: 15,
    },
    cell: { width: 25, height: 25, borderRadius: 7 },
    nav: {
      flexDirection: rtl ? "row" : "row-reverse",
      borderTopWidth: 1,
      borderColor: C.line,
      paddingVertical: 12,
      backgroundColor: C.bg,
    },
    navItem: { flex: 1, alignItems: "center", gap: 4 },
    timer: {
      backgroundColor: "#24382E",
      padding: 15,
      borderTopWidth: 1,
      borderColor: "#528D70",
    },
    wrap: {
      flexDirection: rtl ? "row-reverse" : "row",
      flexWrap: "wrap",
      gap: 9,
      marginVertical: 12,
    },
    chip: { backgroundColor: C.card, padding: 12, borderRadius: 12 },
    color: { width: 43, height: 43, borderRadius: 16 },
  });

const localizedStyles = { ar: createStyles(true), en: createStyles(false) };
const makeStyles = (rtl: boolean) => localizedStyles[rtl ? "ar" : "en"];
