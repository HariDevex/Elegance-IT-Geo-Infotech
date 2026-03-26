import { useState, useEffect } from "react";

const BarChartComponent = ({ data }) => {
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
      });
    });
  }, []);

  if (!Charts) {
    return <div className="h-64 animate-pulse bg-slate-800 rounded-lg" />;
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = Charts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" stroke="var(--color-text-muted)" />
        <YAxis stroke="var(--color-text-muted)" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        />
        <Bar dataKey="value" fill="#02f5a1" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
