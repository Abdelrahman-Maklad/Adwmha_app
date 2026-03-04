import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import { AdhkarItem } from "../db/adhkarTypes";
import { getAdhkarPriorityColors } from "../constants/adhkarColors";
import { FONT_FAMILY, resolveArabicTextFont } from "../constants/fonts";
import { formatAyahMarker } from "../utils/ayahMarker";
import { ResolvedTheme } from "../constants/theme";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient as any);

type Props = {
  item: AdhkarItem;
  currentCount: number;
  onCardPress: () => void;
  isCompleted: boolean;
  isDisabled: boolean;
  isQuranContent?: boolean;
  quranAyahNumber?: number;
  hasHafsFont?: boolean;
  onOpenQuran?: () => void;
  resolvedTheme?: ResolvedTheme;
};

export default function AdhkarCard({
  item,
  currentCount,
  onCardPress,
  isCompleted,
  isDisabled,
  isQuranContent = false,
  quranAyahNumber,
  hasHafsFont = false,
  onOpenQuran,
  resolvedTheme = "dark",
}: Props) {
  const colors = getAdhkarPriorityColors(resolvedTheme, item.priority);
  const [cardWidth, setCardWidth] = useState(0);
  const shimmerX = useRef(new Animated.Value(-240)).current;
  const shimmerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const showShimmer = item.priority === 1 && !isCompleted;

  useEffect(() => {
    if (!showShimmer || cardWidth <= 0) {
      shimmerLoopRef.current?.stop();
      return;
    }

    shimmerX.setValue(-240);
    shimmerLoopRef.current = Animated.loop(
      Animated.timing(shimmerX, {
        toValue: cardWidth + 240,
        duration: 1800,
        useNativeDriver: true,
      })
    );
    shimmerLoopRef.current.start();

    return () => {
      shimmerLoopRef.current?.stop();
    };
  }, [showShimmer, cardWidth, shimmerX]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && width !== cardWidth) {
      setCardWidth(width);
    }
  };

  const countLabel = useMemo(() => `${currentCount}/${item.repeat}`, [currentCount, item.repeat]);
  const markerText = useMemo(() => {
    if (!isQuranContent || typeof quranAyahNumber !== "number") return "";
    return formatAyahMarker(quranAyahNumber);
  }, [isQuranContent, quranAyahNumber]);
  const referenceText = useMemo(
    () => (item.reference ?? item.refrence ?? "").trim(),
    [item.reference, item.refrence]
  );

  return (
    <Pressable
      onPress={() => {
        if (!isDisabled) onCardPress();
      }}
      onLayout={handleLayout}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
          opacity: isCompleted ? 0.62 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {showShimmer && (
        <AnimatedLinearGradient
          colors={colors.shimmerStops ?? ["rgba(255,255,255,0)", "rgba(255,255,255,0.2)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={[
            styles.shimmerBand,
            {
              transform: [{ translateX: shimmerX }, { rotate: "-16deg" }],
            },
          ]}
        />
      )}

      {isCompleted && (
        <View pointerEvents="none" style={[styles.completedOverlay, { backgroundColor: colors.completionOverlay }]} />
      )}

      <Text
        style={[
          styles.textAr,
          {
            color: colors.textColor,
            fontFamily: resolveArabicTextFont(true, hasHafsFont),
          },
        ]}
      >
        {item.text_ar}
        {markerText ? ` ${markerText}` : ""}
      </Text>
      {referenceText ? (
        <Text
          style={[
            styles.referenceText,
            resolvedTheme === "light" ? styles.referenceTextLight : styles.referenceTextDark,
          ]}
        >
          {referenceText}
        </Text>
      ) : null}

      {onOpenQuran && (
        <View style={styles.quranActionRow}>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onOpenQuran();
            }}
            style={[
              styles.quranActionButton,
              resolvedTheme === "light"
                ? styles.quranActionButtonLight
                : styles.quranActionButtonDark,
            ]}
          >
            <Text
              style={[
                styles.quranActionText,
                resolvedTheme === "light" ? styles.quranActionTextLight : styles.quranActionTextDark,
              ]}
            >
              فتح عرض الآيات
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.footerRow}>
        <View style={[styles.badge, { backgroundColor: colors.badgeBackground }]}>
          <Text style={[styles.badgeText, { color: colors.badgeText }]}>x{item.repeat}</Text>
        </View>

        <View style={styles.counterWrap}>
          {isCompleted && (
            <View style={styles.checkBadge}>
              <Check size={13} color="#0A0E1A" strokeWidth={3} />
            </View>
          )}
          <Text style={[styles.countText, { color: colors.counterText }]}>{countLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    overflow: "hidden",
  },
  shimmerBand: {
    position: "absolute",
    top: -20,
    bottom: -20,
    width: 110,
    opacity: 0.9,
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  textAr: {
    fontSize: 25,
    lineHeight: 34,
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  referenceText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  referenceTextDark: {
    color: "rgba(203,213,225,0.62)",
  },
  referenceTextLight: {
    color: "rgba(51,65,85,0.65)",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quranActionRow: {
    flexDirection: "row-reverse",
  },
  quranActionButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quranActionButtonDark: {
    borderColor: "rgba(253,230,138,0.44)",
    backgroundColor: "rgba(253,230,138,0.12)",
  },
  quranActionButtonLight: {
    borderColor: "rgba(146,64,14,0.42)",
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  quranActionText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
  quranActionTextDark: {
    color: "#FDE68A",
  },
  quranActionTextLight: {
    color: "#92400E",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  badgeText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
  counterWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countText: {
    minWidth: 52,
    textAlign: "center",
    fontSize: 18,
    fontFamily: FONT_FAMILY.cairoBold,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#86EFAC",
  },
});
