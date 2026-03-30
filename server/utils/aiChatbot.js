import db from "../config/database.js";

const HR_KNOWLEDGE_BASE = {
  leave: {
    keywords: ["leave", "vacation", "holiday", "time off", "absent", "sick"],
    response: "You can apply for leaves through the Leaves section. We offer Annual Leave, Sick Leave, Casual Leave, and Unpaid Leave. Submit your request at least 2 days in advance for planned leaves.",
  },
  leave_balance: {
    keywords: ["balance", "remaining", "how many", "quota", "entitled"],
    response: "You can check your leave balance in the Leave Balance section. Annual Leave: 18 days/year, Sick Leave: 10 days/year, Casual Leave: 6 days/year.",
  },
  salary: {
    keywords: ["salary", "pay", "wage", "compensation", "payroll", "bonus"],
    response: "Salary information is confidential. Please contact HR or your manager for specific salary inquiries. You can view your payslip if available in the documents section.",
  },
  attendance: {
    keywords: ["attendance", "check in", "check out", "present", "absent", "late"],
    response: "You can mark attendance through the Check-In/Check-Out feature. Make sure to check in by 9:00 AM. Late arrivals beyond 9:30 AM are marked as late.",
  },
  password: {
    keywords: ["password", "reset", "change", "forgot", "login"],
    response: "You can reset your password using the 'Forgot Password' link on the login page. For security, passwords expire every 90 days for admin roles.",
  },
  profile: {
    keywords: ["profile", "information", "details", "edit", "update"],
    response: "You can update your profile by clicking on your name in the top right corner and selecting 'Edit Profile'. You can update your contact info, profile picture, and other details.",
  },
  holidays: {
    keywords: ["holiday", "festival", "public", "closed"],
    response: "Company holidays are listed in the Holidays section. You can view the complete holiday calendar there.",
  },
  announcement: {
    keywords: ["announcement", "notice", "news", "update", "message"],
    response: "Check the Announcements section for company-wide updates and news. You can also enable notifications to stay informed.",
  },
  overtime: {
    keywords: ["overtime", "extra hours", "work late", "extend"],
    response: "Overtime requires prior approval from your manager. Please discuss with your team lead or manager for overtime work arrangements.",
  },
  benefits: {
    keywords: ["benefit", "insurance", "health", "medical", "policy"],
    response: "For benefits information including health insurance and other perks, please contact the HR department directly.",
  },
  resignation: {
    keywords: ["resign", "quit", "notice period", "exit"],
    response: "If you're considering resignation, please discuss with your manager and HR. The standard notice period is 30 days. You'll need to complete an exit interview.",
  },
  attendance_policy: {
    keywords: ["policy", "rules", "guidelines", "rules"],
    response: "Our attendance policy requires check-in by 9:00 AM. Late arrivals are tracked. Frequent absences may require documentation. Please refer to the employee handbook for full details.",
  },
  work_timing: {
    keywords: ["timing", "work hours", "start time", "end time", "shift"],
    response: "Standard work hours are 9:00 AM to 6:00 PM, Monday to Friday. Flexible timing may be available with manager approval.",
  },
  team: {
    keywords: ["team", "colleague", "coworker", "manager", "lead", "hr"],
    response: "You can view your team members in the Employees section. Your manager and team lead information is available on your dashboard.",
  },
  training: {
    keywords: ["training", "learning", "development", "course", "skill"],
    response: "For training and development opportunities, please check with your manager or HR. We offer various skill development programs.",
  },
};

const GREETINGS = [
  "Hello! I'm your HR Assistant. How can I help you today?",
  "Hi there! I can help you with leave, attendance, and other HR questions.",
  "Welcome! Ask me anything about company policies or HR matters.",
];

const FALLBACK_RESPONSE = "I'm not sure about that. You can try asking about:\n• Leave and holidays\n• Attendance and check-in\n• Password and login\n• Profile updates\n• Company policies\n\nOr contact HR for more specific questions.";

class AIChatbot {
  constructor() {
    this.conversationHistory = new Map();
    this.sessionTimeout = 30 * 60 * 1000;
  }

