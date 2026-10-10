import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastType = "success" | "error" | "warning" | "info";
export type ToastInput = { type?: ToastType; title: string; message?: string; duration?: number };
type ToastItem = Required<Pick<ToastInput, "type" | "title" | "duration">> & Pick<ToastInput, "message"> & { id: number };

const ToastContext = createContext<{ showToast: (input: ToastInput) => void }>({ showToast: () => {} });
const palette = {
  success: { accent: "#85F2B0", icon: "checkmark-circle" as const },
  error: { accent: "#FF8091", icon: "close-circle" as const },
  warning: { accent: "#FFD37D", icon: "warning" as const },
  info: { accent: "#9BCBFF", icon: "information-circle" as const },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(.94)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useRef(0);

  const hide = useCallback(() => {
    const hidingId = id.current;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -90, duration: 230, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 190, useNativeDriver: true }),
      Animated.timing(scale, { toValue: .97, duration: 190, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished && id.current === hidingId) setToast(null); });
  }, [opacity, scale, translateY]);

  const showToast = useCallback((input: ToastInput) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const duration = input.duration ?? (input.message ? 4200 : 3000);
    const item: ToastItem = { id: ++id.current, type: input.type ?? "info", title: input.title, message: input.message, duration };
    setToast(item);
    translateY.setValue(-120); opacity.setValue(0); scale.setValue(.94); progress.setValue(1);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 17, stiffness: 180, mass: .7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 190, useNativeDriver: true }),
      ]).start();
      Animated.timing(progress, { toValue: 0, duration, easing: Easing.linear, useNativeDriver: false }).start();
    });
    hideTimer.current = setTimeout(hide, duration);
  }, [hide, opacity, progress, scale, translateY]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  const look = toast ? palette[toast.type] : palette.info;

  return <ToastContext.Provider value={{ showToast }}>
    {children}
    <Modal visible={toast !== null} transparent statusBarTranslucent animationType="none" onRequestClose={hide}>
      <View pointerEvents="box-none" style={styles.overlay}>
        {toast && <Animated.View accessibilityLiveRegion="polite" accessibilityRole="alert"
          style={[styles.shell, { marginTop: Math.max(insets.top, 12), opacity, transform: [{ translateY }, { scale }], borderColor: look.accent + "55" }]}> 
          <LinearGradient colors={["#1D2735", "#111923"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: look.accent + "18" }]}>
              <Ionicons name={look.icon} size={26} color={look.accent} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{toast.title}</Text>
              {!!toast.message && <Text style={styles.message}>{toast.message}</Text>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={hide} style={styles.close}>
              <Ionicons name="close" size={18} color="#8FA0B5" />
            </Pressable>
            <View style={styles.track}>
              <Animated.View style={[styles.progress, { backgroundColor: look.accent, width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
            </View>
          </LinearGradient>
        </Animated.View>}
      </View>
    </Modal>
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center" },
  shell: { width: "92%", maxWidth: 520, borderRadius: 22, borderWidth: 1, overflow: "hidden", elevation: 18,
    shadowColor: "#000", shadowOpacity: .42, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
  card: { minHeight: 78, padding: 14, paddingBottom: 17, flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 3 },
  title: { color: "#F7FAFD", fontSize: 16, fontWeight: "900", textAlign: "auto", writingDirection: "auto" },
  message: { color: "#AAB6C6", fontSize: 13, lineHeight: 19, textAlign: "auto", writingDirection: "auto" },
  close: { alignSelf: "flex-start", padding: 4 },
  track: { position: "absolute", bottom: 0, left: 0, right: 0, height: Platform.OS === "android" ? 3 : 2, backgroundColor: "#293544" },
  progress: { height: "100%" },
});
