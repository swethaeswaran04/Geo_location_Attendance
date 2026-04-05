import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal, FlatList,
} from "react-native";
import { createAssignment, getLocations, getWorkers } from "../services/api";

// ── Reusable Dropdown ────────────────────────────────────────────────────────
function Dropdown({ label, value, placeholder, items, onSelect, loading, keyExtractor, labelExtractor, sublabelExtractor }) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => keyExtractor(i) === value);

  return (
    <View style={styles.dropdownWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdownBtn, value && styles.dropdownBtnSelected]}
        onPress={() => !loading && setOpen(true)}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#4f46e5" />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dropdownBtnText, !selected && styles.placeholder]}>
                {selected ? labelExtractor(selected) : placeholder}
              </Text>
              {selected && sublabelExtractor && (
                <Text style={styles.dropdownSub}>{sublabelExtractor(selected)}</Text>
              )}
            </View>
            <Text style={styles.dropdownArrow}>{open ? "▲" : "▼"}</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={items}
              keyExtractor={keyExtractor}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, keyExtractor(item) === value && styles.modalItemActive]}
                  onPress={() => { onSelect(keyExtractor(item)); setOpen(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemText, keyExtractor(item) === value && styles.modalItemTextActive]}>
                      {labelExtractor(item)}
                    </Text>
                    {sublabelExtractor && (
                      <Text style={styles.modalItemSub}>{sublabelExtractor(item)}</Text>
                    )}
                  </View>
                  {keyExtractor(item) === value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Time Picker (HH:MM stepper) ──────────────────────────────────────────────
function TimePicker({ label, value, onChange }) {
  const [h, m] = value.split(":").map(Number);

  const pad  = (n) => String(n).padStart(2, "0");
  const addH = (d) => onChange(`${pad((h + d + 24) % 24)}:${pad(m)}`);
  const addM = (d) => onChange(`${pad(h)}:${pad((m + d + 60) % 60)}`);

  return (
    <View style={styles.timePickerBox}>
      <Text style={styles.timePickerLabel}>{label}</Text>
      <View style={styles.timePickerRow}>
        <View style={styles.timeUnit}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => addH(1)}><Text style={styles.stepText}>▲</Text></TouchableOpacity>
          <Text style={styles.timeDigit}>{pad(h)}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => addH(-1)}><Text style={styles.stepText}>▼</Text></TouchableOpacity>
        </View>
        <Text style={styles.timeSep}>:</Text>
        <View style={styles.timeUnit}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => addM(5)}><Text style={styles.stepText}>▲</Text></TouchableOpacity>
          <Text style={styles.timeDigit}>{pad(m)}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => addM(-5)}><Text style={styles.stepText}>▼</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function AssignmentScreen({ navigation, route }) {
  const preselectedWorker = route.params?.worker ?? null;

  const [workers,     setWorkers]     = useState([]);
  const [locations,   setLocations]   = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [successData, setSuccessData] = useState(null); // holds assignment details for popup

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    workerId:   preselectedWorker?._id ?? null,
    locationId: null,
    date:       today,
    startTime:  "09:00",
    endTime:    "17:00",
    note:       "",
  });

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    Promise.all([getWorkers(), getLocations()])
      .then(([wRes, lRes]) => {
        setWorkers(wRes.users ?? []);
        setLocations(Array.isArray(lRes) ? lRes : []);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, []);

  const validate = () => {
    if (!form.workerId)   { Alert.alert("Missing Field", "Please select a worker.");   return false; }
    if (!form.locationId) { Alert.alert("Missing Field", "Please select a location."); return false; }
    if (!form.date)       { Alert.alert("Missing Field", "Please enter a date.");      return false; }
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    if (sh * 60 + sm >= eh * 60 + em) {
      Alert.alert("Invalid Time", "End time must be after start time.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await createAssignment({
        userId:     form.workerId,
        locationId: form.locationId,
        date:       form.date,
        startTime:  form.startTime,
        endTime:    form.endTime,
        note:       form.note,
      });
      const worker   = workers.find((w) => w._id === form.workerId);
      const location = locations.find((l) => l._id === form.locationId);
      setSuccessData({
        workerName:   worker?.name   ?? "Worker",
        locationName: location?.name ?? "Location",
        date:         form.date,
        startTime:    form.startTime,
        endTime:      form.endTime,
        note:         form.note,
      });
    } catch (err) {
      Alert.alert("❌ Failed", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Assignment</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Worker Dropdown */}
      <Dropdown
        label="👷 Select Worker"
        value={form.workerId}
        placeholder="Choose a worker..."
        items={workers}
        loading={dataLoading}
        onSelect={(id) => set("workerId", id)}
        keyExtractor={(w) => w._id}
        labelExtractor={(w) => w.name}
        sublabelExtractor={(w) => w.email}
      />

      {/* Location Dropdown */}
      <Dropdown
        label="📍 Select Location"
        value={form.locationId}
        placeholder="Choose a location..."
        items={locations}
        loading={dataLoading}
        onSelect={(id) => set("locationId", id)}
        keyExtractor={(l) => l._id}
        labelExtractor={(l) => l.name}
        sublabelExtractor={(l) => `Radius: ${l.radius}m`}
      />

      {/* Date */}
      <Text style={styles.label}>📅 Date</Text>
      <TextInput
        style={styles.input}
        value={form.date}
        onChangeText={(v) => set("date", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      {/* Time Pickers */}
      <Text style={styles.label}>🕐 Check-In Window</Text>
      <View style={styles.timeRow}>
        <TimePicker label="Start Time" value={form.startTime} onChange={(v) => set("startTime", v)} />
        <View style={styles.timeArrow}><Text style={styles.timeArrowText}>→</Text></View>
        <TimePicker label="End Time"   value={form.endTime}   onChange={(v) => set("endTime", v)} />
      </View>

      {/* Note */}
      <Text style={styles.label}>📝 Note (optional)</Text>
      <TextInput
        style={[styles.input, styles.noteInput]}
        value={form.note}
        onChangeText={(v) => set("note", v)}
        placeholder="Add a note for the worker..."
        placeholderTextColor="#999"
        multiline
      />

      {/* Summary Preview */}
      {form.workerId && form.locationId && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>📋 Assignment Summary</Text>
          <Text style={styles.previewRow}>
            👷 {workers.find((w) => w._id === form.workerId)?.name ?? "—"}
          </Text>
          <Text style={styles.previewRow}>
            📍 {locations.find((l) => l._id === form.locationId)?.name ?? "—"}
          </Text>
          <Text style={styles.previewRow}>📅 {form.date}</Text>
          <Text style={styles.previewRow}>🕐 {form.startTime} – {form.endTime}</Text>
          {form.note ? <Text style={styles.previewRow}>📝 {form.note}</Text> : null}
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>📋 Create Assignment</Text>}
      </TouchableOpacity>

    </ScrollView>

    {/* ── Success Popup Modal ── */}
    <Modal visible={!!successData} transparent animationType="fade">
      <View style={styles.successOverlay}>
        <View style={styles.successCard}>
          {/* Icon */}
          <View style={styles.successIconWrap}>
            <Text style={styles.successIcon}>✅</Text>
          </View>

          {/* Title */}
          <Text style={styles.successTitle}>Assignment Created!</Text>
          <Text style={styles.successSubtitle}>The assignment has been created successfully.</Text>

          {/* Details */}
          <View style={styles.successDetails}>
            <View style={styles.successRow}>
              <Text style={styles.successRowIcon}>👷</Text>
              <Text style={styles.successRowLabel}>Worker</Text>
              <Text style={styles.successRowValue}>{successData?.workerName}</Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successRowIcon}>📍</Text>
              <Text style={styles.successRowLabel}>Location</Text>
              <Text style={styles.successRowValue}>{successData?.locationName}</Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successRowIcon}>📅</Text>
              <Text style={styles.successRowLabel}>Date</Text>
              <Text style={styles.successRowValue}>{successData?.date}</Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successRowIcon}>⏰</Text>
              <Text style={styles.successRowLabel}>Time</Text>
              <Text style={styles.successRowValue}>{successData?.startTime} – {successData?.endTime}</Text>
            </View>
            {successData?.note ? (
              <>
                <View style={styles.successDivider} />
                <View style={styles.successRow}>
                  <Text style={styles.successRowIcon}>📝</Text>
                  <Text style={styles.successRowLabel}>Note</Text>
                  <Text style={styles.successRowValue}>{successData?.note}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Button */}
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => { setSuccessData(null); navigation.goBack(); }}
          >
            <Text style={styles.successBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flexGrow: 1, backgroundColor: "#f5f7fa", padding: 24, paddingTop: 60 },
  header:              { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  back:                { fontSize: 14, color: "#4f46e5", fontWeight: "600", width: 60 },
  title:               { fontSize: 20, fontWeight: "700", color: "#1a1a2e" },
  label:               { fontSize: 13, fontWeight: "700", color: "#444", marginBottom: 8 },
  dropdownWrapper:     { marginBottom: 20 },
  dropdownBtn:         { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#e0e0e0", flexDirection: "row", alignItems: "center", minHeight: 52 },
  dropdownBtnSelected: { borderColor: "#4f46e5", borderWidth: 1.5 },
  dropdownBtnText:     { fontSize: 14, color: "#1a1a2e", fontWeight: "500" },
  dropdownSub:         { fontSize: 12, color: "#888", marginTop: 2 },
  placeholder:         { color: "#999" },
  dropdownArrow:       { fontSize: 12, color: "#888", marginLeft: 8 },
  overlay:             { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalBox:            { backgroundColor: "#fff", borderRadius: 16, padding: 20, maxHeight: 400 },
  modalTitle:          { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 14 },
  modalItem:           { paddingVertical: 14, paddingHorizontal: 4, flexDirection: "row", alignItems: "center" },
  modalItemActive:     { backgroundColor: "#f0f0ff", borderRadius: 8, paddingHorizontal: 8 },
  modalItemText:       { fontSize: 14, color: "#1a1a2e", fontWeight: "500" },
  modalItemTextActive: { color: "#4f46e5", fontWeight: "700" },
  modalItemSub:        { fontSize: 12, color: "#888", marginTop: 2 },
  checkmark:           { fontSize: 16, color: "#4f46e5", fontWeight: "700" },
  separator:           { height: 1, backgroundColor: "#f0f0f0" },
  input:               { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, borderWidth: 1, borderColor: "#e0e0e0", color: "#1a1a2e", marginBottom: 20 },
  noteInput:           { height: 90, textAlignVertical: "top" },
  timeRow:             { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 8 },
  timeArrow:           { paddingTop: 20 },
  timeArrowText:       { fontSize: 20, color: "#888" },
  timePickerBox:       { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#e0e0e0", alignItems: "center" },
  timePickerLabel:     { fontSize: 11, color: "#888", fontWeight: "600", marginBottom: 8 },
  timePickerRow:       { flexDirection: "row", alignItems: "center", gap: 4 },
  timeUnit:            { alignItems: "center" },
  stepBtn:             { padding: 6 },
  stepText:            { fontSize: 12, color: "#4f46e5", fontWeight: "700" },
  timeDigit:           { fontSize: 22, fontWeight: "700", color: "#1a1a2e", minWidth: 32, textAlign: "center" },
  timeSep:             { fontSize: 22, fontWeight: "700", color: "#888", marginBottom: 2 },
  previewCard:         { backgroundColor: "#eef2ff", borderRadius: 12, padding: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: "#4f46e5" },
  previewTitle:        { fontSize: 14, fontWeight: "700", color: "#4f46e5", marginBottom: 10 },
  previewRow:          { fontSize: 13, color: "#1a1a2e", marginBottom: 4 },
  submitBtn:           { backgroundColor: "#4f46e5", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  submitText:          { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled:            { opacity: 0.6 },

  // Success Modal
  successOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  successCard:         { backgroundColor: "#fff", borderRadius: 20, padding: 28, width: "100%", alignItems: "center", elevation: 10 },
  successIconWrap:     { width: 72, height: 72, borderRadius: 36, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  successIcon:         { fontSize: 36 },
  successTitle:        { fontSize: 22, fontWeight: "800", color: "#1a1a2e", marginBottom: 6 },
  successSubtitle:     { fontSize: 14, color: "#666", marginBottom: 24, textAlign: "center" },
  successDetails:      { width: "100%", backgroundColor: "#f8f9fa", borderRadius: 12, padding: 16, marginBottom: 24 },
  successRow:          { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  successRowIcon:      { fontSize: 16, width: 28 },
  successRowLabel:     { fontSize: 13, color: "#888", fontWeight: "600", width: 70 },
  successRowValue:     { fontSize: 13, color: "#1a1a2e", fontWeight: "600", flex: 1 },
  successDivider:      { height: 1, backgroundColor: "#e5e7eb" },
  successBtn:          { backgroundColor: "#4f46e5", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48 },
  successBtnText:      { color: "#fff", fontSize: 16, fontWeight: "700" },
});
