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
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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
        const today = new Date().toISOString().split("T")[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];

        const [leaveRes, attRes] = await Promise.all([
          axios.get(`${API_BASE}/api/leaves?userId=${user?._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/api/attendance`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { from: firstDayOfMonth, to: today },
          }),
        ]);

        const leaves = leaveRes.data.leaves || [];
        const attendance = attRes.data.records || [];

        setStats({
          monthPresent: attendance.filter((a) => a.status === "Present").length,
          monthAbsent: attendance.filter((a) => a.status === "Absent").length,
          pendingLeaves: leaves.filter((l) => l.status === "Pending").length,
          approvedLeaves: leaves.filter((l) => l.status === "Approved").length,
        });
      } catch {
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
