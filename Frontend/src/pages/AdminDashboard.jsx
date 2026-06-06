import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ChatWindow from "../components/ChatWindow";
import AddEmployeeForm from "../components/AddEmployeeForm";
import EmployeesList from "../components/EmployeesList";
import EmployeeDetails from "../components/EmployeeDetails";
import LeavesList from "../components/LeavesList";
import AttendanceList from "../components/AttendanceList";
import EditEmployeeForm from "../components/EditEmployeeForm";
import AddAnnouncementForm from "../components/AddAnnouncementForm";
import AnnouncementsList from "../components/AnnouncementsList";
import ProfileEdit from "../components/ProfileEdit";
import DashboardHome from "../components/DashboardHome";
import HolidayManagement from "../components/HolidayManagement";
import LeaveCalendar from "../components/LeaveCalendar";
import ActivityLog from "../components/ActivityLog";
import CheckInOut from "../components/CheckInOut";
import LoginLogs from "../components/LoginLogs";
import SessionManagement from "../components/SessionManagement";
import { 
  SkeletonDashboardHome, 
  SkeletonEmployeesList, 
  SkeletonLeavesList,
  SkeletonLeaveCalendar,
  SkeletonAttendance,
  SkeletonProfileEdit,
  SkeletonAddEmployee,
  SkeletonHolidays,
  SkeletonAnnouncementsList,
  SkeletonChat,
  Skeleton,
  SkeletonForm,
  SkeletonTable,
  SkeletonList,
  SkeletonStatCard
} from "../components/skeletons";
import api from "../config/axios.js";
import { getProjectDateStr } from "../utils/dateUtils.js";

const AdminDashboard = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const todayStr = getProjectDateStr();
        
        const results = await Promise.allSettled([
          api.get(`/employees`, { params: { limit: 500 } }),
          api.get(`/leaves`, { params: { status: "Pending" } }),
          api.get(`/attendance`, { params: { date: todayStr } }),
        ]);

        const employees = results[0].status === 'fulfilled' ? (results[0].value.data.users || []) : [];
        const pendingLeaves = results[1].status === 'fulfilled' ? (results[1].value.data.leaves || []) : [];
        const todayAttendance = results[2].status === 'fulfilled' ? (results[2].value.data.records || []) : [];

        // Uniform present count across all dashboards
        const presentCount = todayAttendance.filter((a) => 
          ["On Time", "Late", "Present"].includes(a.status)
        ).length;
        
        const absentCount = employees.length > 0 ? employees.length - presentCount : 0;

        const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];

        setStats({
          totalEmployees: employees.length,
          presentToday: presentCount,
          absentToday: Math.max(0, absentCount),
          pendingLeaves: pendingLeaves.length,
          totalDepartments: departments.length,
          byRole: {
            developers: employees.filter((e) => e.role === "developer").length,
            teamleads: employees.filter((e) => e.role === "teamlead").length,
            admins: employees.filter((e) => ["admin", "manager"].includes(e.role)).length,
            hr: employees.filter((e) => e.role === "hr").length,
          },
        });
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case "profileEdit":
        return <ProfileEdit onDone={() => setCurrentView("dashboard")} />;
      case "addEmployee":
        return <AddEmployeeForm />;
      case "employeesList":
        return (
          <EmployeesList
            onAddNew={() => setCurrentView("addEmployee")}
            onView={(emp) => {
              setSelectedEmployee(emp);
              setCurrentView("employeeDetails");
            }}
            onEdit={(emp) => {
              setSelectedEmployee(emp);
              setCurrentView("editEmployee");
            }}
          />
        );
      case "editEmployee":
        return selectedEmployee ? (
          <EditEmployeeForm
            employee={selectedEmployee}
            onDone={() => {
              setCurrentView("employeesList");
              setSelectedEmployee(null);
            }}
          />
        ) : null;
      case "employeeDetails":
        return selectedEmployee ? (
          <EmployeeDetails
            employee={selectedEmployee}
            onBack={() => {
              setCurrentView("employeesList");
              setSelectedEmployee(null);
            }}
          />
        ) : null;
      case "leaves":
        return <LeavesList />;
      case "holidays":
        return <HolidayManagement />;
      case "leaveCalendar":
        return <LeaveCalendar />;
      case "activityLogs":
        return <ActivityLog />;
      case "attendance":
        return <AttendanceList />;
      case "checkin":
        return <CheckInOut />;
      case "addAnnouncement":
        return <AddAnnouncementForm onCreated={() => setCurrentView("announcementsList")} />;
      case "announcementsList":
        return <AnnouncementsList />;
      case "loginLogs":
        return <LoginLogs />;
      case "sessions":
        return <SessionManagement />;
      default:
        return <DashboardHome stats={stats} loading={loadingStats} />;
    }
  };

  return (
    <DashboardLayout
      currentView={currentView}
      setCurrentView={setCurrentView}
      chatOpen={chatOpen}
      setChatOpen={setChatOpen}
      ChatComponent={loadingStats ? <SkeletonChat /> : <ChatWindow />}
    >
      {loadingStats ? <SkeletonDashboardHome /> : renderContent()}
    </DashboardLayout>
  );
};

export default AdminDashboard;
