import { useState, useEffect } from "react";
import { Award, Calendar } from "lucide-react";
import { Skeleton, SkeletonGrid } from "./Skeleton";
import api from "../config/axios.js";

const LeaveBalance = ({ compact = false }) => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBalances = async () => {
    try {
      const res = await api.get("/leave-balance/balance");
      if (res.data.success) {
        setBalances(res.data.balances || []);
      }
    } catch (err) {
      console.error("Failed to fetch leave balances:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const getLeaveIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "annual": case "annual leave": return "🏖️";
      case "sick": case "sick leave": return "🏥";
      case "casual": case "casual leave": return "🌴";
      case "unpaid": case "unpaid leave": return "📋";
      default: return "📅";
    }
  };

  const getLeaveColor = (type) => {
    switch (type?.toLowerCase()) {
      case "annual": case "annual leave": return "from-blue-500 to-indigo-600";
      case "sick": case "sick leave": return "from-rose-500 to-pink-600";
      case "casual": case "casual leave": return "from-cyan-500 to-teal-600";
      case "unpaid": case "unpaid leave": return "from-slate-500 to-gray-600";
      default: return "from-indigo-500 to-purple-600";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="title" className="w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton variant="card" className="h-8 w-8" />
                <Skeleton variant="text" className="w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton variant="text" className="w-3/4" />
                <Skeleton variant="card" className="h-2 w-full" />
                <Skeleton variant="text" className="w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getLeaveBorderHover = (type) => {
    switch (type?.toLowerCase()) {
      case "annual": case "annual leave": return "hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]";
      case "sick": case "sick leave": return "hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]";
      case "casual": case "casual leave": return "hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]";
      case "unpaid": case "unpaid leave": return "hover:border-slate-500/40 hover:shadow-[0_0_20px_rgba(100,116,139,0.1)]";
      default: return "hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]";
    }
  };

  const getLeaveTextColor = (type) => {
    switch (type?.toLowerCase()) {
      case "annual": case "annual leave": return "text-cyan-400";
      case "sick": case "sick leave": return "text-rose-400";
      case "casual": case "casual leave": return "text-emerald-400";
      case "unpaid": case "unpaid leave": return "text-slate-400";
      default: return "text-indigo-400";
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {balances.map((b, idx) => (
          <div
            key={b._id ?? idx}
            className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${getLeaveColor(b.leaveType)} text-white text-xs font-semibold flex items-center gap-1.5 shadow-md`}
          >
            <span>{getLeaveIcon(b.leaveType)}</span>
            <span className="capitalize">{b.leaveType === "unpaid" ? "Unpaid" : b.leaveType}: {b.availableDays}d</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Award className="text-indigo-400" size={20} />
        Leave Balance
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.length === 0 ? (
          <div className="col-span-full text-center py-8 text-slate-400 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <Calendar size={32} className="mx-auto mb-2 opacity-40 text-slate-500" />
            <p className="text-sm font-medium">No leave balances configured</p>
          </div>
        ) : (
          balances.map((balance, idx) => {
            const leavePercent = Math.min((balance.availableDays / balance.totalDays) * 100, 100);
            return (
              <div
                key={balance._id ?? idx}
                className={`bg-slate-900/40 backdrop-blur-md border border-slate-700/80 rounded-2xl p-5 transition-all duration-300 transform hover:-translate-y-0.5 ${getLeaveBorderHover(balance.leaveType)}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-xl shadow-inner border border-slate-700/50">
                      {getLeaveIcon(balance.leaveType)}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-200 block">
                        {balance.leaveType === 'annual' ? 'Annual Leave' : 
                         balance.leaveType === 'sick' ? 'Sick Leave' :
                         balance.leaveType === 'casual' ? 'Casual Leave' :
                         balance.leaveType === 'unpaid' ? 'Unpaid Leave' :
                         balance.leaveType}
                      </span>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Leave Type</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400 font-medium">Available</span>
                    <span className={`text-xl font-bold tracking-tight ${getLeaveTextColor(balance.leaveType)}`}>
                      {balance.availableDays} <span className="text-xs font-normal text-slate-450">days</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden p-[1px] border border-slate-750">
                    <div
                      className={`bg-gradient-to-r ${getLeaveColor(balance.leaveType)} h-full rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${leavePercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs font-medium text-slate-500 pt-1 border-t border-slate-800/50">
                    <span>Used: <strong className="text-slate-400">{balance.usedDays}</strong></span>
                    <span>Total: <strong className="text-slate-450">{balance.totalDays}</strong></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LeaveBalance;
