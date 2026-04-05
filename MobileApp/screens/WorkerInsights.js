import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { getUserInsights } from "../services/api";

const GRADE_COLORS = {
  A: { bg: "#d1fae5", text: "#065f46", label: "Excellent" },
  B: { bg: "#dbeafe", text: "#1e40af", label: "Good" },
  C: { bg: "#fef9c3", text: "#854d0e", label: "Average" },
  D: { bg: "#ffedd5", text: "#9a3412", label: "Below Average" },
  F: { bg: "#fee2e2", text: "#991b1b", label: "Poor" },
};

const ProgressBar = ({ value, color = "#4f46e5", max = 100 }) => {
  const pct = Math.min(Math.max(value, 0), max);
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${(pct / max) * 100}%`, backgroundColor: color }]} />
    </View>
  );
};

const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden", marginTop: 8 },
  fill:  { height: "100%", borderRadius: 4 },
});

const MetricCard = ({ icon, label, value, sub, color = "#4f46e5", progress }) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <View style={styles.metricHeader}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {sub  ? <Text style={styles.metricSub}>{sub}</Text> : null}
    {progress != null ? <ProgressBar value={progress} color={color} /> : null}
  </View>
);

export default function WorkerInsights({ navigation, route }) {
  const user = route.params?.user;
  const [insights,   setInsights]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [range,      setRange]      = useState("all"); // "all" | "month" | "week"

  const RANGES = [
    { key: "all",   label: "All Time" },
    { key: "month", label: "This Month" },
    { key: "week",  label: "This Week"  },
  ];

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
      const params = getDateRange(range);
      const res = await getUserInsights(params);
      setInsights(res.insights ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const gradeStyle = insights ? (GRADE_COLORS[insights.grade] ?? GRADE_COLORS.F) : null;

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Calculating insights...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchInsights()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!insights) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>Complete some check-ins to see your insights.</Text>
        </View>
      );
    }

    return (
      <>
        {/* Grade Banner */}
        <View style={[styles.gradeBanner, { backgroundColor: gradeStyle.bg }]}>
          <View>
            <Text style={[styles.gradeLabel, { color: gradeStyle.text }]}>Performance Grade</Text>
            <Text style={[styles.gradeDesc,  { color: gradeStyle.text }]}>{gradeStyle.label}</Text>
          </View>
          <Text style={[styles.gradeLetter, { color: gradeStyle.text }]}>{insights.grade}</Text>
        </View>

        {/* Performance Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Overall Performance Score</Text>
          <Text style={styles.scoreValue}>{insights.performanceScore}<Text style={styles.scoreMax}>/100</Text></Text>
          <ProgressBar value={insights.performanceScore} color={
            insights.performanceScore >= 75 ? "#059669" :
            insights.performanceScore >= 50 ? "#d97706" : "#dc2626"
          } />
        </View>

        {/* Metric Cards Grid */}
        <View style={styles.grid}>
          <MetricCard
            icon="📅" label="Working Days"
            value={insights.totalDays}
            sub={`${insights.totalAssigned} assigned`}
            color="#4f46e5"
            progress={insights.attendanceRate}
          />
          <MetricCard
            icon="✅" label="On-Time"
            value={`${insights.onTimePercentage}%`}
            sub={`${insights.presentDays} on-time days`}
            color="#059669"
            progress={insights.onTimePercentage}
          />
          <MetricCard
            icon="⏰" label="Late Check-Ins"
            value={insights.lateDays}
            sub={insights.lateDays === 0 ? "Perfect record!" : "days late"}
            color={insights.lateDays === 0 ? "#059669" : "#d97706"}
          />
          <MetricCard
            icon="❌" label="Missed Days"
            value={insights.missedDays}
            sub={insights.missedDays === 0 ? "No absences!" : "days missed"}
            color={insights.missedDays === 0 ? "#059669" : "#dc2626"}
          />
          <MetricCard
            icon="🕐" label="Avg Check-In"
            value={insights.avgCheckInTime}
            sub="average time"
            color="#7c3aed"
          />
          <MetricCard
            icon="⏱" label="Avg Work Hours"
            value={`${insights.avgWorkHoursPerDay}h`}
            sub="per day"
            color="#0891b2"
            progress={insights.avgWorkHoursPerDay}
            max={8}
          />
        </View>

        {/* Attendance Rate Bar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Attendance Rate</Text>
          <View style={styles.rateRow}>
            <Text style={styles.rateValue}>{insights.attendanceRate}%</Text>
            <Text style={styles.rateSub}>{insights.totalDays} of {insights.totalAssigned} days</Text>
          </View>
          <ProgressBar
            value={insights.attendanceRate}
            color={insights.attendanceRate >= 90 ? "#059669" : insights.attendanceRate >= 70 ? "#d97706" : "#dc2626"}
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#059669" }]} />
              <Text style={styles.legendText}>Present: {insights.presentDays}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#d97706" }]} />
              <Text style={styles.legendText}>Late: {insights.lateDays}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#dc2626" }]} />
              <Text style={styles.legendText}>Missed: {insights.missedDays}</Text>
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchInsights(true)} colors={["#4f46e5"]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Insights</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Date Range Selector */}
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.rangeBtn, range === r.key && styles.rangeBtnActive]}
            onPress={() => setRange(r.key)}
          >
            <Text style={[styles.rangeBtnText, range === r.key && styles.rangeBtnTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flexGrow: 1, backgroundColor: "#f5f7fa", padding: 24, paddingTop: 60 },
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  backBtn:          { width: 60 },
  backText:         { fontSize: 14, color: "#4f46e5", fontWeight: "600" },
  title:            { fontSize: 20, fontWeight: "700", color: "#1a1a2e" },
  rangeRow:         { flexDirection: "row", gap: 8, marginBottom: 20 },
  rangeBtn:         { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: "#e0e0e0", alignItems: "center", backgroundColor: "#fff" },
  rangeBtnActive:   { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  rangeBtnText:     { fontSize: 12, fontWeight: "600", color: "#666" },
  rangeBtnTextActive: { color: "#fff" },
  center:           { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  loadingText:      { marginTop: 12, fontSize: 14, color: "#888" },
  errorIcon:        { fontSize: 36, marginBottom: 12 },
  errorText:        { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 16 },
  retryBtn:         { backgroundColor: "#4f46e5", borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText:        { color: "#fff", fontWeight: "600" },
  emptyIcon:        { fontSize: 40, marginBottom: 12 },
  emptyTitle:       { fontSize: 18, fontWeight: "700", color: "#1a1a2e", marginBottom: 6 },
  emptyText:        { fontSize: 14, color: "#999", textAlign: "center" },
  gradeBanner:      { borderRadius: 14, padding: 20, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gradeLabel:       { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  gradeDesc:        { fontSize: 18, fontWeight: "700" },
  gradeLetter:      { fontSize: 56, fontWeight: "800" },
  scoreCard:        { backgroundColor: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, elevation: 2 },
  scoreLabel:       { fontSize: 14, color: "#666", marginBottom: 6 },
  scoreValue:       { fontSize: 42, fontWeight: "800", color: "#1a1a2e" },
  scoreMax:         { fontSize: 18, color: "#999", fontWeight: "400" },
  grid:             { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  metricCard:       { width: "47%", backgroundColor: "#fff", borderRadius: 12, padding: 16, borderLeftWidth: 4, elevation: 2 },
  metricHeader:     { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  metricIcon:       { fontSize: 16, marginRight: 6 },
  metricLabel:      { fontSize: 12, color: "#888", fontWeight: "600", flex: 1 },
  metricValue:      { fontSize: 26, fontWeight: "800", marginBottom: 2 },
  metricSub:        { fontSize: 11, color: "#999" },
  card:             { backgroundColor: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, elevation: 2 },
  cardTitle:        { fontSize: 15, fontWeight: "700", color: "#1a1a2e", marginBottom: 12 },
  rateRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  rateValue:        { fontSize: 28, fontWeight: "800", color: "#1a1a2e" },
  rateSub:          { fontSize: 13, color: "#888" },
  legendRow:        { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  legendItem:       { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot:        { width: 8, height: 8, borderRadius: 4 },
  legendText:       { fontSize: 12, color: "#666" },
});
