import { useState, useEffect } from "react";
import { Cake, Gift, Calendar } from "lucide-react";
import axios from "axios";
import API_BASE from "../config/api.js";

const Celebrations = () => {
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCelebrations();
  }, []);

  const fetchCelebrations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/employees?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const employees = res.data.users || [];
        const today = new Date();

        const celebrations = [];

        employees.forEach((emp) => {
          if (emp.dob) {
            const dob = new Date(emp.dob);
            const dobMonth = dob.getMonth();
            const dobDay = dob.getDate();

            const thisYearBirthday = new Date(today.getFullYear(), dobMonth, dobDay);
            let daysUntil = Math.ceil((thisYearBirthday - today) / (1000 * 60 * 60 * 24));

            if (daysUntil < 0) {
              const nextYearBirthday = new Date(today.getFullYear() + 1, dobMonth, dobDay);
              daysUntil = Math.ceil((nextYearBirthday - today) / (1000 * 60 * 60 * 24));
            }

            celebrations.push({
              type: "birthday",
              name: emp.name,
              date: thisYearBirthday,
              daysUntil,
              userId: emp._id,
            });
          }

          if (emp.createdAt) {
            const joinDate = new Date(emp.createdAt);
            const joinMonth = joinDate.getMonth();
            const joinDay = joinDate.getDate();
            const anniversaryDate = new Date(today.getFullYear(), joinMonth, joinDay);
            let daysUntil = Math.ceil((anniversaryDate - today) / (1000 * 60 * 60 * 24));
            const yearsWorked = today.getFullYear() - joinDate.getFullYear();

            if (daysUntil < 0) {
              const nextAnniversary = new Date(today.getFullYear() + 1, joinMonth, joinDay);
              daysUntil = Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
            }

            if (yearsWorked >= 1) {
              celebrations.push({
                type: "anniversary",
                name: emp.name,
                date: anniversaryDate,
                daysUntil,
                yearsWorked,
                userId: emp._id,
              });
            }
          }
        });

        celebrations.sort((a, b) => a.daysUntil - b.daysUntil);
        setUpcoming(celebrations.slice(0, 10));
      }
    } catch { /* empty */ }
    finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (daysUntil) => {
    if (daysUntil === 0) return "bg-rose-500 text-white";
    if (daysUntil <= 3) return "bg-yellow-500 text-black";
    if (daysUntil <= 7) return "bg-indigo-500 text-white";
    return "bg-slate-600 text-slate-300";
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-700/50 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Cake className="text-rose-400" size={20} />
        Upcoming Celebrations
      </h3>

      {upcoming.length === 0 ? (
        <div className="text-center py-8 text-slate-400 bg-slate-800/40 rounded-xl border border-slate-700">
          <Calendar size={32} className="mx-auto mb-2 opacity-50" />
          <p>No upcoming celebrations</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  item.type === "birthday" ? "bg-rose-500/20 text-rose-400" : "bg-indigo-500/20 text-indigo-400"
                }`}>
                  {item.type === "birthday" ? <Cake size={20} /> : <Gift size={20} />}
                </div>
                <div>
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-sm text-slate-400">
                    {item.type === "birthday" ? "Birthday" : `${item.yearsWorked} Year${item.yearsWorked > 1 ? "s" : ""} Anniversary`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.daysUntil)}`}>
                  {item.daysUntil === 0 ? "Today!" : item.daysUntil === 1 ? "Tomorrow" : `In ${item.daysUntil} days`}
                </span>
                <p className="text-xs text-slate-500 mt-1">{formatDate(item.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Celebrations;
