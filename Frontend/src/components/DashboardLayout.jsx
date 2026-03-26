import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Lock, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/authContext";
import axios from "axios";
import { getImageUrl } from "../utils/excel";
import logoSrc from "../assets/Logo/EG.png";
import NotificationBell from "./NotificationBell";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const menuItems = [
  { title: "Dashboard", key: "dashboard" },
  { title: "My Profile", key: "profileEdit" },
  { title: "My Attendance", key: "attendance" },
  { title: "Leave Request", key: "leaves" },
  { title: "Attendance", key: "attendanceManage", roles: ["root", "admin", "manager"] },
  { title: "Leave Calendar", key: "leaveCalendar", roles: ["root", "admin", "manager"] },
  { title: "Employees", key: "employees", children: [
    { title: "Add Employee", key: "addEmployee", roles: ["root", "admin", "manager"] },
    { title: "Employees List", key: "employeesList" },
  ]},
  { title: "Check In/Out", key: "checkin", roles: ["root", "admin", "manager"] },
  { title: "Chat", key: "chat" },
  { title: "Holidays", key: "holidays" },
  { title: "Login Logs", key: "loginLogs", roles: ["root", "admin", "manager"] },
  { title: "Activity Logs", key: "activityLogs", roles: ["root", "admin"] },
  { title: "Announcements", key: "announcements", children: [
    { title: "Add New", key: "addAnnouncement", roles: ["root", "admin", "manager", "hr", "teamlead"] },
    { title: "View All", key: "announcementsList" },
  ]},
];

const DashboardLayout = ({
  children,
  currentView,
  setCurrentView,
  chatOpen,
  setChatOpen,
  ChatComponent,
}) => {
  const { user, logout, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [openMenus, setOpenMenus] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?.avatar || user?.profileImage) {
      setProfileImage(user.avatar || user.profileImage);
    } else if (user?.name) {
      setProfileImage(null);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    logout();
    navigate("/login");
  };

  const handleAvatarUpload = async (file) => {
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/auth/avatar`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      const url = res.data?.avatarUrl || URL.createObjectURL(file);
      setProfileImage(url);
      updateAvatar(url);
    } catch (err) {
      setUploadError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleMenuClick = (key) => {
    if (key === "chat") {
      setChatOpen(true);
    } else {
      setChatOpen(false);
    }
    setCurrentView(key);
    setMobileMenuOpen(false);
  };

  const toggleSubmenu = (key) => {
    setOpenMenus((prev) => {
      const isOpen = prev[key];
      return isOpen ? {} : { [key]: true };
    });
  };

  const hasAccess = (roles) => {
    if (!roles) return true;
    return roles.includes(user?.role);
  };

  const filteredMenuItems = menuItems.filter((item) => hasAccess(item.roles));
  const filteredChildren = (children) => children.filter((child) => hasAccess(child.roles));

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <header className="sticky top-0 z-50 px-4 md:px-6 py-4 shadow flex items-center gap-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--color-bg-hover)' }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="Elegance" className="h-9 w-9 object-contain" />
          <h1 className="text-lg md:text-xl font-semibold">Elegance IT & Geo Synergy</h1>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold gradient-primary">
              {(user?.name || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">{user?.name || "User"}</span>
              <span className="text-xs capitalize leading-tight" style={{ color: 'var(--color-primary)' }}>
                {user?.role || "Employee"}
              </span>
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold overflow-hidden border-2 border-transparent hover:border-white transition gradient-primary">
                  {profileImage ? (
                    <img src={getImageUrl(profileImage)} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                  <span>{(user?.name || "U").slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-2xl border shadow-2xl p-4 space-y-3 z-50" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full flex items-center justify-center font-semibold overflow-hidden gradient-primary">
                    {profileImage ? (
                      <img src={getImageUrl(profileImage)} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span>{(user?.name || "U").slice(0, 2).toUpperCase()}</span>
                    )}
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center shadow"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-bg-primary)' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Edit2 size={14} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                      }}
                    />
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold">{user?.name}</div>
                    <div className="text-xs text-slate-300 capitalize">{user?.role}</div>
                    <div className="text-xs text-slate-400">{user?.email}</div>
                  </div>
                </div>

                {uploading && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Uploading...</p>}
                {uploadError && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{uploadError}</p>}

                <button
                  type="button"
                  onClick={() => navigate("/change-password")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <Lock size={16} style={{ color: 'var(--color-text-secondary)' }} />
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--color-error)' }}
                >
                  <LogOut size={16} style={{ color: 'var(--color-error)' }} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={`
            fixed md:sticky top-0 md:top-auto inset-y-0 left-0 z-40
            h-screen md:h-auto
            w-64 border-r
            transform transition-transform duration-200 ease-in-out
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            pt-20 md:pt-0 px-5 py-4 space-y-1 overflow-y-auto
          `}
          style={{ backgroundColor: 'rgba(13, 35, 41, 0.8)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3 px-3 py-3 mb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm gradient-primary">
              {(user?.name || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name || "User"}</div>
              <div className="text-xs capitalize" style={{ color: 'var(--color-primary)' }}>{user?.role || "Employee"}</div>
            </div>
          </div>

          <nav className="space-y-1">
            {filteredMenuItems.map((item) => (
              <div key={item.key}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.key)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-medium transition ${
                        currentView === item.key || (openMenus[item.key] && currentView.startsWith(item.key))
                          ? ""
                          : ""
                      }`}
                      style={{
                        backgroundColor: currentView === item.key || (openMenus[item.key] && currentView.startsWith(item.key)) ? 'var(--color-primary)' : 'transparent',
                        color: currentView === item.key || (openMenus[item.key] && currentView.startsWith(item.key)) ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)'
                      }}
                    >
                      <span>{item.title}</span>
                      <span className={`transition-transform ${openMenus[item.key] ? "rotate-180" : ""}`}>▼</span>
                    </button>
                    {openMenus[item.key] && filteredChildren(item.children).length > 0 && (
                      <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: 'var(--color-border)' }}>
                        {filteredChildren(item.children).map((child) => (
                          <button
                            key={child.key}
                            onClick={() => handleMenuClick(child.key)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                              currentView === child.key ? "" : ""
                            }`}
                            style={{
                              color: currentView === child.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                              backgroundColor: currentView === child.key ? 'var(--color-primary-muted)' : 'transparent'
                            }}
                          >
                            {child.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleMenuClick(item.key)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition`}
                    style={{
                      backgroundColor: (currentView === item.key) || (chatOpen && item.key === "chat") ? 'var(--color-primary)' : 'transparent',
                      color: (currentView === item.key) || (chatOpen && item.key === "chat") ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)'
                    }}
                  >
                    {item.title}
                  </button>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {chatOpen ? (
            <div className="space-y-4 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Chat</h3>
                <button
                  onClick={() => {
                    setChatOpen(false);
                    setCurrentView("dashboard");
                  }}
                  className="text-sm text-slate-200 underline"
                >
                  Close
                </button>
              </div>
              <div className="h-[calc(100vh-200px)]">
                {ChatComponent}
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <footer className="px-6 py-3 text-center text-sm border-t" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
        © {new Date().getFullYear()} Elegance IT & Geo Synergy. All rights reserved.
      </footer>
    </div>
  );
};

export default DashboardLayout;
