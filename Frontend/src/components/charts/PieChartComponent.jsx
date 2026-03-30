import { useState, useEffect } from "react";

const PieChartComponent = ({ data }) => {
  const [Charts, setCharts] = useState(null);

  useEffect(() => {
    import("recharts").then((module) => {
      setCharts({
        PieChart: module.PieChart,
        Pie: module.Pie,
        Cell: module.Cell,
        Tooltip: module.Tooltip,
        ResponsiveContainer: module.ResponsiveContainer,
      });
    });
  }, []);

  if (!Charts) {
    return <div className="h-64 animate-pulse bg-slate-800 rounded-lg" />;
  }

  const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = Charts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PieChartComponent;
