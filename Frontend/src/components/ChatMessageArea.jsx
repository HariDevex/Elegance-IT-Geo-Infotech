import { useMemo, useRef, useEffect, memo } from "react";
import { Search, X, Phone, Video, MoreVertical, Check, CheckCheck } from "lucide-react";
import chatBgLogo from "../assets/Logo/EG.png";
import { getProjectDateStr, getProjectTimeStr } from "../utils/dateUtils";

const getInitials = (name) => {
  return (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
};

const formatTime = (ts) => {
  if (!ts) return "";
  return getProjectTimeStr(new Date(ts));
};

const formatDate = (ts) => {
  if (!ts) return "";
  const date = new Date(ts);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return getProjectDateStr(date);
};

const MessageStatus = ({ status }) => {
  if (status === "seen") return <CheckCheck size={14} className="text-cyan-400" />;
  if (status === "delivered") return <CheckCheck size={14} className="text-slate-400" />;
  return <Check size={14} className="text-slate-400" />;
};

const MessageSkeleton = ({ isOwn = false }) => (
  <div className={`flex mb-4 ${isOwn ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[65%] ${isOwn ? "text-right" : "text-left"}`}>
      {!isOwn && <div className="animate-pulse bg-gray-600 h-3 w-16 mb-1 rounded" />}
      <div className="animate-pulse bg-gray-600 h-10 w-32 rounded-2xl" />
    </div>
  </div>
);

const ChatMessageArea = ({
  activeContact, activeName, messages, loading, messageSearch,
  showSearch, onToggleSearch, onSearchChange, onClearSearch,
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeContact]);

  const getMessageDate = (ts) => {
    if (!ts) return null;
    return new Date(ts).toDateString();
  };

  const filteredMessages = useMemo(() => {
    let msgs = messages || [];
    if (messageSearch.trim()) {
      const query = messageSearch.toLowerCase();
      msgs = msgs.filter(m => m.text?.toLowerCase().includes(query));
    }
    return msgs;
  }, [messages, messageSearch]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    filteredMessages.forEach((msg) => {
      const msgDate = getMessageDate(msg.ts);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: "date", date: msgDate, displayDate: formatDate(msg.ts) });
      }
      groups.push({ type: "message", ...msg });
    });
    return groups;
  }, [filteredMessages]);

  const isGroupChat = activeContact?.startsWith("grp-");
  const isActiveOnline = useMemo(() => {
    if (isGroupChat) return false;
    const contact = (messages[activeContact] || []).find(m => !m.isYou)?.from; // This is a fallback
    // In a real app we'd look up the contact in the contactList, but for simplicity here:
    return activeName && !isGroupChat; 
  }, [activeContact, isGroupChat, activeName]);

  if (!activeContact) return null;

  return (
    <section className="flex-1 flex flex-col min-w-0 h-full bg-[#0d1117]">
      <header className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0" style={{ borderColor: '#2a3338', backgroundColor: '#131c21' }}>
        <div className="relative">
          <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: isGroupChat ? '#00a884' : '#5e6e7c' }}>
            <span className="text-sm font-medium text-white">{getInitials(activeName)}</span>
          </div>
          {isActiveOnline && !isGroupChat && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#131c21] bg-emerald-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white">{activeName}</div>
          <div className="text-xs text-gray-400">
            {isGroupChat ? 'Group' : isActiveOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleSearch} className="p-2 rounded-full" style={{ backgroundColor: showSearch ? '#182229' : 'transparent' }}>
            <Search size={20} className="text-gray-400" />
          </button>
          <button className="p-2 rounded-full hover:bg-[#182229]"><Phone size={20} className="text-gray-400" /></button>
          <button className="p-2 rounded-full hover:bg-[#182229]"><Video size={20} className="text-gray-400" /></button>
          <button className="p-2 rounded-full hover:bg-[#182229]"><MoreVertical size={20} className="text-gray-400" /></button>
        </div>
      </header>

      {showSearch && (
        <div className="px-4 py-2 border-b flex-shrink-0" style={{ borderColor: '#2a3338', backgroundColor: '#131c21' }}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search messages..." value={messageSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-10 py-2 rounded-lg text-sm text-white bg-[#182229] border-none" />
            {messageSearch && (
              <button onClick={onClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 relative" style={{ backgroundColor: '#0d1117' }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
          <img src={chatBgLogo} alt="" className="w-64 h-64 object-contain" loading="lazy" />
        </div>

        {loading ? (
          <div className="p-4 space-y-4">
            <MessageSkeleton /><MessageSkeleton isOwn /><MessageSkeleton /><MessageSkeleton isOwn /><MessageSkeleton />
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-20 w-20 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#5e6e7c' }}>
              <span className="text-3xl font-medium text-white">{getInitials(activeName)}</span>
            </div>
            <div className="text-lg text-white">{activeName}</div>
            <div className="text-sm text-gray-400 mt-1">
              {messageSearch ? "No messages found" : "Start a conversation"}
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map((item, idx) => {
              if (item.type === "date") {
                return (
                  <div key={`date-${item.date}`} className="flex justify-center my-4">
                    <span className="text-xs px-3 py-1 rounded-full bg-[#182229] text-gray-400">{item.displayDate}</span>
                  </div>
                );
              }
              const showAvatar = !item.isYou && (groupedMessages[idx - 1]?.from?._id !== item.from?._id || groupedMessages[idx - 1]?.type === "date");
              return (
                <div key={item._id ?? idx} className={`flex mb-2 ${item.isYou ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[65%] ${item.isYou ? "text-right" : "text-left"}`}>
                    {!item.isYou && showAvatar && (
                      <div className="text-xs text-gray-400 mb-1 ml-1">{item.from?.name}</div>
                    )}
                    <div className={`inline-block px-4 py-2.5 ${item.isYou ? "rounded-l-xl rounded-tr-xl" : "rounded-r-xl rounded-tl-xl"}`}
                      style={{ backgroundColor: item.isYou ? '#005c4b' : '#182229', color: '#e8eaed' }}>
                      <div className="text-sm break-words">{item.text}</div>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${item.isYou ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-gray-400">{formatTime(item.ts)}</span>
                      {item.isYou && <MessageStatus status={item.status} />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </section>
  );
};

export default memo(ChatMessageArea);
