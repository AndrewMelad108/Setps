import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Language, translate } from "./locale";
import { timerNotificationState } from "./timerState";

const statusId = "synq-focus-status";
const completionId = "synq-focus-complete";
const statusChannel = "focus-timer-v2";
let pending: Promise<void> = Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestTimerPermission() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(statusChannel, {
      name: "SYNQ focus timer",
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: null,
      sound: null,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function cancelTimerNotifications() {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(statusId).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(completionId).catch(() => {}),
    Notifications.dismissNotificationAsync(statusId).catch(() => {}),
    Notifications.dismissNotificationAsync(completionId).catch(() => {}),
  ]);
}

export function syncTimerNotification(
  timer: { end: number | null; remaining: number } | null,
  name: string,
  language: Language,
  finishSound: "success" | "bell" | "spark" | "silent" | "custom" = "success",
): Promise<void> {
  const update = async () => {
    const state = timerNotificationState(timer, Date.now());
    await cancelTimerNotifications();
    if (!state || !(await Notifications.getPermissionsAsync()).granted) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(statusChannel, {
        name: translate(language, "إشعارات المؤقّت"),
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: null,
        sound: null,
      });
    }
    await Notifications.scheduleNotificationAsync({
      identifier: statusId,
      content: {
        title: name,
        body: state.running
          ? `${translate(language, "الوقت المتبقي")} · ${state.label}`
          : `${translate(language, "المؤقّت متوقف مؤقتًا")} · ${state.label}`,
        sound: false,
        sticky: true,
        autoDismiss: false,
      },
      trigger: Platform.OS === "android" ? { channelId: statusChannel } : null,
    });

    if (state.running && state.end) {
      const bundledSound = finishSound === "silent" ? null
        : finishSound === "custom" ? "default" : `${finishSound}.mp3`;
      const finishChannel = `focus-finished-${finishSound}-v2`;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(finishChannel, {
          name: translate(language, "نغمة انتهاء المهمة"),
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: finishSound === "silent" ? null : [0, 250, 180, 250],
          sound: bundledSound,
        });
      }
      await Notifications.scheduleNotificationAsync({
        identifier: completionId,
        content: {
          title: name,
          body: translate(language, "الجلسة خلصت ✨ سجّل الإنجاز"),
          sound: bundledSound ?? false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(state.end),
          ...(Platform.OS === "android" ? { channelId: finishChannel } : {}),
        },
      });
    }
  };
  pending = pending.catch(() => {}).then(update);
  return pending;
}
