import { useState, useEffect, Suspense } from "react";
import { useAuth } from "../context/authContext";
import DashboardLayout from "../components/DashboardLayout";
import ErrorBoundary from "../components/ErrorBoundary";
import ChatWindow from "../components/ChatWindow";
import EmployeeLeaves from "../components/EmployeeLeaves";
import EmployeeAttendanceView from "../components/EmployeeAttendanceView";
import AnnouncementsList from "../components/AnnouncementsList";
import ProfileEdit from "../components/ProfileEdit";
import EmployeeHome from "../components/EmployeeHome";
import CheckInOut from "../components/CheckInOut";
import HolidayManagement from "../components/HolidayManagement";
import LeaveCalendar from "../components/LeaveCalendar";
import { 
  SkeletonDashboardHome, 
  SkeletonLeavesList,
  SkeletonLeaveCalendar,
  SkeletonAttendance,
  SkeletonProfileEdit,
  SkeletonHolidays,
  SkeletonAnnouncementsList,
  SkeletonChat,
  SkeletonStatCard,
  SkeletonList,
  SkeletonTable,
} from "../components/skeletons";
import api from "../config/axios.js";


import { getProjectDateStr, getProjectTimeStr } from "../utils/dateUtils.js";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date();
        const todayStr = getProjectDateStr(today);
        const timestamp = Date.now();
        
        const [year, month] = todayStr.split("-").map(Number);
        
        const firstDayOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
        
        // Accurate last month boundaries
        let lmYear = year;
        let lmMonth = month - 1;
        if (lmMonth === 0) {
          lmMonth = 12;
          lmYear -= 1;
        }
        const lastMonthFirstDay = `${lmYear}-${String(lmMonth).padStart(2, "0")}-01`;
        const lastMonthLastDayDate = new Date(year, month - 1, 0); // Last day of month
        const lastMonthLastDay = getProjectDateStr(lastMonthLastDayDate);
        
        // Two months ago
        let tmaYear = lmYear;
        let tmaMonth = lmMonth - 1;
        if (tmaMonth === 0) {
          tmaMonth = 12;
          tmaYear -= 1;
        }
        const twoMonthsAgoFirstDay = `${tmaYear}-${String(tmaMonth).padStart(2, "0")}-01`;
        
        // Start of week (Monday)
        const startOfWeekDate = new Date(today);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeekDate.setDate(diff);
        const weekStartStr = getProjectDateStr(startOfWeekDate);

        const results = await Promise.allSettled([
          api.get(`/leaves`, { params: { userId: user?._id || user?.employeeId, _t: timestamp } }),
          api.get(`/attendance/my`, {
            params: { from: firstDayOfMonth, to: todayStr, _t: timestamp },
          }),
          api.get(`/attendance/my`, {
            params: { from: lastMonthFirstDay, to: lastMonthLastDay, _t: timestamp },
          }),
          api.get(`/attendance/my`, {
            params: { from: weekStartStr, to: todayStr, _t: timestamp },
          }),
          api.get(`/attendance/my`, {
            params: { from: twoMonthsAgoFirstDay, to: todayStr, _t: timestamp },
          }),
        ]);

        const leaves = results[0].status === 'fulfilled' ? (results[0].value.data.leaves || []) : [];
        const attendance = results[1].status === 'fulfilled' ? (results[1].value.data.records || []) : [];
        const lastMonthAttendance = results[2].status === 'fulfilled' ? (results[2].value.data.records || []) : [];
        const weekAttendance = results[3].status === 'fulfilled' ? (results[3].value.data.records || []) : [];
        const threeMonthsAttendance = results[4].status === 'fulfilled' ? (results[4].value.data.records || []) : [];

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
            
            // Just take the first checkin and last checkout for the chart
            const sessions = [...a.sessions].sort((x, y) => new Date(x.checkInAt) - new Date(y.checkInAt));
            const firstSession = sessions[0];
            const lastSession = [...sessions].reverse().find(s => s.checkOutAt);

            if (firstSession) {
              const time = new Date(firstSession.checkInAt);
              const h = time.getHours() + time.getMinutes() / 60;
              checkInOutMap[dayName] = {
                ...checkInOutMap[dayName],
                checkIn: getProjectTimeStr(time),
                checkInHour: h,
              };
            }
            if (lastSession) {
              const time = new Date(lastSession.checkOutAt);
              const h = time.getHours() + time.getMinutes() / 60;
              checkInOutMap[dayName] = {
                ...checkInOutMap[dayName],
                checkOut: getProjectTimeStr(time),
                checkOutHour: h,
              };
            }
          }
        });

        const monthlyStats = {};
        threeMonthsAttendance.forEach((a) => {
          const date = new Date(a.date);
          const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
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
          lastMonthAbsent: lastMonthAbsentCount(lastMonthAttendance),
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

    const lastMonthAbsentCount = (records) => {
       // Logic to count business days without checkins
       return records.filter((a) => !a.sessions || a.sessions.length === 0).length;
    };

    if (user?._id || user?.employeeId) {
      fetchStats();
    }
  }, [user]);

  const getSkeletonForView = (view) => {
    const skeletonMap = {
      dashboard: <SkeletonDashboardHome />,
      leaves: <SkeletonLeavesList />,
      leaveCalendar: <SkeletonLeaveCalendar />,
      attendance: <SkeletonAttendance />,
      profileEdit: <SkeletonProfileEdit />,
      holidays: <SkeletonHolidays />,
      announcementsList: <SkeletonAnnouncementsList />,
      announcements: <SkeletonAnnouncementsList />,
      checkin: <SkeletonStatCard />,
    };
    return skeletonMap[view] || <SkeletonDashboardHome />;
  };

  const renderContent = () => {
    let Component;
    let skeleton = getSkeletonForView(currentView);

    switch (currentView) {
      case "profileEdit":
        Component = <ProfileEdit onDone={() => setCurrentView("dashboard")} />;
        break;
      case "leaves":
        Component = <EmployeeLeaves />;
        break;
      case "attendance":
        Component = <EmployeeAttendanceView />;
        break;
      case "checkin":
        Component = <CheckInOut />;
        break;
      case "announcementsList":
      case "announcements":
        Component = <AnnouncementsList />;
        break;
      case "holidays":
        Component = <HolidayManagement />;
        break;
      case "leaveCalendar":
        Component = <LeaveCalendar />;
        break;
      default:
        Component = <EmployeeHome stats={stats} loading={loading} />;
        skeleton = null;
    }

    return (
      <ErrorBoundary key={currentView}>
        <div className="animate-fadeIn">
          {loading && skeleton ? skeleton : Component}
        </div>
      </ErrorBoundary>
    );
  };

  return (
    <DashboardLayout
      currentView={currentView}
      setCurrentView={setCurrentView}
      chatOpen={chatOpen}
      setChatOpen={setChatOpen}
      ChatComponent={loading ? <SkeletonChat /> : <ChatWindow />}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
