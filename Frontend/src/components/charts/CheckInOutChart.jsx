import { useState, useEffect } from "react";

const CheckInOutChart = ({ data }) => {
  const [Charts, setCharts] = useState(null);

  useEffect(() => {
    import("recharts").then((module) => {
      setCharts({
        LineChart: module.LineChart,
        Line: module.Line,
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

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = Charts;

  const chartData = data.map(d => ({
    ...d,
    checkInHour: d.checkInHour || 9,
    checkOutHour: d.checkOutHour || 18,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="day" stroke="var(--color-text-muted)" />
        <YAxis 
          stroke="var(--color-text-muted)"
          domain={[6, 22]}
          ticks={[6, 9, 12, 15, 18, 21]}
          tickFormatter={(v) => `${v}:00`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
          formatter={(value, name) => {
            const hours = Math.floor(value);
            const mins = Math.round((value - hours) * 60);
            return [`${hours}:${mins.toString().padStart(2, '0')}`, name === 'checkInHour' ? 'Check In' : 'Check Out'];
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="checkInHour" 
          stroke="#06b6d4" 
          strokeWidth={2}
          dot={{ fill: '#06b6d4', strokeWidth: 2 }}
          name="Check In"
          connectNulls
        />
        <Line 
          type="monotone" 
          dataKey="checkOutHour" 
          stroke="#f59e0b" 
          strokeWidth={2}
          dot={{ fill: '#f59e0b', strokeWidth: 2 }}
          name="Check Out"
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CheckInOutChart;
