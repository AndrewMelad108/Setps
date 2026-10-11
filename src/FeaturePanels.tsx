import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Appointment, Currency, GlobalTask, WorkSession, WorkSheet, appointmentOccursOn, appointmentTimeTo12, appointmentTimeTo24, isDateKey, workByTaskForSheet, workSheetSummary } from "./model";
import { shareSheetExcel, shareSheetPdf } from "./sheetExport";
import { AppointmentSound, appointmentSounds } from "./appointmentNotifications";
import { playAppointmentSound } from "./sounds";
import { Translator } from "./i18n";
import { useToast } from "./Toast";

const C = { bg: "#0B1017", card: "#151D28", line: "#263140", text: "#F2F5FA", muted: "#8B9AAF", mint: "#B5F4CB", danger: "#FF7777" };
type T = Translator;
const money = (value: number, currency: Currency, language: string) =>
  new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", { style: "currency", currency }).format(value);
const duration = (seconds: number, t: T) => {
  const totalMinutes = Math.floor(seconds / 60);
  return `${Math.floor(totalMinutes / 60)} ${t("ساعة")} ${totalMinutes % 60} ${t("دقيقة")}`;
};

function Action({ title, onPress, danger = false }: { title: string; onPress: () => void; danger?: boolean }) {
  return <Pressable style={s.action} onPress={onPress}><Text style={[s.actionText, danger && { color: C.danger }]}>{title}</Text></Pressable>;
}
function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={C.muted} {...props} style={[s.input, props.style]} />;
}

