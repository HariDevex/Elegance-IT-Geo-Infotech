import { useState, useEffect, useCallback } from "react";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Users, Loader2 } from "lucide-react";
import axios from "axios";
import API_BASE from "../config/api.js";

const AIAttendanceInsights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, timeRange]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/api/ai/attendance-insights?range=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setInsights(response.data.insights);
      }
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const getTrendIcon = (trend) => {
    if (trend === "up") return <TrendingUp size={16} className="text-green-500" />;
    if (trend === "down") return <TrendingDown size={16} className="text-red-500" />;
    return <Clock size={16} className="text-yellow-500" />;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return { bg: "rgba(239, 68, 68, 0.1)", border: "#ef4444", text: "#ef4444" };
      case "medium":
        return { bg: "rgba(251, 191, 36, 0.1)", border: "#fbbf24", text: "#fbbf24" };
      default:
        return { bg: "rgba(34, 197, 94, 0.1)", border: "#22c55e", text: "#22c55e" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #9333ea, #2563eb)" }}
          >
            <Brain size={20} color="white" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              AI Attendance Insights
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Intelligent analysis and predictions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {["week", "month", "quarter"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition capitalize"
              style={{
                backgroundColor: timeRange === range ? "var(--color-primary)" : "var(--color-bg-hover)",
                color: timeRange === range ? "white" : "var(--color-text-secondary)",
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : insights ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-xl border"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Attendance Rate</span>
                <CheckCircle size={18} className="text-green-500" />
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {insights.attendanceRate || 0}%
              </div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(insights.attendanceTrend)}
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  vs last {timeRange}
                </span>
              </div>
            </div>

            <div
              className="p-4 rounded-xl border"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Avg Hours/Day</span>
                <Clock size={18} style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {insights.avgHours || 0}h
              </div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(insights.hoursTrend)}
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>target: 8h</span>
              </div>
            </div>

            <div
              className="p-4 rounded-xl border"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>On Time Arrivals</span>
                <Users size={18} style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {insights.onTimeRate || 0}%
              </div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(insights.punctualityTrend)}
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {insights.lateArrivals || 0} late arrivals
                </span>
              </div>
            </div>

            <div
              className="p-4 rounded-xl border"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Patterns Detected</span>
                <Brain size={18} style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {insights.patternsDetected || 0}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  AI-analyzed
                </span>
              </div>
            </div>
          </div>

          {insights.anomalies && insights.anomalies.length > 0 && (
            <div
              className="p-4 rounded-xl border"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} style={{ color: "#fbbf24" }} />
                <h3 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Detected Anomalies
                </h3>
              </div>
              <div className="space-y-3">
                {insights.anomalies.map((anomaly, index) => {
                  const colors = getSeverityColor(anomaly.severity);
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg border"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium" style={{ color: colors.text }}>
                            {anomaly.title}
                          </p>
                          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                            {anomaly.description}
                          </p>
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full capitalize"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {anomaly.severity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {insights.patterns && insights.patterns.length > 0 && (
            <div
              className="p-4 rounded-xl border"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} style={{ color: "var(--color-primary)" }} />
                <h3 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  AI Detected Patterns
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.patterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "var(--color-bg-hover)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      />
                      <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {pattern.name}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      {pattern.description}
                    </p>
                    {pattern.confidence && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span style={{ color: "var(--color-text-muted)" }}>Confidence</span>
                          <span style={{ color: "var(--color-primary)" }}>{pattern.confidence}%</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pattern.confidence}%`,
                              backgroundColor: "var(--color-primary)",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.recommendations && insights.recommendations.length > 0 && (
            <div
              className="p-4 rounded-xl border"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Brain size={20} style={{ color: "#9333ea" }} />
                <h3 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  AI Recommendations
                </h3>
              </div>
              <div className="space-y-2">
                {insights.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: "var(--color-bg-hover)" }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {rec.title}
                      </p>
                      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {rec.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <Brain size={48} className="mx-auto mb-4 opacity-50" />
          <p>No insights available yet</p>
          <p className="text-sm mt-2">Check back after accumulating more attendance data</p>
        </div>
      )}
    </div>
  );
};

export default AIAttendanceInsights;
