import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TimelineScreen from "../TimelineScreen";
import AdhkarDetailsScreen from "../screens/AdhkarDetailsScreen";
import QuranReferenceScreen from "../screens/QuranReferenceScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Timeline"
        screenOptions={{
          headerTitleAlign: "center",
          headerBackTitle: "رجوع",
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
          options={{ title: "المهام اليومية" }}
        />
        <Stack.Screen
          name="AdhkarDetails"
          component={AdhkarDetailsScreen}
          options={{ title: "تفاصيل الأذكار" }}
        />
        <Stack.Screen
          name="QuranReference"
          component={QuranReferenceScreen}
          options={{ title: "عرض الآيات" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
