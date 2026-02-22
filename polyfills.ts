// polyfills.ts
import "react-native-get-random-values";

// Safety: ensure crypto exists (some libs crash if it's missing)
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = {};
}