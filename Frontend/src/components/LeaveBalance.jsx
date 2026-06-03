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

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {balances.map((b, idx) => (
          <div
            key={b._id ?? idx}
            className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${getLeaveColor(b.leaveType)} text-white text-xs font-medium flex items-center gap-1.5`}
          >
            <span>{getLeaveIcon(b.leaveType)}</span>
            <span className="capitalize">{b.leaveType}: {b.availableDays}</span>
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
          <div className="col-span-full text-center py-8 text-slate-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-50" />
            <p>No leave balances configured</p>
          </div>
        ) : (
          balances.map((balance, idx) => (
            <div
              key={balance._id ?? idx}
              className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getLeaveIcon(balance.leaveType)}</span>
                  <span className="text-sm font-medium text-slate-300">
                    {balance.leaveType === 'annual' ? 'Annual Leave' : 
                     balance.leaveType === 'sick' ? 'Sick Leave' :
                     balance.leaveType === 'casual' ? 'Casual Leave' :
                     balance.leaveType === 'unpaid' ? 'Unpaid Leave' :
                     balance.leaveType}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Available</span>
                  <span className="font-semibold text-white">{balance.availableDays} days</span>
                </div>

                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`bg-gradient-to-r ${getLeaveColor(balance.leaveType)} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min((balance.availableDays / balance.totalDays) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-500">
                  <span>Used: {balance.usedDays}</span>
                  <span>Total: {balance.totalDays}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeaveBalance;
