import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TextInput,
} from "react-native";
import { getWorkers } from "../services/api";
import api from "../services/api";
import { removeToken } from "../utils/tokenStorage";

const STATUS_COLORS = {
  active:   { bg: "#d1fae5", text: "#065f46" },
  inactive: { bg: "#fee2e2", text: "#991b1b" },
};

export default function AdminDashboard({ navigation, route }) {
  const user = route.params?.user;

  const [stats,      setStats]      = useState(null);
  const [workers,    setWorkers]    = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [usersRes, attendanceRes, assignmentsRes] = await Promise.all([
        getWorkers(),
        api.get("/attendance/all"),
        api.get("/assignments"),
      ]);
      const workerList = usersRes.users ?? [];
      setWorkers(workerList);
      setFiltered(workerList);
      setStats({
        totalWorkers:     workerList.length,
        todayAttendance:  Array.isArray(attendanceRes) ? attendanceRes.length : 0,
        totalAssignments: Array.isArray(assignmentsRes) ? assignmentsRes.length : 0,
      });
    } catch {
      setStats({ totalWorkers: 0, todayAttendance: 0, totalAssignments: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? workers.filter((w) =>
        w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q)
      ) : workers
    );
  }, [search, workers]);

  const handleLogout = async () => {
    await removeToken();
    navigation.replace("Login");
  };

  const quickActions = [
    { label: "Assignments", icon: "📋", route: "ManageAssignments", color: "#059669" },
    { label: "Attendance",  icon: "🗓",  route: "ViewAttendance",   color: "#d97706" },
    { label: "Insights",    icon: "📊",  route: "AdminInsights",    color: "#7c3aed" },
    { label: "Locations",   icon: "📍",  route: "ManageLocations",  color: "#0891b2" },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} colors={["#4f46e5"]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name ?? "Admin"} 👋</Text>
          <Text style={styles.roleLabel}>ADMINISTRATOR</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      {loading ? (
        <ActivityIndicator color="#4f46e5" style={{ marginBottom: 24 }} />
      ) : (
        <View style={styles.statsRow}>
          {[
            { num: stats.totalWorkers,     label: "Workers"     },
            { num: stats.todayAttendance,  label: "Attendance"  },
            { num: stats.totalAssignments, label: "Assignments" },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        {quickActions.map((a) => (
          <TouchableOpacity
            key={a.route}
            style={[styles.actionBtn, { borderColor: a.color }]}
            onPress={() => navigation.navigate(a.route, { user })}
          >
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Workers List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Workers ({filtered.length})</Text>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or email..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator color="#4f46e5" style={{ marginTop: 20 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👷</Text>
          <Text style={styles.emptyTitle}>No Workers Found</Text>
          <Text style={styles.emptyText}>
            {search ? "No workers match your search." : "No workers registered yet."}
          </Text>
        </View>
      ) : (
        filtered.map((worker) => {
          const sc = STATUS_COLORS[worker.status] ?? STATUS_COLORS.active;
          return (
            <View key={worker._id} style={styles.workerCard}>
              {/* Worker Info */}
              <View style={styles.workerTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{worker.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerEmail}>{worker.email}</Text>
                  {worker.phone ? <Text style={styles.workerPhone}>📞 {worker.phone}</Text> : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{worker.status}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.workerActions}>
                <TouchableOpacity
                  style={[styles.workerBtn, styles.assignBtn]}
                  onPress={() => navigation.navigate("AssignmentScreen", { worker, user })}
                >
                  <Text style={styles.assignBtnText}>📋 Assign Task</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.workerBtn, styles.insightBtn]}
                  onPress={() => navigation.navigate("AdminInsights", { workerId: worker._id, workerName: worker.name, user })}
                >
                  <Text style={styles.insightBtnText}>📊 Insights</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flexGrow: 1, backgroundColor: "#f5f7fa", padding: 24, paddingTop: 60 },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting:      { fontSize: 22, fontWeight: "700", color: "#1a1a2e" },
  roleLabel:     { fontSize: 12, color: "#4f46e5", fontWeight: "600", marginTop: 2 },
  logout:        { fontSize: 14, color: "#e53e3e", fontWeight: "600" },
  statsRow:      { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard:      { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center", elevation: 2 },
  statNum:       { fontSize: 26, fontWeight: "700", color: "#1a1a2e" },
  statLabel:     { fontSize: 12, color: "#888", marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle:  { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 12 },
  actionsRow:    { flexDirection: "row", gap: 10, marginBottom: 24 },
  actionBtn:     { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1.5, elevation: 1 },
  actionIcon:    { fontSize: 20, marginBottom: 4 },
  actionLabel:   { fontSize: 11, fontWeight: "700" },
  searchInput:   { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, marginBottom: 14, borderWidth: 1, borderColor: "#e0e0e0", color: "#1a1a2e" },
  emptyCard:     { alignItems: "center", paddingVertical: 40 },
  emptyIcon:     { fontSize: 40, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 4 },
  emptyText:     { fontSize: 13, color: "#999", textAlign: "center" },
  workerCard:    { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  workerTop:     { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText:    { color: "#fff", fontSize: 18, fontWeight: "700" },
  workerInfo:    { flex: 1 },
  workerName:    { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  workerEmail:   { fontSize: 13, color: "#666", marginTop: 2 },
  workerPhone:   { fontSize: 12, color: "#888", marginTop: 2 },
  statusBadge:   { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:    { fontSize: 12, fontWeight: "600" },
  workerActions: { flexDirection: "row", gap: 10 },
  workerBtn:     { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  assignBtn:     { backgroundColor: "#4f46e5" },
  assignBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  insightBtn:    { backgroundColor: "#f3f0ff", borderWidth: 1, borderColor: "#7c3aed" },
  insightBtnText:{ color: "#7c3aed", fontSize: 13, fontWeight: "600" },
});
