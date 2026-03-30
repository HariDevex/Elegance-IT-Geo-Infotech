import db from "../config/database.js";

class AILeavePredictor {
  async analyzeLeavePatterns(userId) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const leaves = await db("leaves")
      .where("user_id", userId)
      .where("created_at", ">", sixMonthsAgo)
      .orderBy("from_date", "asc");

    if (leaves.length < 3) {
      return {
        sufficientData: false,
        message: "Need at least 3 leave records for prediction",
      };
    }

    const leaveByMonth = {};
    const leaveByType = {};
    const dayOfWeek = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    for (const leave of leaves) {
      const month = new Date(leave.from_date).getMonth();
      leaveByMonth[month] = (leaveByMonth[month] || 0) + 1;

      leaveByType[leave.type] = (leaveByType[leave.type] || 0) + 1;

      const startDay = new Date(leave.from_date).getDay();
      const endDay = new Date(leave.to_date).getDay();
      dayOfWeek[startDay] = (dayOfWeek[startDay] || 0) + 1;
      if (startDay !== endDay) {
        dayOfWeek[endDay] = (dayOfWeek[endDay] || 0) + 1;
      }
    }

    const avgLeavePerMonth = leaves.length / 6;
    const mostCommonType = Object.entries(leaveByType)
      .sort((a, b) => b[1] - a[1])[0];

    const favoriteDays = Object.entries(dayOfWeek)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0)
      .slice(0, 2)
      .map(([day]) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]);

    return {
      sufficientData: true,
      stats: {
        totalLeaves: leaves.length,
        avgPerMonth: avgLeavePerMonth.toFixed(2),
        mostCommonType: mostCommonType?.[0] || "Unknown",
        favoriteDays,
        monthlyPattern: leaveByMonth,
      },
      predictions: await this.predictNextLeave(userId, leaves),
    };
  }

  async predictNextLeave(userId, recentLeaves) {
    if (recentLeaves.length < 3) return null;

    const lastLeave = recentLeaves[recentLeaves.length - 1];
    const lastLeaveDate = new Date(lastLeave.from_date);
    const avgDaysBetween = this.calculateAverageGap(recentLeaves);

    const nextPredicted = new Date(lastLeaveDate);
    nextPredicted.setDate(nextPredicted.getDate() + avgDaysBetween);

    const leaveBalance = await db("leave_balance")
      .where("user_id", userId)
      .first();

    const predictions = [];

    if (leaveBalance?.annual_leave > 0) {
      predictions.push({
        type: "Annual Leave",
        predictedDate: nextPredicted.toISOString().split("T")[0],
        confidence: this.calculateConfidence(recentLeaves.length),
        reason: "Based on your average leave frequency",
      });
    }

    const monthsWithHighLeave = this.findHighLeaveMonths(recentLeaves);
    if (monthsWithHighLeave.length > 0) {
      const currentMonth = new Date().getMonth();
      const nextHighMonth = monthsWithHighLeave.find(m => m > currentMonth) || monthsWithHighLeave[0];
      
      if (nextHighMonth !== undefined) {
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextHighMonth);
        predictions.push({
          type: "Any",
          predictedDate: nextMonthDate.toISOString().split("T")[0],
          confidence: 0.5,
          reason: `Historically high leave month (${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][nextHighMonth]})`,
        });
      }
    }

    return predictions;
  }

  calculateAverageGap(leaves) {
    let totalDays = 0;
    for (let i = 1; i < leaves.length; i++) {
      const prev = new Date(leaves[i - 1].from_date);
      const curr = new Date(leaves[i].from_date);
      totalDays += (curr - prev) / (1000 * 60 * 60 * 24);
    }
    return totalDays / (leaves.length - 1);
  }

  calculateConfidence(recordCount) {
    if (recordCount >= 10) return 0.9;
    if (recordCount >= 7) return 0.75;
    if (recordCount >= 5) return 0.6;
    if (recordCount >= 3) return 0.45;
    return 0.3;
  }

  findHighLeaveMonths(leaves) {
    const monthCounts = {};
    for (const leave of leaves) {
      const month = new Date(leave.from_date).getMonth();
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }

    const avg = leaves.length / 6;
    return Object.entries(monthCounts)
      .filter(([_, count]) => count > avg)
      .map(([month]) => parseInt(month));
  }

  async getTeamLeaveForecast(teamLeadId) {
    const teamMembers = await db("users")
      .where("team_lead_id", teamLeadId)
      .orWhere("manager_id", teamLeadId)
      .select("id", "name")
      .limit(20);

    const forecasts = await Promise.all(
      teamMembers.map(async (member) => {
        const pattern = await this.analyzeLeavePatterns(member.id);
        return {
          userId: member.id,
          name: member.name,
          ...pattern,
        };
      })
    );

    const upcomingLeaves = await db("leaves")
      .whereIn("user_id", teamMembers.map(m => m.id))
      .where("from_date", ">=", new Date().toISOString().split("T")[0])
      .where("status", "Approved")
      .orderBy("from_date", "asc")
      .limit(10)
      .join("users", "leaves.user_id", "users.id")
      .select(
        "leaves.id",
        "leaves.from_date",
        "leaves.to_date",
        "leaves.type",
        "users.name"
      );

    return {
      teamSize: teamMembers.length,
      patterns: forecasts.filter(f => f.sufficientData),
      upcomingLeaves,
      recommendation: this.generateTeamRecommendation(forecasts),
    };
  }

  generateTeamRecommendation(forecasts) {
    const highFrequency = forecasts.filter(
      f => f.sufficientData && parseFloat(f.stats.avgPerMonth) > 2
    );

    if (highFrequency.length > forecasts.length * 0.5) {
      return "High leave frequency detected across team. Consider discussing workload distribution.";
    }

    const lowBalance = forecasts.filter(
      f => !f.sufficientData
    );

    if (lowBalance.length > 0) {
      return `${lowBalance.length} team members have low leave records. Monitor for leave accumulation.`;
    }

    return "Team leave patterns appear normal.";
  }
}

const aiLeavePredictor = new AILeavePredictor();

export const getLeavePrediction = async (req, res) => {
  try {
    const { userId, teamView } = req.query;
    const requestingUser = req.user;

    if (teamView === "true" && ["root", "admin", "manager", "hr"].includes(requestingUser.role)) {
      const forecast = await aiLeavePredictor.getTeamLeaveForecast(requestingUser._id);
      return res.json({ success: true, data: forecast });
    }

    const targetUserId = userId && ["root", "admin", "manager"].includes(requestingUser.role)
      ? userId
      : requestingUser._id;

    const prediction = await aiLeavePredictor.analyzeLeavePatterns(targetUserId);
    res.json({ success: true, data: prediction });
  } catch (error) {
    console.error("Leave prediction error:", error);
    res.status(500).json({ success: false, error: "Failed to generate prediction" });
  }
};

export default aiLeavePredictor;
