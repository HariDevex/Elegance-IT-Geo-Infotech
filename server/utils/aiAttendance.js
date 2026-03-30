import db from "../config/database.js";

const DEFAULT_WORK_START = 9;
const DEFAULT_WORK_END = 18;
const LATE_THRESHOLD_MINUTES = 30;
const EARLY_LEAVE_THRESHOLD_MINUTES = 60;

class AIAttendanceAnalyzer {
  constructor() {
    this.userPatterns = new Map();
  }

  async analyzeUserPatterns(userId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendance = await db("attendance")
      .where("user_id", userId)
      .where("date", ">", thirtyDaysAgo.toISOString().split("T")[0])
      .orderBy("date", "asc");

    if (attendance.length < 5) {
      return { sufficientData: false };
    }

    const checkInTimes = attendance
      .filter(a => a.check_in_at)
      .map(a => new Date(a.check_in_at).getHours() + new Date(a.check_in_at).getMinutes() / 60);

    const checkOutTimes = attendance
      .filter(a => a.check_out_at)
      .map(a => new Date(a.check_out_at).getHours() + new Date(a.check_out_at).getMinutes() / 60);

    const avgCheckIn = checkInTimes.length > 0 
      ? checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length 
      : DEFAULT_WORK_START;

    const avgCheckOut = checkOutTimes.length > 0 
      ? checkOutTimes.reduce((a, b) => a + b, 0) / checkOutTimes.length 
      : DEFAULT_WORK_END;

    const lateDays = checkInTimes.filter(t => t > DEFAULT_WORK_START + LATE_THRESHOLD_MINUTES / 60).length;
    const earlyLeaveDays = checkOutTimes.filter(t => t < DEFAULT_WORK_END - EARLY_LEAVE_THRESHOLD_MINUTES / 60).length;
    const absentDays = attendance.filter(a => a.status === "Absent").length;

    const pattern = {
      avgCheckIn,
      avgCheckOut,
      lateDays,
      earlyLeaveDays,
      absentDays,
      totalDays: attendance.length,
      presentDays: attendance.filter(a => a.status === "Present").length,
      latePercentage: (lateDays / checkInTimes.length) * 100,
      earlyLeavePercentage: (earlyLeaveDays / checkOutTimes.length) * 100,
      absentPercentage: (absentDays / attendance.length) * 100,
    };

    this.userPatterns.set(userId, {
      pattern,
      lastUpdated: new Date(),
    });

    return {
      sufficientData: true,
      pattern,
      riskScore: this.calculateRiskScore(pattern),
    };
  }

  calculateRiskScore(pattern) {
    let score = 0;

    if (pattern.latePercentage > 30) score += 30;
    else if (pattern.latePercentage > 15) score += 15;

    if (pattern.earlyLeavePercentage > 30) score += 25;
    else if (pattern.earlyLeavePercentage > 15) score += 10;

    if (pattern.absentPercentage > 20) score += 35;
    else if (pattern.absentPercentage > 10) score += 20;

    return Math.min(100, score);
  }

  async detectTodayAnomaly(userId) {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    const todayRecord = await db("attendance")
      .where("user_id", userId)
      .where("date", today)
      .first();

    const pattern = this.userPatterns.get(userId);

    if (!pattern) {
      return { anomalyDetected: false, reason: "insufficient_data" };
    }

    const anomalies = [];

    if (!todayRecord && currentHour > DEFAULT_WORK_START + 1) {
      anomalies.push({
        type: "no_check_in",
        severity: "high",
        message: "User hasn't checked in yet today",
      });
    }

    if (todayRecord?.check_in_at) {
      const checkInHour = new Date(todayRecord.check_in_at).getHours() + 
        new Date(todayRecord.check_in_at).getMinutes() / 60;
      
      if (checkInHour > DEFAULT_WORK_START + LATE_THRESHOLD_MINUTES / 60) {
        const expectedTime = DEFAULT_WORK_START;
        const lateBy = Math.round((checkInHour - expectedTime) * 60);
        anomalies.push({
          type: "late_arrival",
          severity: "medium",
          message: `Arrived ${lateBy} minutes late`,
          minutesLate: lateBy,
        });
      }
    }

    if (todayRecord?.check_out_at) {
      const checkOutHour = new Date(todayRecord.check_out_at).getHours() + 
        new Date(todayRecord.check_out_at).getMinutes() / 60;
      
      if (checkOutHour < DEFAULT_WORK_END - EARLY_LEAVE_THRESHOLD_MINUTES / 60) {
        const earlyBy = Math.round((DEFAULT_WORK_END - checkOutHour) * 60);
        anomalies.push({
          type: "early_leave",
          severity: "medium",
          message: `Left ${earlyBy} minutes early`,
          minutesEarly: earlyBy,
        });
      }
    }

    return {
      anomalyDetected: anomalies.length > 0,
      anomalies,
      riskLevel: anomalies.some(a => a.severity === "high") ? "high" : 
                 anomalies.length > 0 ? "medium" : "normal",
    };
  }

  async getAttendanceSummary(userId) {
    const pattern = await this.analyzeUserPatterns(userId);
    const todayAnomaly = await this.detectTodayAnomaly(userId);

    return {
      userId,
      pattern: pattern.sufficientData ? pattern.pattern : null,
      riskScore: pattern.sufficientData ? pattern.riskScore : null,
      todayStatus: todayAnomaly,
      recommendation: this.getRecommendation(pattern.riskScore || 0),
    };
  }

  getRecommendation(riskScore) {
    if (riskScore >= 70) {
      return "CRITICAL: Immediate attention required. Consider direct conversation with employee.";
    }
    if (riskScore >= 40) {
      return "WARNING: Pattern indicates potential issues. Monitor closely.";
    }
    if (riskScore >= 20) {
      return "CAUTION: Some irregularities detected. Keep under observation.";
    }
    return "NORMAL: Attendance pattern is acceptable.";
  }

  async getTeamAttendanceOverview(teamLeadId) {
    const teamMembers = await db("users")
      .where("team_lead_id", teamLeadId)
      .orWhere("manager_id", teamLeadId)
      .select("id", "name", "role", "department");

    const overviews = await Promise.all(
      teamMembers.map(member => this.getAttendanceSummary(member.id))
    );

    const highRisk = overviews.filter(o => o.riskScore >= 40).length;
    const mediumRisk = overviews.filter(o => o.riskScore >= 20 && o.riskScore < 40).length;

    return {
      totalMembers: teamMembers.length,
      highRisk,
      mediumRisk,
      normal: teamMembers.length - highRisk - mediumRisk,
      members: overviews,
    };
  }
}

const aiAttendance = new AIAttendanceAnalyzer();

export const getAttendanceInsights = async (req, res) => {
  try {
    const { userId, teamView } = req.query;
    const requestingUser = req.user;

    if (teamView === "true" && ["root", "admin", "manager", "hr"].includes(requestingUser.role)) {
      const overview = await aiAttendance.getTeamAttendanceOverview(requestingUser._id);
      return res.json({ success: true, data: overview });
    }

    if (userId && ["root", "admin", "manager"].includes(requestingUser.role)) {
      const summary = await aiAttendance.getAttendanceSummary(userId);
      return res.json({ success: true, data: summary });
    }

    const summary = await aiAttendance.getAttendanceSummary(requestingUser._id);
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Attendance insights error:", error);
    res.status(500).json({ success: false, error: "Failed to generate insights" });
  }
};

export default aiAttendance;
