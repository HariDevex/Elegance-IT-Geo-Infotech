import { Calendar as CalIcon, Clock, CheckCircle, XCircle } from "lucide-react";
import LeaveBalance from "./LeaveBalance";
import AttendanceBarChart from "./charts/AttendanceBarChart";
import { Skeleton, SkeletonChart } from "./Skeleton";

const EmployeeHome = ({ stats, loading }) => {
  const weekData = [
    { day: "Mon", present: 1 },
    { day: "Tue", present: 1 },
    { day: "Wed", present: 1 },
    { day: "Thu", present: 1 },
    { day: "Fri", present: 1 },
    { day: "Sat", present: 0 },
    { day: "Sun", present: 0 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton variant="text" className="w-24" />
                  <Skeleton variant="title" className="w-16" />
                </div>
                <Skeleton variant="card" className="h-12 w-12" />
              </div>
            </div>
          ))}
        </div>
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  const statCards = [
    { label: "Present This Month", value: stats?.monthPresent || 0, color: "#06b6d4", icon: CheckCircle },
    { label: "Absent This Month", value: stats?.monthAbsent || 0, color: "#ef4444", icon: XCircle },
    { label: "Pending Leaves", value: stats?.pendingLeaves || 0, color: "#f59e0b", icon: Clock },
    { label: "Approved Leaves", value: stats?.approvedLeaves || 0, color: "#3b82f6", icon: CalIcon },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div 
            key={i} 
            className="rounded-2xl p-5 border"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
              </div>
              <div 
                className="h-12 w-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon size={24} style={{ color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div 
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>This Week Attendance</h3>
        <div className="h-48">
          <AttendanceBarChart data={weekData} />
        </div>
      </div>

      <LeaveBalance />
    </section>
  );
};

export default EmployeeHome;
