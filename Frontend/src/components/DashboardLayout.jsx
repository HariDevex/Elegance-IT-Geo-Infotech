import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Lock, LogOut, Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "../context/authContext";
import axios from "axios";
import logoSrc from "../assets/Logo/EG.png";
import NotificationBell from "./NotificationBell";
import API_BASE from "../config/api.js";

const menuItems = [
  { title: "Dashboard", key: "dashboard" },
  { title: "My Profile", key: "profileEdit" },
  { title: "My Attendance", key: "attendance" },
  { title: "Leave Request", key: "leaves" },
  { title: "Leave Calendar", key: "leaveCalendar" },
  { title: "Employees", key: "employees", roles: ["root", "admin", "manager"], children: [
    { title: "Add Employee", key: "addEmployee", roles: ["root", "admin", "manager"] },
    { title: "Employees List", key: "employeesList", roles: ["root", "admin", "manager"] },
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
  { title: "Security", key: "security", roles: ["root", "admin", "manager", "hr"], children: [
    { title: "Active Sessions", key: "sessions" },
    { title: "Password Reset", key: "passwordReset", roles: ["root"] },
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
    const storedAvatar = localStorage.getItem("avatar");
    
    let avatarToUse = null;
    
    if (user?.avatar) {
      avatarToUse = user.avatar;
    } else if (user?.profileImage) {
      avatarToUse = user.profileImage;
    } else if (storedAvatar) {
      avatarToUse = storedAvatar;
    }
    
    if (avatarToUse) {
      const fullUrl = avatarToUse.startsWith('http') ? avatarToUse : `${API_BASE}${avatarToUse}`;
      setProfileImage(fullUrl);
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
      const newAvatarUrl = res.data?.avatarUrl;
      const fullAvatarUrl = newAvatarUrl.startsWith('http') ? newAvatarUrl : `${API_BASE}${newAvatarUrl}`;
      setProfileImage(fullAvatarUrl);
      updateAvatar(fullAvatarUrl);
      localStorage.setItem("avatar", fullAvatarUrl);
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
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* Fixed Sidebar */}
      <aside
        className={`
          fixed lg:sticky inset-y-0 left-0 z-40
          h-screen w-64 lg:w-72
          border-r flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
      >
        {/* Sidebar Header */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Elegance" className="h-10 w-10 object-contain" />
            <div className="hidden sm:block">
              <h2 className="text-lg font-bold">Elegance</h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>EMS Dashboard</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm gradient-primary">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="h-full w-full object-cover rounded-full" />
              ) : (
                <span>{(user?.name || "U").slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name || "User"}</div>
              <div className="text-xs capitalize font-medium" style={{ color: 'var(--color-primary)' }}>{user?.role || "Employee"}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredMenuItems.map((item) => (
            <div key={item.key}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(item.key)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-medium transition text-sm"
                    style={{
                      backgroundColor: openMenus[item.key] ? 'var(--color-primary-muted)' : 'transparent',
                      color: openMenus[item.key] ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                    }}
                  >
                    <span>{item.title}</span>
                    <ChevronDown size={16} className={`transition-transform ${openMenus[item.key] ? "rotate-180" : ""}`} />
                  </button>
                  {openMenus[item.key] && filteredChildren(item.children).length > 0 && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {filteredChildren(item.children).map((child) => (
                        <button
                          key={child.key}
                          onClick={() => handleMenuClick(child.key)}
                          className="w-full text-left px-4 py-2 rounded-lg text-sm transition"
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
                  className="w-full text-left px-4 py-2.5 rounded-lg font-medium transition text-sm"
                  style={{
                    backgroundColor: currentView === item.key || (chatOpen && item.key === "chat") ? 'var(--color-primary)' : 'transparent',
                    color: currentView === item.key || (chatOpen && item.key === "chat") ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)'
                  }}
                >
                  {item.title}
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition"
            style={{ color: 'var(--color-error)' }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Fixed Header */}
        <header 
          className="sticky top-0 z-50 shadow-md"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="px-4 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-bg-hover)' }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-3 lg:hidden">
            <img src={logoSrc} alt="Elegance" className="h-8 w-8 object-contain" />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <NotificationBell />

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2"
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold overflow-hidden border-2 border-transparent hover:border-white transition gradient-primary">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span>{(user?.name || "U").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-2xl border shadow-2xl p-4 space-y-3 z-50" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 rounded-full flex items-center justify-center font-bold gradient-primary">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="h-full w-full object-cover rounded-full" />
                      ) : (
                        <span>{(user?.name || "U").slice(0, 2).toUpperCase()}</span>
                      )}
                      <button
                        type="button"
                        className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center shadow"
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
                      <div className="text-base font-semibold">{user?.name}</div>
                      <div className="text-sm capitalize" style={{ color: 'var(--color-text-muted)' }}>{user?.role}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</div>
                    </div>
                  </div>

                  {uploading && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Uploading...</p>}
                  {uploadError && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{uploadError}</p>}

                  <div className="border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => navigate("/change-password")}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Lock size={16} />
                      Change Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {chatOpen ? (
            <div className="space-y-4 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Chat</h3>
                <button
                  onClick={() => {
                    setChatOpen(false);
                    setCurrentView("dashboard");
                  }}
                  className="text-sm px-3 py-1.5 rounded-lg transition"
                  style={{ backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}
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

        {/* Fixed Footer */}
        <footer 
          className="px-4 lg:px-8 py-3 text-center text-sm border-t"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          © {new Date().getFullYear()} Elegance IT & Geo Synergy. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
