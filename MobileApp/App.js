import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import LoginScreen       from "./screens/LoginScreen";
import RegisterScreen    from "./screens/RegisterScreen";
import AdminDashboard    from "./screens/AdminDashboard";
import AssignmentScreen  from "./screens/AssignmentScreen";
import AdminInsights     from "./screens/AdminInsights";
import WorkerDashboard   from "./screens/WorkerDashboard";
import WorkerInsights    from "./screens/WorkerInsights";

import { getToken, decodeToken } from "./utils/tokenStorage";

const Stack = createNativeStackNavigator();

const screenOptions = { headerShown: false };

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null); // null = loading

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return setInitialRoute("Login");
      const decoded = decodeToken(token);
      if (!decoded) return setInitialRoute("Login");
      setInitialRoute(decoded.role === "admin" ? "AdminDashboard" : "WorkerDashboard");
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f7fa" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={screenOptions}>

        {/* ── Auth screens ── */}
        <Stack.Screen name="Login"    component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* ── Admin screens ── */}
        <Stack.Screen name="AdminDashboard"   component={AdminDashboard} />
        <Stack.Screen name="AssignmentScreen" component={AssignmentScreen} />
        <Stack.Screen name="AdminInsights"    component={AdminInsights} />

        {/* ── Worker screens ── */}
        <Stack.Screen name="WorkerDashboard"   component={WorkerDashboard} />
        <Stack.Screen name="WorkerInsights"    component={WorkerInsights} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
