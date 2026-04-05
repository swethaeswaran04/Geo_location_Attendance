import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { getAllInsights } from "../services/api";

const GRADE_COLORS = {
  A: { bg: "#d1fae5", text: "#065f46" },
  B: { bg: "#dbeafe", text: "#1e40af" },
  C: { bg: "#fef9c3", text: "#854d0e" },
  D: { bg: "#ffedd5", text: "#9a3412" },
  F: { bg: "#fee2e2", text: "#991b1b" },
};

const RANK_MEDALS = { 0: "🥇", 1: "🥈", 2: "🥉" };

const scoreColor = (s) => s >= 75 ? "#059669" : s >= 50 ? "#d97706" : "#dc2626";

const ProgressBar = ({ value, color = "#4f46e5" }) => (
  <View style={pb.track}>
    <View style={[pb.fill, { width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: color }]} />
  </View>
);
const pb = StyleSheet.create({
  track: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden", marginTop: 6 },
  fill:  { height: "100%", borderRadius: 3 },
});

const RANGES = [
  { key: "all",   label: "All Time"   },
  { key: "month", label: "This Month" },
  { key: "week",  label: "This Week"  },
];

const SORTS = [
  { key: "performanceScore",  label: "Score"    },
  { key: "onTimePercentage",  label: "On-Time"  },
  { key: "lateDays",          label: "Late ↑"   },
];

