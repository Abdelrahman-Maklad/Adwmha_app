import React, { useEffect, useRef } from "react";
import {
  Animated,
  ActivityIndicator,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

export default function StartScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <ImageBackground
      source={require("./assets/islamic ornament background.png")}
      style={styles.screen}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Animated.View style={{ opacity }}>
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
        <ActivityIndicator size="small" color={isDark ? "#FFFFFF" : "#0A0E1A"} />
        <Text style={[styles.loadingText, { color: isDark ? "#E5E7EB" : "#1F2937" }]}>
          جاري التحميل...
        </Text>
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
  loadingText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
