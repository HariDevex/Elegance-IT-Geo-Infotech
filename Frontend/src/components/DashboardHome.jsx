import { memo } from "react";
import LeaveBalance from "./LeaveBalance";
import LeaveCalendar from "./LeaveCalendar";
import Celebrations from "./Celebrations";
import BarChartComponent from "./charts/BarChartComponent";
import PieChartComponent from "./charts/PieChartComponent";
import { Skeleton, SkeletonChart } from "./Skeleton";

const statsCards = [
  { label: "Total Employees", key: "totalEmployees", color: "#06b6d4" },
  { label: "Present Today", key: "presentToday", color: "#06b6d4" },
  { label: "Absent Today", key: "absentToday", color: "#ef4444" },
  { label: "Pending Leaves", key: "pendingLeaves", color: "#f59e0b" },
  { label: "Departments", key: "totalDepartments", color: "#3b82f6" },
];

const StatCard = memo(({ label, value, color }) => (
  <div 
    className="relative overflow-hidden rounded-2xl border p-4 shadow-lg"
    style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
  >
    <div 
      className="absolute inset-0 opacity-10"
      style={{ backgroundColor: color }}
    />
    <div className="relative flex flex-col gap-2">
      <p className="text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value || 0}</p>
    </div>
  </div>
));

const DashboardHome = ({ stats, loading }) => {
  const roleData = stats
    ? [
        { name: "Developers", value: stats.byRole?.developers || 0 },
        { name: "Team Leads", value: stats.byRole?.teamleads || 0 },
        { name: "Managers", value: stats.byRole?.managers || 0 },
        { name: "HR", value: stats.byRole?.hr || 0 },
      ]
    : [];

  const pieData = [
    { name: "Present", value: stats?.presentToday || 0, color: "#06b6d4" },
    { name: "Absent", value: stats?.absentToday || 0, color: "#ef4444" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border p-4" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <Skeleton variant="text" className="w-1/2 mb-2" />
              <Skeleton variant="title" className="w-3/4" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonChart />
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statsCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={stats?.[card.key]}
            color={card.color}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div 
          className="rounded-2xl border p-6 shadow-lg"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Employee Distribution</h3>
          <div className="h-64">
            <BarChartComponent data={roleData} />
          </div>
        </div>

        <div 
          className="rounded-2xl border p-6 shadow-lg"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Today's Attendance</h3>
          <div className="flex items-center justify-center h-64">
            <div className="relative w-40 h-40">
              <PieChartComponent data={pieData} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats?.presentToday || 0}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Present</span>
              </div>
            </div>
            <div className="ml-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#06b6d4' }} />
                <span style={{ color: 'var(--color-text-secondary)' }}>Present: {stats?.presentToday || 0}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span style={{ color: 'var(--color-text-secondary)' }}>Absent: {stats?.absentToday || 0}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-border)' }} />
                <span style={{ color: 'var(--color-text-secondary)' }}>Total: {stats?.totalEmployees || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LeaveBalance />

      <div className="grid gap-6 lg:grid-cols-2">
        <LeaveCalendar />
        <Celebrations />
      </div>
    </section>
  );
};

export default DashboardHome;
