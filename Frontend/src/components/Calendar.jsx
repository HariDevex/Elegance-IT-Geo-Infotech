import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import axios from "axios";
import { Skeleton } from "./Skeleton";
import API_BASE from "../config/api.js";

const Calendar = ({ onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const year = currentDate.getFullYear();

      const [holidaysRes, leavesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/holidays?year=${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/api/leaves?from=${year}-01-01&to=${year}-12-31`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (holidaysRes.data.success) {
        setHolidays(holidaysRes.data.holidays || []);
      }
      if (leavesRes.data.success) {
        setLeaves(leavesRes.data.leaves || []);
      }
    } catch { /* empty */ }
    finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    const dayEvents = [];

    holidays.forEach((h) => {
      if (h.date === dateStr) {
        dayEvents.push({
          type: "holiday",
          title: h.name,
          color: "bg-cyan-500",
        });
      }
    });

    leaves.forEach((l) => {
      const from = new Date(l.from).toISOString().split("T")[0];
      const to = new Date(l.to).toISOString().split("T")[0];
      if (dateStr >= from && dateStr <= to) {
        dayEvents.push({
          type: "leave",
          title: l.user?.name || "Leave",
          status: l.status,
          color: l.status === "Approved" ? "bg-blue-500" : l.status === "Pending" ? "bg-yellow-500" : "bg-rose-500",
        });
      }
    });

    return dayEvents;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <CalIcon className="text-indigo-400" size={20} />
          Calendar
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-white min-w-[140px] text-center">
            {monthYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="min-h-[48px] p-1 rounded-lg border border-transparent">
              <Skeleton variant="text" className="w-6 h-4 mx-auto" />
              <Skeleton variant="text" className="w-full h-3 mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            const events = getEventsForDate(date);
            const todayClass = isToday(date) ? "ring-2 ring-indigo-500" : "";

            return (
              <div
                key={idx}
                onClick={() => date && onDateClick?.(date)}
                className={`
                  min-h-[48px] p-1 rounded-lg border border-transparent
                  ${date ? "hover:bg-slate-700/50 cursor-pointer" : ""}
                  ${todayClass}
                  ${date && isToday(date) ? "bg-indigo-500/20" : ""}
                `}
              >
                {date && (
                  <>
                    <div className={`text-xs font-medium ${isToday(date) ? "text-indigo-400" : "text-slate-300"}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5 mt-0.5">
                      {events.slice(0, 2).map((event, i) => (
                        <div
                          key={i}
                          className={`text-[10px] px-1 py-0.5 rounded truncate text-white ${event.color}`}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-[10px] text-slate-400">
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-cyan-500"></div>
          <span className="text-slate-400">Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span className="text-slate-400">Approved Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-500"></div>
          <span className="text-slate-400">Pending Leave</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
