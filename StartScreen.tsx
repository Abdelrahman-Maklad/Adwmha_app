import React, { useEffect, useRef } from "react";
import { Animated, Image, ImageBackground, StyleSheet, useColorScheme, View } from "react-native";

export default function StartScreen() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(10)).current;
  const phraseOpacity = useRef(new Animated.Value(0)).current;
  const phraseTranslateY = useRef(new Animated.Value(10)).current;
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;
  const dotsLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(phraseOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(phraseTranslateY, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    const makeDotPulse = (dot: Animated.Value) =>
      Animated.sequence([
        Animated.timing(dot, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0.3,
          duration: 250,
          useNativeDriver: true,
        }),
      ]);

    dotsLoopRef.current = Animated.loop(
      Animated.sequence([
        makeDotPulse(dot1Opacity),
        makeDotPulse(dot2Opacity),
        makeDotPulse(dot3Opacity),
        Animated.delay(120),
      ])
    );
    dotsLoopRef.current.start();

    return () => {
      dotsLoopRef.current?.stop();
      dot1Opacity.stopAnimation();
      dot2Opacity.stopAnimation();
      dot3Opacity.stopAnimation();
    };
  }, [
    dot1Opacity,
    dot2Opacity,
    dot3Opacity,
    logoOpacity,
    logoTranslateY,
    phraseOpacity,
    phraseTranslateY,
  ]);

  return (
    <ImageBackground
      source={require("./assets/islamic ornament background.png")}
      style={styles.screen}
      imageStyle={{ transform: [{ scale: 1.1 }] }}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }],
          }}
        >
          <Image
            source={
              isDark
                ? require("./assets/logo-white.png")
                : require("./assets/logo-gradient.png")
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.phraseText,
            {
              color: isDark ? "#F3F4F6" : "#0F172A",
              opacity: phraseOpacity,
              transform: [{ translateY: phraseTranslateY }],
            },
          ]}
        >
          أَحَبُّ الأعمالِ إلى اللهِ أدْومُها و إن قَلَّ
        </Animated.Text>

        <View style={styles.dotsRow}>
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: isDark ? "#E5E7EB" : "#1F2937", opacity: dot1Opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: isDark ? "#E5E7EB" : "#1F2937", opacity: dot2Opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: isDark ? "#E5E7EB" : "#1F2937", opacity: dot3Opacity },
            ]}
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,26,0.78)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  logo: {
    width: 180,
    height: 180,
  },
  phraseText: {
    fontSize: 20,
    lineHeight: 32,
    textAlign: "center",
    fontWeight: "700",
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
