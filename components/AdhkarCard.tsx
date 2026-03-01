import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import { AdhkarItem } from "../db/adhkarTypes";
import { ADHKAR_PRIORITY_COLORS } from "../constants/adhkarColors";
import { FONT_FAMILY, resolveArabicTextFont } from "../constants/fonts";
import { formatAyahMarker } from "../utils/ayahMarker";

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
}: Props) {
  const colors = ADHKAR_PRIORITY_COLORS[item.priority];
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

      {onOpenQuran && (
        <View style={styles.quranActionRow}>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onOpenQuran();
            }}
            style={styles.quranActionButton}
          >
            <Text style={styles.quranActionText}>فتح عرض الآيات</Text>
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
    borderColor: "rgba(253,230,138,0.44)",
    backgroundColor: "rgba(253,230,138,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quranActionText: {
    color: "#FDE68A",
    fontSize: 13,
    fontFamily: FONT_FAMILY.cairoSemiBold,
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
