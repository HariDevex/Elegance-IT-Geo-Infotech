import { Calendar as CalIcon, Clock, CheckCircle, XCircle, Grid3x3 } from "lucide-react";
import LeaveBalance from "./LeaveBalance";
import AttendanceBarChart from "./charts/AttendanceBarChart";
import CheckInOutChart from "./charts/CheckInOutChart";
import { Skeleton, SkeletonChart } from "./Skeleton";

const EmployeeHome = ({ stats, loading, user }) => {
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

  const thisMonthStatCards = [
    { label: "Present", value: stats?.monthPresent || 0, color: "#06b6d4", icon: CheckCircle },
    { label: "Absent", value: stats?.monthAbsent || 0, color: "#ef4444", icon: XCircle },
    { label: "Pending Leaves", value: stats?.pendingLeaves || 0, color: "#f59e0b", icon: Clock },
    { label: "Approved Leaves", value: stats?.approvedLeaves || 0, color: "#3b82f6", icon: CalIcon },
  ];

  const lastMonthStatCards = [
    { label: "Present", value: stats?.lastMonthPresent || 0, color: "#06b6d4", icon: CheckCircle },
    { label: "Absent", value: stats?.lastMonthAbsent || 0, color: "#ef4444", icon: XCircle },
    { label: "Total Days", value: (stats?.lastMonthPresent || 0) + (stats?.lastMonthAbsent || 0), color: "#8b5cf6", icon: Grid3x3 },
  ];

  const getWeekData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({ day, present: stats?.weekAttendance?.[day] || 0 }));
  };

  const getCheckInOutData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => {
      const dayData = stats?.checkInOut?.[day] || {};
      return {
        day,
        checkIn: dayData.checkIn || '09:00',
        checkOut: dayData.checkOut || '18:00',
        checkInHour: dayData.checkInHour || 9,
        checkOutHour: dayData.checkOutHour || 18,
      };
    });
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {thisMonthStatCards.map((stat, i) => (
          <div 
            key={`this-${i}`} 
            className="rounded-2xl p-5 border"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase" style={{ color: 'var(--color-text-muted)' }}>This Month - {stat.label}</p>
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {lastMonthStatCards.map((stat, i) => (
          <div 
            key={`last-${i}`} 
            className="rounded-2xl p-5 border"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase" style={{ color: 'var(--color-text-muted)' }}>Last Month - {stat.label}</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div 
          className="rounded-2xl p-6 border"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>This Week Attendance</h3>
          <div className="h-48">
            <AttendanceBarChart data={getWeekData()} />
          </div>
        </div>

        <div 
          className="rounded-2xl p-6 border"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Check In / Out Times</h3>
          <div className="h-48">
            <CheckInOutChart data={getCheckInOutData()} />
          </div>
        </div>
      </div>

      <LeaveBalance />
    </section>
  );
};

export default EmployeeHome;
