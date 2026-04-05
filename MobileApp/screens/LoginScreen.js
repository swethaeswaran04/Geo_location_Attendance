import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { loginUser } from "../services/api";
import { saveToken } from "../utils/tokenStorage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Email and password are required");
    setLoading(true);
    try {
      const data = await loginUser({ email: email.trim(), password });
      await saveToken(data.token);
      const dest = data.role === "admin" ? "AdminDashboard" : "WorkerDashboard";
      navigation.replace(dest, { user: data });
    } catch (err) {
      Alert.alert("Login Failed", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Geo Attendance</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate("Register")}>
        <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 28, backgroundColor: "#f5f7fa" },
  title: { fontSize: 30, fontWeight: "700", color: "#1a1a2e", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 36 },
  input: {
    backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, marginBottom: 14,
    borderWidth: 1, borderColor: "#e0e0e0", color: "#1a1a2e",
  },
  button: {
    backgroundColor: "#4f46e5", borderRadius: 10, paddingVertical: 15,
    alignItems: "center", marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 20, alignItems: "center" },
  linkText: { fontSize: 14, color: "#666" },
  linkBold: { color: "#4f46e5", fontWeight: "700" },
});
