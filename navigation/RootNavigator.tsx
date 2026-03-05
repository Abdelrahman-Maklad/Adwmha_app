import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TimelineScreen from "../TimelineScreen";
import AdhkarDetailsScreen from "../screens/AdhkarDetailsScreen";
import QuranReferenceScreen from "../screens/QuranReferenceScreen";
import NotificationDebugScreen from "../screens/NotificationDebugScreen";
import NotificationHealthScreen from "../screens/NotificationHealthScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Timeline"
        screenOptions={{
          headerTitleAlign: "center",
          headerBackTitle: "\u0631\u062C\u0648\u0639",
          headerStyle: {
            backgroundColor: "#0A0E1A",
          },
          headerTintColor: "#E5E7EB",
          headerTitleStyle: {
            color: "#F8FAFC",
            fontWeight: "700",
          },
        }}
      >
        <Stack.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AdhkarDetails"
          component={AdhkarDetailsScreen}
          options={{ title: "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0623\u0630\u0643\u0627\u0631" }}
        />
        <Stack.Screen
          name="NotificationDebug"
          component={NotificationDebugScreen}
          options={{ title: "Notification Debug" }}
        />
        <Stack.Screen
          name="NotificationHealth"
          component={NotificationHealthScreen}
          options={{ title: "Fix Delayed Notifications" }}
        />
        <Stack.Screen
          name="QuranReference"
          component={QuranReferenceScreen}
          options={{ title: "\u0639\u0631\u0636 \u0627\u0644\u0622\u064A\u0627\u062A" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
