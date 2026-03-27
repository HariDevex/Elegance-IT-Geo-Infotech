import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/authContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const roleOptions = [
  { value: "all", label: "All" },
  { value: "developer", label: "Developers" },
  { value: "teamlead", label: "Team Leads" },
  { value: "manager", label: "Managers" },
  { value: "admin", label: "Admins" },
  { value: "hr", label: "HR" },
];

const AddAnnouncementForm = ({ onCreated }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audienceRoles, setAudienceRoles] = useState(["all"]);
  const [audienceDepartments, setAudienceDepartments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toggleRole = (value) => {
    if (value === "all") {
      setAudienceRoles(["all"]);
      return;
    }
    setAudienceRoles((prev) => {
      const next = prev.filter((r) => r !== "all").includes(value)
        ? prev.filter((r) => r !== "all" && r !== value)
        : [...prev.filter((r) => r !== "all"), value];
      return next.length ? next : ["all"];
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/api/announcements`,
        {
          title,
          message,
          audienceRoles,
          audienceDepartments: audienceDepartments
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccess("Announcement posted!");
        toast.success("Announcement posted!");
        setTitle("");
        setMessage("");
        setAudienceRoles(["all"]);
        setAudienceDepartments("");
        onCreated?.();
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to post";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto bg-slate-800/60 border border-slate-700 rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-6">Add Announcement</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="ann-title" className="block text-sm font-medium text-slate-300 mb-2">Title</label>
          <input
            id="ann-title"
            name="title"
            type="text"
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="ann-message" className="block text-sm font-medium text-slate-300 mb-2">Message</label>
          <textarea
            id="ann-message"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white min-h-[120px]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Audience</label>
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleRole(opt.value)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  audienceRoles.includes(opt.value)
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-slate-900 border-slate-600 text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ann-departments" className="block text-sm font-medium text-slate-300 mb-2">
            Departments (optional, comma separated)
          </label>
          <input
            id="ann-departments"
            name="departments"
            type="text"
            autoComplete="off"
            value={audienceDepartments}
            onChange={(e) => setAudienceDepartments(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2 text-white"
            placeholder="HR, Development, Sales"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post Announcement"}
        </button>
      </form>
    </div>
  );
};

export default AddAnnouncementForm;