export function SheetsPanel({ sheets, tasks, sessions, language, t, busy, onSave, onDelete }: {
  sheets: WorkSheet[]; tasks: GlobalTask[]; sessions: WorkSession[]; language: string; t: T; busy: boolean;
  onSave: (sheet: WorkSheet) => Promise<boolean>; onDelete: (id: string) => Promise<boolean>;
}) {
  const { showToast } = useToast();
  const [editor, setEditor] = useState<WorkSheet | null | undefined>(undefined);
  const [title, setTitle] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [rate, setRate] = useState("0"), [currency, setCurrency] = useState<Currency>("EGP"), [taskIds, setTaskIds] = useState<string[]>([]);
  const open = (sheet: WorkSheet | null) => {
    const today = new Date().toISOString().slice(0, 10);
    setEditor(sheet); setTitle(sheet?.title ?? ""); setFrom(sheet?.from ?? today); setTo(sheet?.to ?? today);
    setRate(String(sheet?.hourlyRate ?? 0)); setCurrency(sheet?.currency ?? "EGP"); setTaskIds(sheet?.taskIds ?? []);
  };
  const save = async () => {
    const hourlyRate = Number(rate.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)));
    if (!title.trim() || !isDateKey(from) || !isDateKey(to) || from > to || !Number.isFinite(hourlyRate) || hourlyRate < 0)
      return showToast({ type: "warning", title: t("راجع بيانات الشيت"), message: t("اكتب عنوانًا وفترة صحيحة.") });
    if (await onSave({ id: editor?.id ?? `sheet_${Date.now()}`, title: title.trim(), from, to, hourlyRate, currency, taskIds, createdAt: editor?.createdAt ?? Date.now() })) {
      setEditor(undefined);
      showToast({ type: "success", title: t("تم حفظ الشيت") });
    }
  };
  const sorted = [...sheets].sort((a, b) => b.createdAt - a.createdAt);
  return <>
    <Pressable style={s.primary} onPress={() => open(null)}><Text style={s.primaryText}>{t("＋ شيت جديد")}</Text></Pressable>
    {!sorted.length && <View style={s.card}><Text style={s.title}>{t("ابدأ أول شيت عمل")}</Text><Text style={s.muted}>{t("حدد الفترة والمهمات وسعر الساعة، وSYNQ يحسب التقرير لك.")}</Text></View>}
    {sorted.map(sheet => {
      const summary = workSheetSummary(sheet, sessions);
      const taskById = new Map(tasks.map(task => [task.id, task]));
      const taskTotals = workByTaskForSheet(sheet, sessions);
      return <View style={s.card} key={sheet.id}>
        <Text style={s.title}>{sheet.title}</Text>
        <Text style={s.muted}>{sheet.from} ← {sheet.to}</Text>
        <View style={s.metrics}>
          <Text style={s.metric}>{summary.taskCount}\n<Text style={s.metricLabel}>{t("مهمة")}</Text></Text>
          <Text style={s.metric}>{duration(summary.seconds, t)}\n<Text style={s.metricLabel}>{t("الوقت المسجل")}</Text></Text>
          <Text style={s.metric}>{money(summary.total, sheet.currency, language)}\n<Text style={s.metricLabel}>{t("الإجمالي")}</Text></Text>
        </View>
        <View style={s.wrap}>
          <Action title={t("PDF · مشاركة / حفظ")} onPress={() => void shareSheetPdf(sheet, tasks, sessions)
            .then(() => showToast({ type: "success", title: t("تم تجهيز PDF") }))
            .catch(() => showToast({ type: "error", title: t("تعذّر تصدير PDF") }))} />
          <Action title={t("Excel · مشاركة / حفظ")} onPress={() => void shareSheetExcel(sheet, tasks, sessions)
            .then(() => showToast({ type: "success", title: t("تم تجهيز Excel") }))
            .catch(() => showToast({ type: "error", title: t("تعذّر تصدير Excel") }))} />
          <Action title={t("تعديل")} onPress={() => open(sheet)} />
          <Action danger title={t("حذف")} onPress={() => Alert.alert(t("حذف الشيت؟"), t("سيتم حذف الشيت فقط، ولن تُحذف المهمات."), [
            { text: t("رجوع"), style: "cancel" }, { text: t("حذف"), style: "destructive", onPress: () => void onDelete(sheet.id).then(ok => { if (ok) showToast({ type: "success", title: t("تم حذف الشيت") }); }) },
          ])} />
        </View>
        {!!taskTotals.length && <View style={s.taskSummary}>
          {taskTotals.map(item => <View key={item.taskId} style={s.taskSummaryRow}>
            <Text numberOfLines={1} style={[s.text, { flex: 1 }]}>{taskById.get(item.taskId)?.emoji} {taskById.get(item.taskId)?.name ?? t("مهمة")}</Text>
            <Text style={s.muted}>{duration(item.seconds, t)} · {money(item.seconds / 3600 * sheet.hourlyRate, sheet.currency, language)}</Text>
          </View>)}
        </View>}
      </View>;
    })}
    <Modal visible={editor !== undefined} animationType="slide" onRequestClose={() => setEditor(undefined)}>
      <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content}>
        <View style={s.header}><Action title={t("إغلاق")} onPress={() => setEditor(undefined)} /><Text style={s.heading}>{editor ? t("تعديل الشيت") : t("شيت جديد")}</Text></View>
        <Text style={s.label}>{t("عنوان الشيت")}</Text><Input value={title} onChangeText={setTitle} maxLength={80} placeholder={t("مثال: شغل أكتوبر")} />
        <Text style={s.label}>{t("من تاريخ · YYYY-MM-DD")}</Text><Input value={from} onChangeText={setFrom} keyboardType="numbers-and-punctuation" />
        <Text style={s.label}>{t("إلى تاريخ · YYYY-MM-DD")}</Text><Input value={to} onChangeText={setTo} keyboardType="numbers-and-punctuation" />
        <Text style={s.label}>{t("سعر الساعة")}</Text><Input value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
        <Text style={s.label}>{t("العملة")}</Text><View style={s.wrap}>{(["EGP", "USD"] as Currency[]).map(value => <Pressable key={value} style={[s.chip, currency === value && s.selected]} onPress={() => setCurrency(value)}><Text style={[s.text, currency === value && { color: C.bg }]}>{value}</Text></Pressable>)}</View>
        <Text style={s.label}>{t("المهمات داخل الشيت")}</Text>
        {!tasks.filter(task => !task.archivedDate).length && <Text style={s.muted}>{t("تقدر تحفظ الشيت فاضي وتضيف له مهمات بعدين.")}</Text>}
        {tasks.filter(task => !task.archivedDate).map(task => <Pressable key={task.id} style={[s.task, taskIds.includes(task.id) && { borderColor: C.mint }]} onPress={() => setTaskIds(ids => ids.includes(task.id) ? ids.filter(id => id !== task.id) : [...ids, task.id])}>
          <Text style={s.text}>{taskIds.includes(task.id) ? "✓ " : "○ "}{task.emoji} {task.name}</Text>
        </Pressable>)}
        <Pressable disabled={busy} style={[s.primary, busy && { opacity: .5 }]} onPress={() => void save()}><Text style={s.primaryText}>{t("حفظ الشيت")}</Text></Pressable>
      </ScrollView></SafeAreaView>
    </Modal>
  </>;
}

