import { useState, useEffect } from "react";

const MonthlyAttendanceChart = ({ data }) => {
  const [Charts, setCharts] = useState(null);

  useEffect(() => {
    import("recharts").then((module) => {
      setCharts({
        BarChart: module.BarChart,
        Bar: module.Bar,
        XAxis: module.XAxis,
        YAxis: module.YAxis,
        CartesianGrid: module.CartesianGrid,
        Tooltip: module.Tooltip,
        ResponsiveContainer: module.ResponsiveContainer,
        Legend: module.Legend,
      });
    });
  }, []);

  if (!Charts) {
    return <div className="h-64 animate-pulse bg-slate-800 rounded-lg" />;
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = Charts;

  const chartData = data.map(d => ({
    month: d.month.split(" ")[0],
    Present: d.present,
    Absent: d.absent,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" stroke="var(--color-text-muted)" />
        <YAxis stroke="var(--color-text-muted)" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
          formatter={(value, name) => [value, name === 'Present' ? 'Present' : 'Absent']}
        />
        <Legend />
        <Bar dataKey="Present" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Present" />
        <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyAttendanceChart;