export default function AdminInsights({ navigation, route }) {
  const { workerId, workerName } = route.params ?? {};

  const [insights,   setInsights]   = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [range,      setRange]      = useState("all");
  const [sortBy,     setSortBy]     = useState("performanceScore");

  const getDateRange = (key) => {
    const now = new Date();
    if (key === "week") {
      const from = new Date(now); from.setDate(now.getDate() - 7);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (key === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    return {};
  };

  const fetchInsights = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getAllInsights(getDateRange(range));
      let list  = res.insights ?? [];
      if (workerId) list = list.filter((i) => i.userId?.toString() === workerId);
      list = [...list].sort((a, b) =>
        sortBy === "lateDays" ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]
      );
      setInsights(list);
      setSummary(res.summary ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, sortBy, workerId]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  // ── Summary card ────────────────────────────────────────────────────────
  const renderSummary = () => {
    if (workerId || !summary) return null;
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Team Overview</Text>
        <View style={styles.summaryRow}>
          {[
            { num: summary.totalWorkers,    label: "Workers"      },
            { num: summary.avgPerformance,  label: "Avg Score"    },
            { num: summary.topPerformer?.split(" ")[0] ?? "—", label: "Top Performer" },
          ].map((s) => (
            <View key={s.label} style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{s.num}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        {summary.gradeDistribution && (
          <View style={styles.gradeRow}>
            {Object.entries(summary.gradeDistribution).map(([grade, count]) => {
              const gc = GRADE_COLORS[grade] ?? GRADE_COLORS.F;
              return (
                <View key={grade} style={[styles.gradePill, { backgroundColor: gc.bg }]}>
                  <Text style={[styles.gradePillText, { color: gc.text }]}>{grade}: {count}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ── Worker card ─────────────────────────────────────────────────────────
  const renderWorkerCard = (item, index) => {
    const gc = GRADE_COLORS[item.grade] ?? GRADE_COLORS.F;
    const sc = scoreColor(item.performanceScore);
    return (
      <View key={String(item.userId)} style={styles.workerCard}>
        {/* Top row */}
        <View style={styles.workerTop}>
          {/* Rank / Avatar */}
          <View style={styles.avatarWrap}>
            {RANK_MEDALS[index] ? (
              <Text style={styles.medal}>{RANK_MEDALS[index]}</Text>
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
          </View>

          {/* Name + email */}
          <View style={styles.workerInfo}>
            <Text style={styles.workerName}>{item.user?.name ?? "Unknown"}</Text>
            <Text style={styles.workerEmail}>{item.user?.email ?? ""}</Text>
          </View>

          {/* Grade badge */}
          <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
            <Text style={[styles.gradeText, { color: gc.text }]}>{item.grade}</Text>
          </View>
        </View>

        {/* Key metrics row — name, on-time %, score */}
        <View style={styles.keyMetrics}>
          <View style={styles.keyMetric}>
            <Text style={styles.keyMetricValue}>{item.onTimePercentage}%</Text>
            <Text style={styles.keyMetricLabel}>On-Time</Text>
          </View>
          <View style={[styles.keyMetric, styles.keyMetricCenter]}>
            <Text style={[styles.keyMetricValue, { color: sc }]}>{item.performanceScore}</Text>
            <Text style={styles.keyMetricLabel}>Score</Text>
          </View>
          <View style={styles.keyMetric}>
            <Text style={styles.keyMetricValue}>{item.totalDays}</Text>
            <Text style={styles.keyMetricLabel}>Days</Text>
          </View>
        </View>

        {/* Score progress bar */}
        <ProgressBar value={item.performanceScore} color={sc} />

        {/* Full metrics grid */}
        <View style={styles.metricsGrid}>
          {[
            { label: "Late Days",    value: item.lateDays,               icon: "⏰" },
            { label: "Missed",       value: item.missedDays,             icon: "❌" },
            { label: "Avg Check-In", value: item.avgCheckInTime,         icon: "🕐" },
            { label: "Avg Hrs/Day",  value: `${item.avgWorkHoursPerDay}h`, icon: "⏱" },
          ].map((m) => (
            <View key={m.label} style={styles.metricItem}>
              <Text style={styles.metricIcon}>{m.icon}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── JSX ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchInsights(true)} colors={["#4f46e5"]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {workerName ? `${workerName}'s Insights` : "Team Insights"}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Date Range */}
      <View style={styles.chipRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.chip, range === r.key && styles.chipActive]}
            onPress={() => setRange(r.key)}
          >
            <Text style={[styles.chipText, range === r.key && styles.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort — only show for team view */}
      {!workerId && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {SORTS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortChip, sortBy === s.key && styles.sortChipActive]}
              onPress={() => setSortBy(s.key)}
            >
              <Text style={[styles.sortChipText, sortBy === s.key && styles.sortChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchInsights()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : insights.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>No attendance records found for this period.</Text>
        </View>
      ) : (
        <>
          {renderSummary()}
          {insights.map((item, i) => renderWorkerCard(item, i))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flexGrow: 1, backgroundColor: "#f5f7fa", padding: 24, paddingTop: 60 },
  header:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  back:               { fontSize: 14, color: "#4f46e5", fontWeight: "600", width: 60 },
  title:              { fontSize: 18, fontWeight: "700", color: "#1a1a2e", flex: 1, textAlign: "center" },
  chipRow:            { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip:               { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: "#e0e0e0", alignItems: "center", backgroundColor: "#fff" },
  chipActive:         { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  chipText:           { fontSize: 12, fontWeight: "600", color: "#666" },
  chipTextActive:     { color: "#fff" },
  sortRow:            { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  sortLabel:          { fontSize: 12, color: "#888", fontWeight: "600" },
  sortChip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" },
  sortChipActive:     { backgroundColor: "#eef2ff", borderColor: "#4f46e5" },
  sortChipText:       { fontSize: 12, color: "#666", fontWeight: "600" },
  sortChipTextActive: { color: "#4f46e5" },
  center:             { alignItems: "center", paddingTop: 60 },
  loadingText:        { marginTop: 12, fontSize: 14, color: "#888" },
  errorIcon:          { fontSize: 36, marginBottom: 12 },
  errorText:          { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 16 },
  retryBtn:           { backgroundColor: "#4f46e5", borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText:          { color: "#fff", fontWeight: "600" },
  emptyIcon:          { fontSize: 40, marginBottom: 12 },
  emptyTitle:         { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 4 },
  emptyText:          { fontSize: 13, color: "#999", textAlign: "center" },
  summaryCard:        { backgroundColor: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, elevation: 2 },
  summaryTitle:       { fontSize: 15, fontWeight: "700", color: "#1a1a2e", marginBottom: 14 },
  summaryRow:         { flexDirection: "row", justifyContent: "space-around", marginBottom: 14 },
  summaryItem:        { alignItems: "center" },
  summaryNum:         { fontSize: 22, fontWeight: "700", color: "#1a1a2e" },
  summaryLabel:       { fontSize: 11, color: "#888", marginTop: 2 },
  gradeRow:           { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gradePill:          { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  gradePillText:      { fontSize: 12, fontWeight: "700" },
  workerCard:         { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2 },
  workerTop:          { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarWrap:         { marginRight: 12 },
  medal:              { fontSize: 32 },
  avatar:             { width: 44, height: 44, borderRadius: 22, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" },
  avatarText:         { color: "#fff", fontSize: 18, fontWeight: "700" },
  workerInfo:         { flex: 1 },
  workerName:         { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  workerEmail:        { fontSize: 12, color: "#666", marginTop: 2 },
  gradeBadge:         { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  gradeText:          { fontSize: 18, fontWeight: "800" },
  keyMetrics:         { flexDirection: "row", backgroundColor: "#f5f7fa", borderRadius: 10, padding: 12, marginBottom: 10 },
  keyMetric:          { flex: 1, alignItems: "center" },
  keyMetricCenter:    { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e0e0e0" },
  keyMetricValue:     { fontSize: 20, fontWeight: "800", color: "#1a1a2e" },
  keyMetricLabel:     { fontSize: 11, color: "#888", marginTop: 2 },
  metricsGrid:        { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 },
  metricItem:         { width: "22%", backgroundColor: "#f5f7fa", borderRadius: 8, padding: 8, alignItems: "center" },
  metricIcon:         { fontSize: 14, marginBottom: 4 },
  metricValue:        { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
  metricLabel:        { fontSize: 9, color: "#888", textAlign: "center", marginTop: 2 },
});
