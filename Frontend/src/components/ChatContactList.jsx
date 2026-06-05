import { memo } from "react";
import { Search, Plus, MessageCircle } from "lucide-react";
import { getProjectTimeStr } from "../utils/dateUtils";

const getInitials = (name) => {
  return (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
};

const formatTime = (ts) => {
  if (!ts) return "";
  return getProjectTimeStr(new Date(ts));
};

const ContactSkeleton = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="animate-pulse bg-gray-600 h-12 w-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="animate-pulse bg-gray-600 h-4 w-24 rounded" />
      <div className="animate-pulse bg-gray-600 h-3 w-32 rounded" />
    </div>
  </div>
);

const ChatContactList = ({
  groups, contacts, activeContact, onSelect, loading,
  searchQuery, onSearchChange, onCreateGroup,
}) => {
  const allGroups = groups || [];
  const allContacts = contacts || [];

  return (
    <aside className="w-80 flex-shrink-0 border-r flex flex-col h-full" style={{ backgroundColor: '#131c21', borderColor: '#2a3338' }}>
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#2a3338' }}>
        <h2 className="text-lg font-semibold text-white">Messages</h2>
        <button onClick={onCreateGroup} className="p-2 rounded-full" style={{ backgroundColor: '#00a884', color: '#0d1117' }}>
          <Plus size={20} />
        </button>
      </div>

      <div className="p-3 flex-shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-9 py-2.5 rounded-lg text-sm text-white bg-[#182229] border-none" />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0">
        {loading ? (
          <>
            <ContactSkeleton /><ContactSkeleton /><ContactSkeleton /><ContactSkeleton /><ContactSkeleton />
          </>
        ) : (
          <>
            {allGroups.map((g) => {
              const lastMsg = g.lastMessage;
              return (
                <button key={g.id} onClick={() => onSelect(g.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#182229]"
                  style={{ backgroundColor: activeContact === g.id ? '#182229' : 'transparent' }}>
                  <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#00a884' }}>
                    <span className="text-white font-medium">{getInitials(g.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-white truncate">{g.name}</div>
                      {lastMsg && <div className="text-xs text-gray-400">{formatTime(lastMsg.ts)}</div>}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{lastMsg?.text || 'No messages yet'}</div>
                  </div>
                </button>
              );
            })}

            {allGroups.length > 0 && allContacts.length > 0 && (
              <div className="px-4 py-2 text-xs font-semibold uppercase text-gray-400">Contacts</div>
            )}

            {allContacts.map((c) => {
              const lastMsg = c.lastMessage;
              return (
                <button key={c.id} onClick={() => onSelect(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#182229]"
                  style={{ backgroundColor: activeContact === c.id ? '#182229' : 'transparent' }}>
                  <div className="relative flex-shrink-0">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#5e6e7c' }}>
                      <span className="text-white font-medium">{getInitials(c.name)}</span>
                    </div>
                    {c.online && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#131c21] bg-emerald-500" title="Online" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-white truncate">{c.name}</div>
                      {lastMsg && <div className="text-xs text-gray-400">{formatTime(lastMsg.ts)}</div>}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{lastMsg?.text || c.department || 'Offline'}</div>
                  </div>
                </button>
              );
            })}

            {allContacts.length === 0 && allGroups.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>No contacts found</p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default memo(ChatContactList);
