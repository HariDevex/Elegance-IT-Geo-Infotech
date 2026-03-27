import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const AnnouncementsList = ({ title = "Announcements" }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data?.announcements || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load");
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-rose-400">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No announcements yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a._id} className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-semibold text-white">{a.title}</h3>
                <span className="text-xs text-slate-400">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-line">{a.message}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span>By {a.createdBy?.name || "Admin"}</span>
                {a.audienceRoles && a.audienceRoles.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-700">
                    {a.audienceRoles.join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsList;
