import { useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import DashboardLayout from "../components/DashboardLayout";
import ChatWindow from "../components/ChatWindow";
import EmployeeLeaves from "../components/EmployeeLeaves";
import EmployeeAttendanceView from "../components/EmployeeAttendanceView";
import EmployeeAnnouncements from "../components/EmployeeAnnouncements";
import ProfileEdit from "../components/ProfileEdit";
import EmployeeHome from "../components/EmployeeHome";
import CheckInOut from "../components/CheckInOut";
import HolidayManagement from "../components/HolidayManagement";
import LeaveCalendar from "../components/LeaveCalendar";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const timestamp = Date.now();
        
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
        const lastMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0];
        const lastMonthFirstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0];
        const twoMonthsAgoFirstDay = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split("T")[0];
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        const weekStartStr = startOfWeek.toISOString().split("T")[0];

        const [leaveRes, attRes, lastMonthAttRes, weekAttRes, threeMonthsAttRes] = await Promise.all([
          axios.get(`${API_BASE}/api/leaves?userId=${user?._id}&_t=${timestamp}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/api/attendance/my`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { from: firstDayOfMonth, to: todayStr, _t: timestamp },
          }),
          axios.get(`${API_BASE}/api/attendance/my`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { from: lastMonthFirstDay, to: lastMonthLastDay, _t: timestamp },
          }),
          axios.get(`${API_BASE}/api/attendance/my`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { from: weekStartStr, to: todayStr, _t: timestamp },
          }),
          axios.get(`${API_BASE}/api/attendance/my`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { from: twoMonthsAgoFirstDay, to: todayStr, _t: timestamp },
          }),
        ]);

        const leaves = leaveRes.data.leaves || [];
        const attendance = attRes.data.records || [];
        const lastMonthAttendance = lastMonthAttRes.data.records || [];
        const weekAttendance = weekAttRes.data.records || [];
        const threeMonthsAttendance = threeMonthsAttRes.data.records || [];

        const weekMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        weekAttendance.forEach((a) => {
          const date = new Date(a.date);
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const dayName = days[date.getDay()];
          if (a.sessions && a.sessions.length > 0) weekMap[dayName] = 1;
        });

        const checkInOutMap = {};
        weekAttendance.forEach((a) => {
          if (a.sessions && a.sessions.length > 0) {
            const date = new Date(a.date);
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const dayName = days[date.getDay()];
            a.sessions.forEach(s => {
              if (s.checkInAt) {
                const time = new Date(s.checkInAt);
                const h = time.getHours() + time.getMinutes() / 60;
                checkInOutMap[dayName] = {
                  ...checkInOutMap[dayName],
                  checkIn: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  checkInHour: h,
                };
              }
              if (s.checkOutAt) {
                const time = new Date(s.checkOutAt);
                const h = time.getHours() + time.getMinutes() / 60;
                checkInOutMap[dayName] = {
                  ...checkInOutMap[dayName],
                  checkOut: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  checkOutHour: h,
                };
              }
            });
          }
        });

        const monthlyStats = {};
        threeMonthsAttendance.forEach((a) => {
          const date = new Date(a.date);
          const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { present: 0, absent: 0, total: 0 };
          }
          monthlyStats[monthKey].total++;
          if (a.sessions && a.sessions.length > 0) {
            monthlyStats[monthKey].present++;
          } else {
            monthlyStats[monthKey].absent++;
          }
        });

        const monthlyData = Object.entries(monthlyStats)
          .sort((a, b) => new Date(a[0]) - new Date(b[0]))
          .slice(-3)
          .map(([month, data]) => ({
            month,
            present: data.present,
            absent: data.absent,
            total: data.total
          }));

        setStats({
          monthPresent: attendance.filter((a) => a.sessions && a.sessions.length > 0).length,
          monthAbsent: attendance.filter((a) => !a.sessions || a.sessions.length === 0).length,
          lastMonthPresent: lastMonthAttendance.filter((a) => a.sessions && a.sessions.length > 0).length,
          lastMonthAbsent: lastMonthAttendance.filter((a) => !a.sessions || a.sessions.length === 0).length,
          pendingLeaves: leaves.filter((l) => l.status === "Pending").length,
          approvedLeaves: leaves.filter((l) => l.status === "Approved").length,
          weekAttendance: weekMap,
          checkInOut: checkInOutMap,
          monthlyAttendance: monthlyData,
        });
      } catch (err) {
        console.error("Stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchStats();
    }
  }, [user]);

  const renderContent = () => {
    switch (currentView) {
      case "profileEdit":
        return <ProfileEdit onDone={() => setCurrentView("dashboard")} />;
      case "leaves":
        return <EmployeeLeaves />;
      case "attendance":
        return <EmployeeAttendanceView />;
      case "checkin":
        return <CheckInOut />;
      case "announcementsList":
      case "announcements":
        return <EmployeeAnnouncements />;
      case "holidays":
        return <HolidayManagement />;
      case "leaveCalendar":
        return <LeaveCalendar />;
      default:
        return <EmployeeHome stats={stats} loading={loading} />;
    }
  };

  return (
    <DashboardLayout
      currentView={currentView}
      setCurrentView={setCurrentView}
      chatOpen={chatOpen}
      setChatOpen={setChatOpen}
      ChatComponent={<ChatWindow />}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
