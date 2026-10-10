import { getAuth } from "@react-native-firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from "@react-native-firebase/firestore";
import { getAnalytics, logEvent } from "@react-native-firebase/analytics";
import { Appointment, GlobalTask, GlobalTaskEntry, WorkSession, WorkSheet } from "./model";
export const auth = getAuth();
export const db = getFirestore();
export const analytics = getAnalytics();
export async function track(event: string) {
  try {
    await logEvent(analytics, event);
  } catch {
    /* Metrics never block a user action. */
  }
}

// ── Global Tasks ──────────────────────────────────────────────────────────────
export const globalTasksRef = (uid: string) =>
  collection(db, "users", uid, "globalTasks");
export const globalEntriesRef = (uid: string) =>
  collection(db, "users", uid, "globalEntries");
export const sheetsRef = (uid: string) => collection(db, "users", uid, "sheets");
export const appointmentsRef = (uid: string) => collection(db, "users", uid, "appointments");
export const workSessionsRef = (uid: string) => collection(db, "users", uid, "workSessions");
export const saveGlobalTask = (uid: string, task: GlobalTask) =>
  setDoc(doc(db, "users", uid, "globalTasks", task.id), task);
export async function completeGlobalTask(
  uid: string,
  task: GlobalTask,
  date: string,
  actualSeconds?: number,
) {
  const id = task.id + "_" + date;
  const entry: GlobalTaskEntry = {
    id, globalTaskId: task.id, date, minutes: task.minutes ?? 20,
    ...(actualSeconds && actualSeconds > 0 ? { actualSeconds: Math.round(actualSeconds) } : {}),
  };
  await setDoc(doc(db, "users", uid, "globalEntries", id), entry);
}
export const undoGlobalTask = (uid: string, id: string) =>
  deleteDoc(doc(db, "users", uid, "globalEntries", id));

export async function deleteGlobalTask(uid: string, task: GlobalTask) {
  if (task.isEssential) throw new Error("Essential tasks cannot be deleted");
  await deleteDoc(doc(db, "users", uid, "globalTasks", task.id));
}

export const saveSheet = (uid: string, sheet: WorkSheet) =>
  setDoc(doc(db, "users", uid, "sheets", sheet.id), sheet);
export const deleteSheet = (uid: string, id: string) =>
  deleteDoc(doc(db, "users", uid, "sheets", id));
export const saveAppointment = (uid: string, appointment: Appointment) =>
  setDoc(doc(db, "users", uid, "appointments", appointment.id), appointment);
export const deleteAppointment = (uid: string, id: string) =>
  deleteDoc(doc(db, "users", uid, "appointments", id));
export const saveWorkSession = (uid: string, session: WorkSession) =>
  setDoc(doc(db, "users", uid, "workSessions", session.id), session);
export const deleteWorkSession = (uid: string, id: string) =>
  deleteDoc(doc(db, "users", uid, "workSessions", id));

/** Delete every known user document before removing the Firebase Auth account. */
export async function deleteAccountData(uid: string) {
  const collectionNames = [
    "globalTasks", "globalEntries", "workSessions", "sheets", "appointments",
    // Old versions used these collections. Include them so account deletion is complete.
    "habits", "entries",
  ];
  let batch = writeBatch(db);
  let writes = 0;
  for (const name of collectionNames) {
    const snapshot = await getDocs(collection(db, "users", uid, name));
    for (const item of snapshot.docs) {
      batch.delete(item.ref);
      writes += 1;
      if (writes === 450) {
        await batch.commit();
        batch = writeBatch(db);
        writes = 0;
      }
    }
  }
  batch.delete(doc(db, "users", uid));
  await batch.commit();
}
