import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { registerUser } from "../services/api";
import { saveToken } from "../utils/tokenStorage";

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "worker" });
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      return Alert.alert("Error", "Name, email and password are required");
    }
    setLoading(true);
    try {
      const data = await registerUser(form);
      await saveToken(data.token);
      const dest = data.role === "admin" ? "AdminDashboard" : "WorkerDashboard";
      navigation.replace(dest, { user: data });
    } catch (err) {
      Alert.alert("Registration Failed", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register to get started</Text>

        <TextInput
          style={styles.input} placeholder="Full Name" placeholderTextColor="#999"
          value={form.name} onChangeText={(v) => set("name", v)}
        />
        <TextInput
          style={styles.input} placeholder="Email" placeholderTextColor="#999"
          autoCapitalize="none" keyboardType="email-address"
          value={form.email} onChangeText={(v) => set("email", v)}
        />
        <TextInput
          style={styles.input} placeholder="Password" placeholderTextColor="#999"
          secureTextEntry value={form.password} onChangeText={(v) => set("password", v)}
        />
        <TextInput
          style={styles.input} placeholder="Phone (optional)" placeholderTextColor="#999"
          keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set("phone", v)}
        />

        {/* Role Selector */}
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {["worker", "admin"].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
              onPress={() => set("role", r)}
            >
              <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40, backgroundColor: "#f5f7fa" },
  title: { fontSize: 30, fontWeight: "700", color: "#1a1a2e", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, marginBottom: 14,
    borderWidth: 1, borderColor: "#e0e0e0", color: "#1a1a2e",
  },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  roleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#e0e0e0",
    alignItems: "center", backgroundColor: "#fff",
  },
  roleBtnActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  roleBtnText: { fontSize: 14, fontWeight: "600", color: "#666" },
  roleBtnTextActive: { color: "#fff" },
  button: {
    backgroundColor: "#4f46e5", borderRadius: 10,
    paddingVertical: 15, alignItems: "center", marginTop: 4,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 20, alignItems: "center" },
  linkText: { fontSize: 14, color: "#666" },
  linkBold: { color: "#4f46e5", fontWeight: "700" },
});
