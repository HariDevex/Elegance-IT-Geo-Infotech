import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Search, Plus, X, Send, MoreVertical, Phone, Video, CheckCheck, Image as ImageIcon, Smile, MessageCircle, Mic, Paperclip } from "lucide-react";
import chatBgLogo from "../assets/Logo/EGlogo.png";
import API_BASE from "../config/api.js";

const isGroupId = (id) => id && id.includes("-") && id.length === 36;

const EMOJIS = ["😀", "😂", "😍", "🥰", "😊", "😎", "🤔", "😅", "😭", "😤", "🥳", "😴", "🤗", "😇", "🙄", "😏", "👍", "👎", "👏", "🙌", "❤️", "💔", "✨", "🔥", "💯", "🎉", "🎊", "✅", "❌", "⚠️"];

const SkeletonLoader = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-600 rounded ${className}`}></div>
);

const ContactSkeleton = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <SkeletonLoader className="h-12 w-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <SkeletonLoader className="h-4 w-24 rounded" />
      <SkeletonLoader className="h-3 w-32 rounded" />
    </div>
  </div>
);

const MessageSkeleton = ({ isOwn = false }) => (
  <div className={`flex mb-4 ${isOwn ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[65%] ${isOwn ? "text-right" : "text-left"}`}>
      {!isOwn && <SkeletonLoader className="h-3 w-16 mb-1 rounded" />}
      <SkeletonLoader className="h-10 w-32 rounded-2xl" />
    </div>
  </div>
);

const ChatWindow = () => {
  const [user, setUser] = useState(null);
  const [directContacts, setDirectContacts] = useState([]);
  const [customGroups, setCustomGroups] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState({});
  const [text, setText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lastMessages, setLastMessages] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData._id) {
      const token = localStorage.getItem("token");
      if (token) {
        axios.get(`${API_BASE}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => {
          if (res.data.user) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        }).catch(() => {});
      }
    } else {
      setUser(userData);
    }
  }, []);

  const userId = user?._id;

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/employees`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 500 },
        });
        const contacts = res.data.users
          ?.filter((u) => u._id !== userId)
          .map((u) => ({ 
            id: u._id, 
            name: u.name, 
            department: u.department, 
            avatar: u.profileImage,
            role: u.role 
          })) || [];
        setDirectContacts(contacts);
        
        if (!activeContact && contacts.length > 0) {
          setActiveContact(contacts[0].id);
        }
      } catch { /* empty */ } finally {
        setLoadingContacts(false);
      }
    };
    loadContacts();
  }, [userId, activeContact]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/chat/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setCustomGroups(res.data.groups || []);
        }
      } catch { /* empty */ }
    };
    loadGroups();
  }, []);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return directContacts;
    const query = searchQuery.toLowerCase();
    return directContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.department && c.department.toLowerCase().includes(query))
    );
  }, [searchQuery, directContacts]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return customGroups;
    const query = searchQuery.toLowerCase();
    return customGroups.filter((g) =>
      g.name.toLowerCase().includes(query)
    );
  }, [searchQuery, customGroups]);

  const loadMessages = useCallback(async (contactId = activeContact) => {
    if (!contactId) return;
    setLoadingMessages(true);
    try {
      const token = localStorage.getItem("token");
      const isGroup = isGroupId(contactId);
      const res = await axios.get(`${API_BASE}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { contactId, type: isGroup ? "group" : "direct" },
      });
      const msgs = res.data?.messages || [];
      setMessages((prev) => ({ ...prev, [contactId]: msgs }));
      
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        setLastMessages((prev) => ({ ...prev, [contactId]: lastMsg }));
      }
    } catch { /* empty */ } finally {
      setLoadingMessages(false);
    }
  }, [activeContact]);

  useEffect(() => {
    if (activeContact) loadMessages();
  }, [activeContact, loadMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeContact) loadMessages(activeContact);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeContact, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeContact]);

  const currentMessages = useMemo(() => {
    let msgs = messages[activeContact] || [];
    if (messageSearch.trim()) {
      const query = messageSearch.toLowerCase();
      msgs = msgs.filter(m => m.text?.toLowerCase().includes(query));
    }
    return msgs;
  }, [messages, activeContact, messageSearch]);

  const send = async (e) => {
    e?.preventDefault();
    if ((!text.trim() && !attachment) || !activeContact) return;

    const isGroup = isGroupId(activeContact);
    const tempId = `temp-${Date.now()}`;
    const newMsg = {
      _id: tempId,
      text: text.trim(),
      from: { _id: userId, name: user?.name || "You" },
      isYou: true,
      ts: new Date().toISOString(),
      attachment: attachment,
    };

    setMessages((prev) => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), newMsg],
    }));
    setText("");
    setAttachment(null);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("contactId", activeContact);
      formData.append("type", isGroup ? "group" : "direct");
      formData.append("text", text.trim());
      if (attachment) {
        formData.append("file", attachment);
      }
      await axios.post(
        `${API_BASE}/api/chat`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );
      loadMessages(activeContact);
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      setText((prev) => prev + ` [Attachment: ${file.name}]`);
    }
    e.target.value = "";
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/api/chat/groups`,
        { name: newGroupName, description: newGroupDesc },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setCustomGroups((prev) => [res.data.group, ...prev]);
        setShowCreateGroup(false);
        setNewGroupName("");
        setNewGroupDesc("");
        toast.success("Group created!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const activeContactData = [
    ...directContacts.filter((c) => c.id === activeContact),
    ...customGroups.filter((g) => g.id === activeContact),
  ][0];

  const activeName = activeContactData?.name;
  const isGroupChat = activeContact?.startsWith("grp-");

  const getInitials = (name) => {
    return (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const getMessageDate = (ts) => {
    if (!ts) return null;
    return new Date(ts).toDateString();
  };

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    
    currentMessages.forEach((msg) => {
      const msgDate = getMessageDate(msg.ts);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: "date", date: msgDate, displayDate: formatDate(msg.ts) });
      }
      groups.push({ type: "message", ...msg });
    });
    
    return groups;
  }, [currentMessages]);

  return (
    <div className="h-full flex rounded-xl overflow-hidden" style={{ backgroundColor: '#0d1117' }}>
      {/* Sidebar - Fixed */}
      <aside className="w-80 flex-shrink-0 border-r flex flex-col h-full" style={{ backgroundColor: '#131c21', borderColor: '#2a3338' }}>
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#2a3338' }}>
          <h2 className="text-lg font-semibold text-white">Messages</h2>
          <button onClick={() => setShowCreateGroup(true)} className="p-2 rounded-full" style={{ backgroundColor: '#00a884', color: '#0d1117' }}>
            <Plus size={20} />
          </button>
        </div>

        <div className="p-3 flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-9 py-2.5 rounded-lg text-sm text-white bg-[#182229] border-none" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {loadingContacts ? (
            <>
              <ContactSkeleton />
              <ContactSkeleton />
              <ContactSkeleton />
              <ContactSkeleton />
              <ContactSkeleton />
            </>
          ) : (
            <>
              {filteredGroups.map((g) => {
            const lastMsg = lastMessages[g.id];
            return (
              <button key={g.id} onClick={() => setActiveContact(g.id)}
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
                  <div className="text-xs text-gray-400 truncate">
                    {lastMsg?.text || 'No messages yet'}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredGroups.length > 0 && filteredContacts.length > 0 && (
            <div className="px-4 py-2 text-xs font-semibold uppercase text-gray-400">Contacts</div>
          )}

          {filteredContacts.map((c) => {
            const lastMsg = lastMessages[c.id];
            return (
              <button key={c.id} onClick={() => setActiveContact(c.id)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#182229]" 
                style={{ backgroundColor: activeContact === c.id ? '#182229' : 'transparent' }}>
                <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#5e6e7c' }}>
                  <span className="text-white font-medium">{getInitials(c.name)}</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-white truncate">{c.name}</div>
                    {lastMsg && <div className="text-xs text-gray-400">{formatTime(lastMsg.ts)}</div>}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {lastMsg?.text || c.department || 'Offline'}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredContacts.length === 0 && filteredGroups.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p>No contacts found</p>
            </div>
          )}
          </>
          )}
        </div>
      </aside>

      {/* Chat Area - Scrollable */}
      <section className="flex-1 flex flex-col min-w-0 h-full bg-[#0d1117]">
        {activeContact ? (
          <>
            {/* Header - Fixed */}
            <header className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0" style={{ borderColor: '#2a3338', backgroundColor: '#131c21' }}>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: isGroupChat ? '#00a884' : '#5e6e7c' }}>
                <span className="text-sm font-medium text-white">{getInitials(activeName)}</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">{activeName}</div>
                <div className="text-xs text-gray-400">
                  {isGroupChat ? 'Group' : 'Online'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-full" style={{ backgroundColor: showSearch ? '#182229' : 'transparent' }}>
                  <Search size={20} className="text-gray-400" />
                </button>
                <button className="p-2 rounded-full hover:bg-[#182229]"><Phone size={20} className="text-gray-400" /></button>
                <button className="p-2 rounded-full hover:bg-[#182229]"><Video size={20} className="text-gray-400" /></button>
                <button className="p-2 rounded-full hover:bg-[#182229]"><MoreVertical size={20} className="text-gray-400" /></button>
              </div>
            </header>

            {/* Search Bar - Fixed */}
            {showSearch && (
              <div className="px-4 py-2 border-b flex-shrink-0" style={{ borderColor: '#2a3338', backgroundColor: '#131c21' }}>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search messages..." value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 rounded-lg text-sm text-white bg-[#182229] border-none" />
                  {messageSearch && (
                    <button onClick={() => setMessageSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 relative" style={{ backgroundColor: '#0d1117' }}>
              {/* Background Logo */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
                <img src={chatBgLogo} alt="" className="w-64 h-64 object-contain" />
              </div>

              {loadingMessages ? (
                <div className="p-4 space-y-4">
                  <MessageSkeleton />
                  <MessageSkeleton isOwn={true} />
                  <MessageSkeleton />
                  <MessageSkeleton isOwn={true} />
                  <MessageSkeleton />
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
                  {groupedMessages.map((item) => {
                    if (item.type === "date") {
                      return (
                        <div key={`date-${item.date}`} className="flex justify-center my-4">
                          <span className="text-xs px-3 py-1 rounded-full bg-[#182229] text-gray-400">
                            {item.displayDate}
                          </span>
                        </div>
                      );
                    }

                    const showAvatar = !item.isYou && (groupedMessages[groupedMessages.indexOf(item) - 1]?.from?._id !== item.from?._id || groupedMessages[groupedMessages.indexOf(item) - 1]?.type === "date");
                    
                    return (
                      <div key={item._id} className={`flex mb-2 ${item.isYou ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[65%] ${item.isYou ? "text-right" : "text-left"}`}>
                          {!item.isYou && showAvatar && (
                            <div className="text-xs text-gray-400 mb-1 ml-1">{item.from?.name}</div>
                          )}
                          <div 
                            className={`inline-block px-4 py-2.5 ${item.isYou ? "rounded-l-xl rounded-tr-xl" : "rounded-r-xl rounded-tl-xl"}`}
                            style={{ 
                              backgroundColor: item.isYou ? '#005c4b' : '#182229', 
                              color: '#e8eaed'
                            }}
                          >
                            <div className="text-sm break-words">{item.text}</div>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${item.isYou ? "justify-end" : "justify-start"}`}>
                            <span className="text-[10px] text-gray-400">{formatTime(item.ts)}</span>
                            {item.isYou && <CheckCheck size={14} className="text-[#53bdeb]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area - Fixed */}
            <form onSubmit={send} className="p-3 flex flex-col gap-2 flex-shrink-0" style={{ backgroundColor: '#131c21' }}>
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-1 p-2 bg-[#182229] rounded-lg max-w-xs">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="p-1 hover:bg-[#2a3338] rounded text-lg">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full hover:bg-[#182229] flex-shrink-0">
                  <Smile size={24} className="text-gray-400" />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-[#182229] flex-shrink-0">
                  <Paperclip size={24} className="text-gray-400" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" />
                <input 
                  type="text" 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-2xl text-sm text-white bg-[#182229] border-none outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                {(text.trim() || attachment) ? (
                  <button type="submit" className="p-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#00a884', color: '#0d1117' }}>
                    <Send size={20} />
                  </button>
                ) : (
                  <button type="button" className="p-2.5 rounded-full flex-shrink-0 bg-[#182229]">
                    <Mic size={20} className="text-gray-400" />
                  </button>
                )}
              </div>
              {attachment && (
                <div className="text-xs text-gray-400 px-2">
                  Attached: {attachment.name}
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#0d1117]">
            <div className="text-center">
              <div className="h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#182229]">
                <MessageCircle size={48} className="text-gray-400" />
              </div>
              <div className="text-xl font-light text-white">Elegance Chat</div>
              <div className="text-sm text-gray-400 mt-2">
                Select a contact to start messaging
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-md mx-4 bg-[#131c21]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Create Group</h3>
              <button onClick={() => setShowCreateGroup(false)} className="p-1 rounded text-gray-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="chat-group-name" className="block text-sm font-medium mb-1 text-gray-300">Group Name *</label>
                <input id="chat-group-name" type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Enter group name"
                  className="w-full rounded-lg px-3 py-2 bg-[#182229] text-white border-none" maxLength={50} />
              </div>
              <div>
                <label htmlFor="chat-group-desc" className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                <input id="chat-group-desc" type="text" value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Enter description"
                  className="w-full rounded-lg px-3 py-2 bg-[#182229] text-white border-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateGroup(false)} className="flex-1 px-4 py-2 rounded-lg font-medium bg-[#182229] text-white">Cancel</button>
                <button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()} className="flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50" style={{ backgroundColor: '#00a884', color: '#0d1117' }}>
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;