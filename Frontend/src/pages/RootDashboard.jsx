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
import PasswordResetManager from "../components/PasswordResetManager";
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
  SkeletonTable,
  SkeletonList,
} from "../components/skeletons";
import api from "../config/axios.js";


const RootDashboard = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [empRes, leaveRes, attRes] = await Promise.all([
          api.get(`/employees`, {
            params: { limit: 100 },
          }),
          api.get(`/leaves?status=Pending`),
          api.get(`/attendance`, {
            params: { date: new Date().toISOString().split("T")[0] },
          }),
        ]);

        const employees = empRes.data.users || [];
        const pendingLeaves = leaveRes.data.leaves || [];
        const todayAttendance = attRes.data.records || [];

        const presentCount = todayAttendance.filter((a) => a.status === "Present").length;
        const absentCount = todayAttendance.filter((a) => a.status === "Absent").length;

        const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];

        setStats({
          totalEmployees: employees.length,
          presentToday: presentCount,
          absentToday: absentCount,
          pendingLeaves: pendingLeaves.length,
          totalDepartments: departments.length,
          byRole: {
            developers: employees.filter((e) => e.role === "developer").length,
            teamleads: employees.filter((e) => e.role === "teamlead").length,
            admins: employees.filter((e) => ["admin", "manager"].includes(e.role)).length,
            hr: employees.filter((e) => e.role === "hr").length,
            root: employees.filter((e) => e.role === "root").length,
          },
        });
      } catch { /* empty */ }
    finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const getSkeletonForView = (view) => {
    const skeletonMap = {
      dashboard: <SkeletonDashboardHome />,
      employeesList: <SkeletonEmployeesList />,
      addEmployee: <SkeletonAddEmployee />,
      editEmployee: <SkeletonAddEmployee />,
      employeeDetails: <SkeletonProfileEdit />,
      leaves: <SkeletonLeavesList />,
      leaveCalendar: <SkeletonLeaveCalendar />,
      attendance: <SkeletonAttendance />,
      attendanceManage: <SkeletonAttendance />,
      profileEdit: <SkeletonProfileEdit />,
      holidays: <SkeletonHolidays />,
      announcementsList: <SkeletonAnnouncementsList />,
      addAnnouncement: <SkeletonProfileEdit />,
      activityLogs: <SkeletonTable rows={8} cols={5} />,
      loginLogs: <SkeletonTable rows={8} cols={4} />,
      passwordReset: <SkeletonList items={5} />,
      sessions: <SkeletonList items={5} />,
      checkin: <SkeletonAttendance />,
    };
    return skeletonMap[view] || <SkeletonDashboardHome />;
  };

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
      case "attendanceManage":
        return <AttendanceList />;
      case "checkin":
        return <CheckInOut />;
      case "addAnnouncement":
        return <AddAnnouncementForm onCreated={() => setCurrentView("announcementsList")} />;
      case "announcementsList":
        return <AnnouncementsList />;
      case "loginLogs":
        return <LoginLogs />;
      case "passwordReset":
        return <PasswordResetManager />;
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
      {loadingStats ? getSkeletonForView(currentView) : renderContent()}
    </DashboardLayout>
  );
};

export default RootDashboard;
