import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Linking, RefreshControl,
} from "react-native";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { checkIn, checkOut, getAssignments, getTodayAttendance } from "../services/api";
import { removeToken } from "../utils/tokenStorage";
import { saveOfflineRecord, patchCheckOut, getUnsyncedCount } from "../utils/offlineStorage";
import { isOnline, syncOfflineRecords } from "../utils/syncManager";

// ── Helpers ──────────────────────────────────────────────────────────────────

const isToday = (dateStr) => {
  const d = new Date(dateStr), t = new Date();
  return d.getFullYear() === t.getFullYear()
      && d.getMonth()    === t.getMonth()
      && d.getDate()     === t.getDate();
};

const isPast = (dateStr) => new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

// Derive display status from assignment backend status + local attendanceStatus
const getDisplayStatus = (assignment, attendanceStatus) => {
  if (isToday(assignment.date)) {
    if (attendanceStatus === "completed") return "completed";
    if (attendanceStatus === "checkedIn") return "checkedIn";
    return "pending";
  }
  if (assignment.status === "completed") return "completed";
  if (assignment.status === "missed")    return "missed";
  if (isPast(assignment.date))           return "missed";
  return "upcoming";
};

const STATUS_CONFIG = {
  pending:   { label: "Pending",    bg: "#fee2e2", text: "#dc2626", border: "#dc2626", dot: "#dc2626" },
  checkedIn: { label: "Checked In", bg: "#fef9c3", text: "#b45309", border: "#d97706", dot: "#d97706" },
  completed: { label: "Completed",  bg: "#d1fae5", text: "#065f46", border: "#059669", dot: "#059669" },
  missed:    { label: "Missed",     bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af", dot: "#9ca3af" },
  upcoming:  { label: "Upcoming",   bg: "#e0e7ff", text: "#4338ca", border: "#6366f1", dot: "#6366f1" },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function WorkerDashboard({ navigation, route }) {
  const user = route.params?.user;

  const [assignments,     setAssignments]     = useState([]);
  const [todayAssignment, setTodayAssignment] = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [refreshing,      setRefreshing]      = useState(false);

  const [locationPermission, setLocationPermission] = useState(null);
  const [fetchingLocation,   setFetchingLocation]   = useState(false);
  const [currentCoords,      setCurrentCoords]      = useState(null);

  const [actionLoading, setActionLoading] = useState(null);
  const [online,        setOnline]        = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing,       setSyncing]       = useState(false);

  // Local attendance state for today: "pending" | "checkedIn" | "completed"
  const [attendanceStatus, setAttendanceStatus] = useState("pending");

  // ── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    requestLocationPermission();
    fetchAllAssignments();
    refreshUnsyncedCount();
    fetchTodayStatus(); // ← restore attendance status on login/reload

    let wasOffline = false;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      setOnline(connected);
      if (connected && wasOffline) triggerSync();
      wasOffline = !connected;
    });
    return () => unsubscribe();
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────

  const fetchAllAssignments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // Fetch ALL assignments (no upcoming filter) so we show full history
      const data = await getAssignments();
      const list = Array.isArray(data) ? data : [];
      // Sort: today first, then upcoming, then past
      list.sort((a, b) => {
        const aToday = isToday(a.date) ? 0 : isPast(a.date) ? 2 : 1;
        const bToday = isToday(b.date) ? 0 : isPast(b.date) ? 2 : 1;
        if (aToday !== bToday) return aToday - bToday;
        return new Date(a.date) - new Date(b.date);
      });
      setAssignments(list);
      setTodayAssignment(list.find((a) => isToday(a.date)) ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshUnsyncedCount = async () => setUnsyncedCount(await getUnsyncedCount());

  // Fetch today's attendance from backend to restore status after login/reload
  const fetchTodayStatus = async () => {
    try {
      const data = await getTodayAttendance();
      if (data.record) {
        if (data.record.checkOutTime) setAttendanceStatus("completed");
        else setAttendanceStatus("checkedIn");
      } else {
        setAttendanceStatus("pending");
      }
    } catch {
      setAttendanceStatus("pending");
    }
  };

  // ── Location ─────────────────────────────────────────────────────────────

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === "granted" ? "granted" : "denied");
    if (status !== "granted") {
      Alert.alert("Location Permission Required",
        "This app needs location access to record attendance.",
        [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]
      );
    }
  };

  const getCurrentLocation = async () => {
    if (locationPermission === "denied") {
      Alert.alert("Permission Denied", "Enable location in Settings.",
        [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]
      );
      return null;
    }
    setFetchingLocation(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentCoords(loc.coords);
      return loc.coords;
    } catch {
      Alert.alert("Location Error", "Unable to fetch your location. Please try again.");
      return null;
    } finally {
      setFetchingLocation(false);
    }
  };

  // ── Sync ─────────────────────────────────────────────────────────────────

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const result = await syncOfflineRecords();
      if (result) {
        await refreshUnsyncedCount();
        Alert.alert("Sync Complete", `Synced: ${result.synced}  Skipped: ${result.skipped}  Failed: ${result.failed}`);
      }
    } catch { } finally { setSyncing(false); }
  };

  const handleManualSync = async () => {
    if (!(await isOnline())) return Alert.alert("No Internet", "Connect to internet to sync.");
    await triggerSync();
  };

  // ── Check-In / Check-Out ─────────────────────────────────────────────────

  const handleCheckIn = async () => {
    const coords = await getCurrentLocation();
    if (!coords) return;
    setActionLoading("checkin");
    const record = {
      latitude:    coords.latitude,
      longitude:   coords.longitude,
      locationId:  todayAssignment?.locationId?._id,
      checkInTime: new Date().toISOString(),
      syncStatus:  false,
    };
    try {
      if (await isOnline()) {
        const data = await checkIn({ latitude: coords.latitude, longitude: coords.longitude });
        setAttendanceStatus("checkedIn");
        fetchAllAssignments();
        const alertTitle = data.isLate ? "⚠️ Checked In Late" : "✅ Check-In Successful";
        Alert.alert(alertTitle, data.message);
      } else {
        await saveOfflineRecord(record);
        await refreshUnsyncedCount();
        setAttendanceStatus("checkedIn");
        Alert.alert("📴 Saved Offline", "Check-in saved locally and will sync when online.");
      }
    } catch (err) {
      await saveOfflineRecord(record);
      await refreshUnsyncedCount();
      setAttendanceStatus("checkedIn");
      Alert.alert("📴 Saved Offline", `${err.message}. Record saved locally.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading("checkout");
    const checkOutTime = new Date().toISOString();
    try {
      if (await isOnline()) {
        const data = await checkOut();
        setAttendanceStatus("completed");
        Alert.alert("✅ Check-Out Successful", data.message);
      } else {
        const patched = await patchCheckOut(checkOutTime);
        if (patched) await refreshUnsyncedCount();
        setAttendanceStatus("completed");
        Alert.alert("📴 Saved Offline", "Check-out saved locally and will sync when online.");
      }
    } catch (err) {
      Alert.alert("Check-Out Failed", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await removeToken();
    navigation.replace("Login");
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const isBusy      = fetchingLocation || actionLoading !== null || syncing;
  const canCheckIn  = attendanceStatus === "pending"   && !!todayAssignment && !isBusy;
  const canCheckOut = attendanceStatus === "checkedIn" && !isBusy;

  // ── Render: single task row ───────────────────────────────────────────────

  const renderTaskRow = (assignment) => {
    const displayStatus = getDisplayStatus(assignment, attendanceStatus);
    const sc            = STATUS_CONFIG[displayStatus];
    const today         = isToday(assignment.date);

    return (
      <View key={assignment._id} style={[styles.taskRow, today && styles.taskRowToday]}>
        {/* Status dot */}
        <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />

        {/* Task info */}
        <View style={styles.taskInfo}>
          <View style={styles.taskTopRow}>
            <Text style={[styles.taskLocation, today && styles.taskLocationBold]}>
              📍 {assignment.locationId?.name ?? "—"}
            </Text>
            {today && <Text style={styles.todayTag}>TODAY</Text>}
          </View>
          <Text style={styles.taskDate}>{formatDate(assignment.date)}</Text>
          <Text style={styles.taskTime}>⏰ {assignment.startTime} – {assignment.endTime}</Text>
          {assignment.note ? <Text style={styles.taskNote}>📝 {assignment.note}</Text> : null}
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.statusBadgeText, { color: sc.text }]}>{sc.label}</Text>
        </View>
      </View>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchAllAssignments(true)} colors={["#4f46e5"]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name ?? "Worker"} 👋</Text>
          <Text style={styles.roleLabel}>WORKER</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.insightsBtn}
            onPress={() => navigation.navigate("WorkerInsights", { user })}
          >
            <Text style={styles.insightsBtnText}>📊 Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logout}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner */}
      {!online && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>🔴 Offline — attendance will be saved locally</Text>
        </View>
      )}

      {/* Permission Banner */}
      {locationPermission === "denied" && (
        <TouchableOpacity style={styles.permissionBanner} onPress={requestLocationPermission}>
          <Text style={styles.permissionText}>⚠️ Location permission denied. Tap to enable.</Text>
        </TouchableOpacity>
      )}

      {/* Check-In / Check-Out Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.checkInBtn, !canCheckIn && styles.disabled]}
          onPress={handleCheckIn}
          disabled={!canCheckIn}
        >
          {fetchingLocation || actionLoading === "checkin" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {attendanceStatus !== "pending" ? "✅ Checked In" : "📍 Check In"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.checkOutBtn, !canCheckOut && styles.disabled]}
          onPress={handleCheckOut}
          disabled={!canCheckOut}
        >
          {actionLoading === "checkout" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {attendanceStatus === "completed" ? "✅ Checked Out" : "🏁 Check Out"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Unsynced Records */}
      {unsyncedCount > 0 && (
        <View style={styles.syncCard}>
          <View style={styles.syncRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncTitle}>🔄 Unsynced Records</Text>
              <Text style={styles.syncCount}>{unsyncedCount} record{unsyncedCount > 1 ? "s" : ""} pending</Text>
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, syncing && styles.disabled]}
              onPress={handleManualSync}
              disabled={syncing}
            >
              {syncing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.syncBtnText}>Sync Now</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Task List */}
      <Text style={styles.sectionTitle}>📋 My Assignments</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4f46e5" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAllAssignments()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : assignments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Assignments Yet</Text>
          <Text style={styles.emptyText}>Your admin hasn't assigned any tasks yet.</Text>
        </View>
      ) : (
        <View style={styles.taskList}>
          {assignments.map(renderTaskRow)}
        </View>
      )}

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flexGrow: 1, backgroundColor: "#f5f7fa", padding: 20, paddingTop: 60 },
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerActions:    { alignItems: "flex-end", gap: 8 },
  greeting:         { fontSize: 22, fontWeight: "700", color: "#1a1a2e" },
  roleLabel:        { fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  insightsBtn:      { backgroundColor: "#e0e7ff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  insightsBtnText:  { fontSize: 13, color: "#4f46e5", fontWeight: "600" },
  logout:           { fontSize: 14, color: "#e53e3e", fontWeight: "600" },
  offlineBanner:    { backgroundColor: "#fee2e2", borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: "#ef4444" },
  offlineText:      { fontSize: 13, color: "#991b1b", fontWeight: "500" },
  permissionBanner: { backgroundColor: "#fff3cd", borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: "#f59e0b" },
  permissionText:   { fontSize: 13, color: "#92400e", fontWeight: "500" },

  // Buttons
  buttonRow:        { flexDirection: "row", gap: 12, marginBottom: 16 },
  button:           { flex: 1, borderRadius: 12, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  checkInBtn:       { backgroundColor: "#4f46e5" },
  checkOutBtn:      { backgroundColor: "#0891b2" },
  disabled:         { opacity: 0.45 },
  buttonText:       { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Sync card
  syncCard:         { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: "#4f46e5", elevation: 2 },
  syncRow:          { flexDirection: "row", alignItems: "center" },
  syncTitle:        { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  syncCount:        { fontSize: 12, color: "#4f46e5", marginTop: 2 },
  syncBtn:          { backgroundColor: "#4f46e5", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  syncBtnText:      { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Section
  sectionTitle:     { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 12 },

  // Task list
  taskList:         { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2 },
  taskRow:          { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  taskRowToday:     { backgroundColor: "#f8f7ff" },
  statusDot:        { width: 10, height: 10, borderRadius: 5, marginRight: 12, flexShrink: 0 },
  taskInfo:         { flex: 1, marginRight: 10 },
  taskTopRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  taskLocation:     { fontSize: 14, color: "#333", fontWeight: "500", flex: 1 },
  taskLocationBold: { fontWeight: "700", color: "#1a1a2e" },
  todayTag:         { backgroundColor: "#4f46e5", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  taskDate:         { fontSize: 12, color: "#888", marginBottom: 2 },
  taskTime:         { fontSize: 12, color: "#555" },
  taskNote:         { fontSize: 11, color: "#999", marginTop: 3, fontStyle: "italic" },
  statusBadge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, alignSelf: "flex-start" },
  statusBadgeText:  { fontSize: 11, fontWeight: "700" },
  todayTagText:     { color: "#fff", fontSize: 10, fontWeight: "700" },

  // States
  center:           { alignItems: "center", paddingVertical: 40 },
  loadingText:      { color: "#888", marginTop: 10, fontSize: 13 },
  errorIcon:        { fontSize: 32, marginBottom: 8 },
  errorText:        { fontSize: 13, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn:         { backgroundColor: "#4f46e5", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  retryText:        { color: "#fff", fontWeight: "600", fontSize: 13 },
  emptyCard:        { alignItems: "center", paddingVertical: 40 },
  emptyIcon:        { fontSize: 40, marginBottom: 12 },
  emptyTitle:       { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 4 },
  emptyText:        { fontSize: 13, color: "#999", textAlign: "center" },
});
