import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useRef(0);

  const hide = useCallback(() => {
    const hidingId = id.current;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    translateY.stopAnimation();
    opacity.stopAnimation();
    Animated.parallel([
      Animated.timing(translateY, { toValue: -12, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished && id.current === hidingId) setToast(null); });
  }, [opacity, translateY]);

  const showToast = useCallback((input: ToastInput) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const duration = input.duration ?? (input.message ? 4200 : 3000);
    const item: ToastItem = { id: ++id.current, type: input.type ?? "info", title: input.title, message: input.message, duration };
    setToast(item);
    translateY.stopAnimation();
    opacity.stopAnimation();
    translateY.setValue(-24);
    opacity.setValue(0);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 240, mass: .65, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    });
    hideTimer.current = setTimeout(hide, duration);
  }, [hide, opacity, translateY]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  const look = toast ? palette[toast.type] : palette.info;

  return <ToastContext.Provider value={{ showToast }}>
    {children}
    {toast && <View pointerEvents="box-none" style={[styles.overlay, { paddingTop: Math.max(insets.top + 8, 16) }]}>
      <Animated.View accessibilityLiveRegion="polite" accessibilityRole="alert"
        style={[styles.card, { opacity, transform: [{ translateY }], borderLeftColor: look.accent }]}>
        <View style={[styles.icon, { backgroundColor: look.accent + "20" }]}>
          <Ionicons name={look.icon} size={21} color={look.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{toast.title}</Text>
          {!!toast.message && <Text style={styles.message} numberOfLines={3}>{toast.message}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={hide} style={styles.close}>
          <Ionicons name="close" size={17} color="#93A1B3" />
        </Pressable>
      </Animated.View>
    </View>}
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999, alignItems: "center", paddingHorizontal: 14 },
  card: { width: "100%", maxWidth: 520, minHeight: 58, paddingVertical: 11, paddingHorizontal: 12,
    flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderLeftWidth: 3,
    backgroundColor: "#1A2430", borderWidth: 1, borderColor: "#2A3747", elevation: 10,
    shadowColor: "#000", shadowOpacity: .28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 3 },
  title: { color: "#F4F7FB", fontSize: 14, fontWeight: "800", textAlign: "auto", writingDirection: "auto" },
  message: { color: "#AAB6C6", fontSize: 12, lineHeight: 17, textAlign: "auto", writingDirection: "auto" },
  close: { padding: 5 },
});
