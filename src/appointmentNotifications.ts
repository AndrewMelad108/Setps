import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Appointment } from "./model";
import { Language, translate } from "./locale";

export type AppointmentSound = NonNullable<Appointment["sound"]>;
export const appointmentSounds = [
  { id: "alarm", name: "إنذار قوي" },
  { id: "siren", name: "صفارة عالية" },
  { id: "urgent", name: "تنبيه عاجل" },
] as const satisfies readonly { id: AppointmentSound; name: "إنذار قوي" | "صفارة عالية" | "تنبيه عاجل" }[];

const prefix = "synq-appointment-";
const channel = (sound: AppointmentSound) => `appointments-${sound}-v1`;
let pending: Promise<void> = Promise.resolve();

async function configureChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all(appointmentSounds.map(sound => Notifications.setNotificationChannelAsync(channel(sound.id), {
    name: sound.name,
    description: "تنبيهات مواعيد SYNQ بصوت مرتفع",
    importance: Notifications.AndroidImportance.MAX,
    sound: `${sound.id}.wav`,
    enableVibrate: true,
    vibrationPattern: [0, 700, 250, 700, 250, 1200],
    enableLights: true,
    lightColor: "#B5F4CB",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
    },
  })));
}

export async function requestAppointmentNotificationPermission() {
  await configureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function dateParts(appointment: Appointment) {
  const [year, month, day] = appointment.date.split("-").map(Number);
  const [hour, minute] = appointment.time.split(":").map(Number);
  return { year, month, day, hour, minute };
}

async function schedule(appointment: Appointment, language: Language) {
  const sound = appointment.sound ?? "alarm";
  const parts = dateParts(appointment);
  const firstDate = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
  const content: Notifications.NotificationContentInput = {
    title: `${translate(language, "موعدك الآن")} · ${appointment.title}`,
    body: appointment.notes || translate(language, "حان وقت الموعد"),
    sound: `${sound}.wav`,
    priority: "max",
    vibrate: [0, 700, 250, 700, 250, 1200],
    color: "#B5F4CB",
    data: { appointmentId: appointment.id },
  };
  const common = { identifier: `${prefix}${appointment.id}`, content };
  if ((appointment.recurrence ?? "once") === "daily" && firstDate.getTime() <= Date.now()) {
    await Notifications.scheduleNotificationAsync({ ...common, trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parts.hour, minute: parts.minute, channelId: channel(sound),
    } });
  } else if (appointment.recurrence === "yearly" && firstDate.getTime() <= Date.now()) {
    await Notifications.scheduleNotificationAsync({ ...common, trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: parts.month - 1, day: parts.day, hour: parts.hour, minute: parts.minute,
      channelId: channel(sound),
    } });
  } else if (firstDate.getTime() > Date.now()) {
    await Notifications.scheduleNotificationAsync({ ...common, trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: firstDate, channelId: channel(sound),
    } });
  }
}

/** Keep device reminders in sync with Firestore without touching timer notifications. */
export function syncAppointmentNotifications(appointments: Appointment[], language: Language) {
  const update = async () => {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await configureChannels();
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(existing.filter(item => item.identifier.startsWith(prefix))
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
    for (const appointment of appointments) await schedule(appointment, language);
  };
  pending = pending.catch(() => {}).then(update);
  return pending;
}