  analyzeQuery(query) {
    const lowerQuery = query.toLowerCase();
    let bestMatch = null;
    let maxScore = 0;

    for (const [key, data] of Object.entries(HR_KNOWLEDGE_BASE)) {
      let score = 0;
      for (const keyword of data.keywords) {
        if (lowerQuery.includes(keyword)) {
          score += keyword.length;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = { key, ...data };
      }
    }

    return { match: bestMatch, confidence: maxScore };
  }

  async getPersonalizedResponse(query, userId) {
    const { match } = this.analyzeQuery(query);
    let response = match?.response || FALLBACK_RESPONSE;

    const lowerQuery = query.toLowerCase();

    if (match?.key === "leave_balance") {
      const balances = await this.getUserLeaveBalance(userId);
      response += `\n\nYour current balances:\n• Annual Leave: ${balances.annual} days\n• Sick Leave: ${balances.sick} days\n• Casual Leave: ${balances.casual} days`;
    }

    if (match?.key === "attendance") {
      const todayAttendance = await this.getTodayAttendance(userId);
      if (todayAttendance) {
        const status = todayAttendance.status || "Not marked";
        const checkIn = todayAttendance.check_in_at 
          ? new Date(todayAttendance.check_in_at).toLocaleTimeString() 
          : "Not checked in";
        response += `\n\nToday's Status: ${status}\nCheck-in: ${checkIn}`;
      }
    }

    if (lowerQuery.includes("who are you") || lowerQuery.includes("what are you")) {
      return "I'm an AI HR Assistant for this employee management system. I can help you with leave queries, attendance information, company policies, and more!";
    }

    if (lowerQuery.includes("thank")) {
      return "You're welcome! Is there anything else I can help you with?";
    }

    if (lowerQuery.includes("hello") || lowerQuery.includes("hi") || lowerQuery.includes("hey")) {
      return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    }

    return response;
  }

  async getUserLeaveBalance(userId) {
    try {
      const balance = await db("leave_balance")
        .where("user_id", userId)
        .first();

      return {
        annual: balance?.annual_leave || 0,
        sick: balance?.sick_leave || 0,
        casual: balance?.casual_leave || 0,
      };
    } catch (error) {
      return { annual: 0, sick: 0, casual: 0 };
    }
  }

  async getTodayAttendance(userId) {
    try {
      const today = new Date().toISOString().split("T")[0];
      return await db("attendance")
        .where("user_id", userId)
        .where("date", today)
        .first();
    } catch (error) {
      return null;
    }
  }

  async chat(req, res) {
    try {
      const { message, conversationId } = req.body;
      const userId = req.user._id;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Message is required",
        });
      }

      const sessionKey = conversationId || `session_${userId}`;
      const history = this.conversationHistory.get(sessionKey) || [];

      if (history.length === 0) {
        history.push({
          role: "assistant",
          content: GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
        });
      }

      history.push({
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });

      const response = await this.getPersonalizedResponse(message, userId);

      history.push({
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      });

      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      this.conversationHistory.set(sessionKey, history);

      const now = Date.now();
      for (const [key, value] of this.conversationHistory.entries()) {
        const lastMessage = value[value.length - 1];
        if (lastMessage && now - new Date(lastMessage.timestamp).getTime() > this.sessionTimeout) {
          this.conversationHistory.delete(key);
        }
      }

      res.json({
        success: true,
        response: {
          message: response,
          conversationId: sessionKey,
          suggestions: this.getSuggestions(message),
        },
      });
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process message",
      });
    }
  }

  getSuggestions(lastMessage) {
    const suggestions = [
      "How many leave days do I have?",
      "What are the company holidays?",
      "How do I check my attendance?",
      "What's the work timing?",
    ];

    const lower = lastMessage.toLowerCase();
    
    if (lower.includes("leave")) {
      return [
        "How many leave days do I have?",
        "How do I apply for leave?",
        "What are the leave types?",
      ];
    }
    
    if (lower.includes("attendance")) {
      return [
        "How do I check in?",
        "What's the attendance policy?",
        "Check my today's status",
      ];
    }

    return suggestions;
  }

  async clearConversation(conversationId, userId) {
    const sessionKey = conversationId || `session_${userId}`;
    this.conversationHistory.delete(sessionKey);
    return { success: true, message: "Conversation cleared" };
  }
}

const chatbot = new AIChatbot();

export const handleChat = (req, res) => chatbot.chat(req, res);

export const clearChat = async (req, res) => {
  const { conversationId } = req.params;
  const result = await chatbot.clearConversation(conversationId, req.user._id);
  res.json(result);
};

export default chatbot;
