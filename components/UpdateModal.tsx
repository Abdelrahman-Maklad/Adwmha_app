import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { FONT_FAMILY } from "../constants/fonts";
import { ThemeTokens } from "../constants/theme";
import { UpdateCheckResult } from "../services/updateService";

type Props = {
  visible: boolean;
  theme: ThemeTokens;
  updateInfo: UpdateCheckResult | null;
  onUpdatePress: () => void;
  onLaterPress: () => void;
};

export default function UpdateModal({
  visible,
  theme,
  updateInfo,
  onUpdatePress,
  onLaterPress,
}: Props) {
  if (!updateInfo) return null;

  const isMandatory = updateInfo.isMandatory;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isMandatory ? () => {} : onLaterPress}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.modalBackdrop }]}>
        <View style={[styles.card, { backgroundColor: theme.modalCardBg, borderColor: theme.modalCardBorder }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Update Available</Text>

          <Text style={[styles.versionLine, { color: theme.textSecondary }]}>
            Current: {updateInfo.currentVersion}
          </Text>
          <Text style={[styles.versionLine, { color: theme.textSecondary }]}>
            Latest: {updateInfo.latestVersion ?? "-"}
          </Text>

          {updateInfo.releaseNotes.length > 0 ? (
            <View style={styles.notesWrap}>
              <Text style={[styles.notesTitle, { color: theme.textPrimary }]}>What is new</Text>
              {updateInfo.releaseNotes.map((note, index) => (
                <Text key={`${note}-${index}`} style={[styles.noteItem, { color: theme.textSecondary }]}>
                  - {note}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            {!isMandatory ? (
              <Pressable
                style={[styles.buttonSecondary, { borderColor: theme.inputBorder }]}
                onPress={onLaterPress}
              >
                <Text style={[styles.buttonSecondaryText, { color: theme.textPrimary }]}>Later</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.buttonPrimary} onPress={onUpdatePress}>
              <Text style={styles.buttonPrimaryText}>Update</Text>
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
    fontSize: 20,
    fontFamily: FONT_FAMILY.cairoBold,
  },
  versionLine: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  notesWrap: {
    marginTop: 6,
    gap: 4,
  },
  notesTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
  noteItem: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.cairoRegular,
    lineHeight: 19,
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
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
