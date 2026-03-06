import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ThemeTokens } from "../constants/theme";
import { FONT_FAMILY } from "../constants/fonts";

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => Promise<void> | void;
  theme: ThemeTokens;
};

export default function NotificationSetupModal({ visible, onClose, onOpenSettings, theme }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.modalBackdrop }]}>
        <View style={[styles.card, { backgroundColor: theme.modalCardBg, borderColor: theme.modalCardBorder }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>⚠️ خطوة مهمة لضمان الإشعارات</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            لضمان وصول أذان الصلاة والويجت بشكل صحيح، يرجى تفعيل الإعدادات التالية:
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>1- إعدادات الهاتف ← التطبيقات ← Adomha</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>2- تفعيل "التشغيل التلقائي" أو "Autostart"</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>3- استهلاك البطارية ← بدون قيود</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>4- تفعيل "تشغيل في الخلفية"</Text>
          <Text style={[styles.note, { color: theme.textMuted }]}>
            ملاحظة: هذه الخطوات مهمة خصوصاً على أجهزة Samsung و Oppo و Huawei و Xiaomi
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.buttonSecondary, { borderColor: theme.inputBorder }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonSecondaryText, { color: theme.textPrimary }]}>لاحقاً</Text>
            </Pressable>
            <Pressable style={styles.buttonPrimary} onPress={() => void onOpenSettings()}>
              <Text style={styles.buttonPrimaryText}>فتح الإعدادات</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.cairoBold,
    textAlign: "right",
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.cairoRegular,
    textAlign: "right",
  },
  note: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.cairoRegular,
    textAlign: "right",
  },
  actions: {
    marginTop: 8,
    flexDirection: "row-reverse",
    gap: 8,
  },
  buttonPrimary: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
  buttonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
});