export function CalendarPanel({ appointments, selectedDate, setSelectedDate, t, busy, onSave, onDelete }: {
  appointments: Appointment[]; selectedDate: string; setSelectedDate: (date: string) => void; t: T; busy: boolean;
  onSave: (appointment: Appointment) => Promise<boolean>; onDelete: (id: string) => Promise<boolean>;
}) {
  const { showToast } = useToast();
  const [editor, setEditor] = useState<Appointment | null | undefined>(undefined);
  const [title, setTitle] = useState(""), [date, setDate] = useState(selectedDate), [time, setTime] = useState("09:00"), [notes, setNotes] = useState("");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [recurrence, setRecurrence] = useState<"once" | "daily" | "yearly">("once");
  const [sound, setSound] = useState<AppointmentSound>("alarm");
  const open = (item: Appointment | null) => { const displayTime = appointmentTimeTo12(item?.time ?? "09:00"); setEditor(item); setTitle(item?.title ?? ""); setDate(item?.date ?? selectedDate); setTime(displayTime.time); setPeriod(displayTime.period); setNotes(item?.notes ?? ""); setRecurrence(item?.recurrence ?? "once"); setSound(item?.sound ?? "alarm"); };
  const save = async () => {
    const storedTime = appointmentTimeTo24(time, period);
    if (!title.trim() || !isDateKey(date) || !storedTime) return showToast({ type: "warning", title: t("راجع بيانات الموعد") });
    if (await onSave({ id: editor?.id ?? `appointment_${Date.now()}`, title: title.trim(), date, time: storedTime, recurrence, sound, notes: notes.trim(), createdAt: editor?.createdAt ?? Date.now() })) {
      setSelectedDate(date); setEditor(undefined);
      showToast({ type: "success", title: t("تم حفظ الموعد") });
    }
  };
  const dayItems = useMemo(() => appointments.filter(item => appointmentOccursOn(item, selectedDate)).sort((a, b) => a.time.localeCompare(b.time)), [appointments, selectedDate]);
  const year = selectedDate.slice(0, 4);
  const yearItems = useMemo(() => appointments.filter(item => item.date.startsWith(year)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [appointments, year]);
  const card = (item: Appointment) => <View style={s.card} key={item.id}>
    <Text style={s.title}>{item.title}</Text><Text style={s.muted}>{item.date} · {appointmentTimeTo12(item.time).time} {appointmentTimeTo12(item.time).period} · {t(item.recurrence === "daily" ? "يوميًا" : item.recurrence === "yearly" ? "سنويًا" : "مرة واحدة")} · {t(appointmentSounds.find(value => value.id === (item.sound ?? "alarm"))?.name ?? "إنذار قوي")}</Text>{!!item.notes && <Text style={s.text}>{item.notes}</Text>}
    <View style={s.wrap}><Action title={t("تعديل")} onPress={() => open(item)} /><Action danger title={t("حذف")} onPress={() => Alert.alert(t("حذف الموعد؟"), "", [{ text: t("رجوع"), style: "cancel" }, { text: t("حذف"), style: "destructive", onPress: () => void onDelete(item.id).then(ok => { if (ok) showToast({ type: "success", title: t("تم حذف الموعد") }); }) }])} /></View>
  </View>;
  return <>
    <Pressable style={s.primary} onPress={() => open(null)}><Text style={s.primaryText}>{t("＋ موعد جديد")}</Text></Pressable>
    <View style={s.card}><Text style={s.title}>{t("مواعيد يوم محدد")}</Text><Input value={selectedDate} onChangeText={setSelectedDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" /></View>
    {!dayItems.length ? <Text style={s.muted}>{t("لا توجد مواعيد في هذا اليوم.")}</Text> : dayItems.map(card)}
    <Text style={s.heading}>{t("كل مواعيد سنة")} {year}</Text>
    {!yearItems.length ? <Text style={s.muted}>{t("لا توجد مواعيد في هذه السنة.")}</Text> : yearItems.map(card)}
    <Modal visible={editor !== undefined} animationType="slide" onRequestClose={() => setEditor(undefined)}>
      <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content}>
        <View style={s.header}><Action title={t("إغلاق")} onPress={() => setEditor(undefined)} /><Text style={s.heading}>{editor ? t("تعديل الموعد") : t("موعد جديد")}</Text></View>
        <Text style={s.label}>{t("عنوان الموعد")}</Text><Input value={title} onChangeText={setTitle} maxLength={100} />
        <Text style={s.label}>{t("التاريخ · YYYY-MM-DD")}</Text><Input value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
        <Text style={s.label}>{t("الوقت · HH:MM")}</Text><View style={s.header}><Input value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" style={{ flex: 1 }} /><View style={s.wrap}>{(["AM", "PM"] as const).map(value => <Pressable key={value} style={[s.chip, period === value && s.selected]} onPress={() => setPeriod(value)}><Text style={[s.text, period === value && { color: C.bg }]}>{value}</Text></Pressable>)}</View></View>
        <Text style={s.label}>{t("تكرار الموعد")}</Text><View style={s.wrap}>{(["once", "daily", "yearly"] as const).map(value => <Pressable key={value} style={[s.chip, recurrence === value && s.selected]} onPress={() => setRecurrence(value)}><Text style={[s.text, recurrence === value && { color: C.bg }]}>{t(value === "daily" ? "يوميًا" : value === "yearly" ? "سنويًا" : "مرة واحدة")}</Text></Pressable>)}</View>
        <Text style={s.label}>{t("نغمة الموعد")}</Text><View style={s.wrap}>{appointmentSounds.map(value => <Pressable key={value.id} style={[s.chip, sound === value.id && s.selected]} onPress={() => { setSound(value.id); playAppointmentSound(value.id); }}><Text style={[s.text, sound === value.id && { color: C.bg }]}>{t(value.name)} ▶</Text></Pressable>)}</View>
        <Text style={s.label}>{t("ملاحظات")}</Text><Input value={notes} onChangeText={setNotes} multiline maxLength={500} style={{ minHeight: 100, textAlignVertical: "top" }} />
        <Pressable disabled={busy} style={[s.primary, busy && { opacity: .5 }]} onPress={() => void save()}><Text style={s.primaryText}>{t("حفظ الموعد")}</Text></Pressable>
      </ScrollView></SafeAreaView>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, content: { padding: 20, gap: 14 }, text: { color: C.text, fontSize: 15 }, muted: { color: C.muted, lineHeight: 22 },
  heading: { color: C.text, fontSize: 22, fontWeight: "800", marginTop: 12 }, title: { color: C.text, fontSize: 18, fontWeight: "800" }, label: { color: C.text, fontWeight: "700", marginTop: 6 },
  card: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 20, padding: 17, gap: 9 },
  primary: { backgroundColor: C.mint, borderRadius: 15, padding: 15, alignItems: "center", marginVertical: 4 }, primaryText: { color: C.bg, fontWeight: "900" },
  input: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, color: C.text, fontSize: 16 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, action: { backgroundColor: "#243E32", paddingVertical: 8, paddingHorizontal: 11, borderRadius: 11 }, actionText: { color: C.mint, fontSize: 13 },
  chip: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, padding: 12, borderRadius: 12 }, selected: { backgroundColor: C.mint },
  task: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, padding: 14, borderRadius: 14 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { minWidth: "46%", flexGrow: 1, color: C.mint, fontWeight: "900", fontSize: 17, textAlign: "center", backgroundColor: C.bg, borderRadius: 14, padding: 10 }, metricLabel: { color: C.muted, fontWeight: "400", fontSize: 11 },
  taskSummary: { gap: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 9 },
  taskSummaryRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
});
