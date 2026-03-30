import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import API_BASE from "../config/api.js";

const LeaveCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const year = currentDate.getFullYear();

      const [leavesRes, holidaysRes] = await Promise.all([
        axios.get(`${API_BASE}/api/leaves?status=Approved`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/api/holidays?year=${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (leavesRes.data.success) {
        setLeaves(leavesRes.data.leaves || []);
      }
      if (holidaysRes.data.success) {
        setHolidays(holidaysRes.data.holidays || []);
      }
    } catch {
      toast.error("Failed to fetch data");
    } finally {
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
      days.push({ date: null, leaves: [], holidays: [] });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDay = new Date(year, month, i);
      const dayLeaves = [];
      const dayHolidays = [];

      leaves.forEach((leave) => {
        const from = new Date(leave.from);
        const to = new Date(leave.to);
        if (currentDay >= from && currentDay <= to) {
          dayLeaves.push(leave);
        }
      });

      holidays.forEach((holiday) => {
        const holidayDate = new Date(holiday.date);
        if (holidayDate.toDateString() === currentDay.toDateString()) {
          dayHolidays.push(holiday);
        }
      });

      days.push({
        date: currentDay,
        leaves: dayLeaves,
        holidays: dayHolidays,
      });
    }

    return days;
  };

  const getLeaveTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case "annual leave": return "bg-blue-500";
      case "sick leave": return "bg-rose-500";
      case "casual leave": return "bg-cyan-500";
      default: return "bg-slate-500";
    }
  };

  const isToday = (date) => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <CalIcon className="text-indigo-400" />
          Leave Calendar
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-medium min-w-[160px] text-center">
            {monthYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
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
              <div key={i} className="h-16 bg-slate-700/30 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const hasLeaves = day.leaves?.length > 0;
              const hasHolidays = day.holidays?.length > 0;
              const isWeekend = day.date ? [0, 6].includes(day.date.getDay()) : false;

              return (
                <div
                  key={idx}
                  onClick={() => day.date && setSelectedDate(day)}
                  className={`
                    min-h-16 p-1 rounded-lg border transition-all cursor-pointer
                    ${!day.date ? "border-transparent" : "border-slate-700 hover:border-slate-500"}
                    ${isToday(day.date) ? "ring-2 ring-indigo-500" : ""}
                    ${hasHolidays ? "bg-cyan-500/10 border-cyan-500/30" : ""}
                    ${hasLeaves && !hasHolidays ? "bg-blue-500/10 border-blue-500/30" : ""}
                    ${isWeekend && !hasLeaves && !hasHolidays ? "bg-slate-700/20" : ""}
                  `}
                >
                  {day.date && (
                    <>
                      <div className={`text-xs font-medium ${isToday(day.date) ? "text-indigo-400" : "text-slate-300"}`}>
                        {day.date.getDate()}
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {day.holidays?.slice(0, 1).map((h, i) => (
                          <div key={i} className="text-[9px] px-1 py-0.5 rounded bg-cyan-500 text-white truncate" title={h.name}>
                            {h.name}
                          </div>
                        ))}
                        {day.leaves?.slice(0, 2).map((l, i) => (
                          <div
                            key={i}
                            className={`text-[9px] px-1 py-0.5 rounded text-white truncate ${getLeaveTypeColor(l.type)}`}
                            title={`${l.user?.name} - ${l.type}`}
                          >
                            {l.user?.name?.split(" ")[0]}
                          </div>
                        ))}
                        {(day.leaves?.length > 2 || day.holidays?.length > 1) && (
                          <div className="text-[9px] text-slate-400">
                            +{((day.leaves?.length || 0) + (day.holidays?.length || 0) - 1)}
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
      </div>

      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">
              {selectedDate.date?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h3>

            {selectedDate.holidays?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-cyan-400 mb-2">Holidays</h4>
                {selectedDate.holidays.map((h, i) => (
                  <div key={i} className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    {h.name} ({h.type})
                  </div>
                ))}
              </div>
            )}

            {selectedDate.leaves?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-2">Leaves</h4>
                {selectedDate.leaves.map((l, i) => (
                  <div key={i} className="text-sm text-slate-300 flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${getLeaveTypeColor(l.type)}`} />
                    {l.user?.name} - {l.type}
                  </div>
                ))}
              </div>
            )}

            {selectedDate.leaves?.length === 0 && selectedDate.holidays?.length === 0 && (
              <p className="text-slate-400 text-sm">No events on this day</p>
            )}

            <button
              onClick={() => setSelectedDate(null)}
              className="mt-4 w-full py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-slate-400">Approved Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-cyan-500" />
          <span className="text-slate-400">Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-600" />
          <span className="text-slate-400">Weekend</span>
        </div>
      </div>
    </div>
  );
};

export default LeaveCalendar;
