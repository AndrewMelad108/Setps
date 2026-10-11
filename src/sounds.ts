import { createAudioPlayer } from "expo-audio";
const appointmentSources = {
  alarm: require("../assets/sounds/alarm.wav"),
  siren: require("../assets/sounds/siren.wav"),
  urgent: require("../assets/sounds/urgent.wav"),
} as const;
let appointmentPreview: ReturnType<typeof createAudioPlayer> | null = null;

export function playAppointmentSound(sound: keyof typeof appointmentSources) {
  appointmentPreview?.release();
  const player = createAudioPlayer(appointmentSources[sound]);
  appointmentPreview = player;
  player.play();
  setTimeout(() => {
    if (appointmentPreview === player) {
      appointmentPreview = null;
      player.release();
    }
  }, 8000);
}
