import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";

export type SoundId = "success" | "bell" | "spark" | "silent" | "custom";
export type SoundChoice = { id: SoundId; name: string; uri?: string };
export const sounds: SoundChoice[] = [
  { id: "success", name: "نجاح" },
  { id: "bell", name: "جرس هادئ" },
  { id: "spark", name: "لمعة" },
  { id: "silent", name: "بدون صوت" },
];
const sources: Record<"success" | "bell" | "spark", number> = {
  success: require("../assets/sounds/success.mp3"),
  bell: require("../assets/sounds/bell.mp3"),
  spark: require("../assets/sounds/spark.mp3"),
};
const key = (uid: string) => `finish-sound:${uid}`;

export async function loadSound(uid: string): Promise<SoundChoice> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return sounds[0];
  try {
    const value = JSON.parse(raw) as SoundChoice;
    return value.id === "custom" && !value.uri ? sounds[0] : value;
  } catch { return sounds[0]; }
}

export async function saveSound(uid: string, sound: SoundChoice) {
  await AsyncStorage.setItem(key(uid), JSON.stringify(sound));
}

export async function deleteSoundData(uid: string) {
  const sound = await loadSound(uid);
  if (sound.id === "custom" && sound.uri) {
    const file = new File(sound.uri);
    if (file.exists) file.delete();
  }
  await AsyncStorage.removeItem(key(uid));
}

export async function pickCustomSound(uid: string): Promise<SoundChoice | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    copyToCacheDirectory: true,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (asset.size && asset.size > 15 * 1024 * 1024) throw new Error("Sound file is too large");
  const extension = asset.name.includes(".") ? asset.name.slice(asset.name.lastIndexOf(".")) : ".audio";
  const destination = new File(Paths.document, `finish-sound-${uid}${extension}`);
  if (destination.exists) destination.delete();
  new File(asset.uri).copy(destination);
  const choice = { id: "custom" as const, name: asset.name, uri: destination.uri };
  await saveSound(uid, choice);
  return choice;
}

export function playFinishSound(sound: SoundChoice) {
  if (sound.id === "silent") return;
  const source = sound.id === "custom" ? { uri: sound.uri! } : sources[sound.id];
  const player = createAudioPlayer(source);
  player.play();
  setTimeout(() => player.release(), 8000);
}
