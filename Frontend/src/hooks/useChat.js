import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import api from "../config/axios";
import API_BASE from "../config/api";

const isGroupId = (id) => id && id.includes("-") && id.length === 36;

export default function useChat() {
  const [user, setUser] = useState(null);
  const [directContacts, setDirectContacts] = useState([]);
  const [customGroups, setCustomGroups] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [lastMessages, setLastMessages] = useState({});
  const socketRef = useRef(null);
  const activeContactRef = useRef(activeContact);

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  const userId = user?._id;

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData._id) {
      const token = localStorage.getItem("token");
      if (token) {
        api.get("/auth/profile").then(res => {
          if (res.data.user) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        }).catch(err => console.error("Failed to load profile:", err));
      }
    } else {
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !userId) return;

    let serverUrl = API_BASE || window.location.origin;
    if (serverUrl.endsWith("/api")) {
      serverUrl = serverUrl.replace("/api", "");
    }

    const socket = io(serverUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      secure: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => console.log("Socket connected"));
    socket.on("connect_error", (err) => {
      if (err.message === "xhr poll error") return; // Reduce noise
      console.error("Socket error:", err.message);
    });

    socket.on("user:status", (data) => {
      if (!data) return;
      const { userId: statusId, status } = data;
      setDirectContacts(prev => prev.map(c => 
        c.id === statusId ? { ...c, online: status === "online" } : c
      ));
    });

    socket.on("chat:receive", (data) => {
      if (!data) return;
      const contactId = data.from;
      const newMsg = {
        _id: `socket-${Date.now()}`,
        text: data.text,
        from: { _id: data.from, name: data.fromName },
        isYou: data.from === userId,
        ts: data.timestamp,
        status: "delivered"
      };

      setMessages((prev) => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), newMsg],
      }));
      setLastMessages((prev) => ({ ...prev, [contactId]: newMsg }));

      // If this is the active chat, send 'seen' status
      if (activeContactRef.current === contactId) {
        socket.emit("message:seen", { from: contactId, timestamp: data.timestamp });
      }
    });

    socket.on("chat:sent", (data) => {
      if (!data) return;
      const { to, timestamp, isOnline } = data;
      setMessages(prev => {
        const chatMsgs = [...(prev[to] || [])];
        const msgIndex = chatMsgs.findLastIndex(m => m.ts === timestamp || m._id.startsWith('temp-'));
        if (msgIndex !== -1) {
          chatMsgs[msgIndex] = { 
            ...chatMsgs[msgIndex], 
            status: isOnline ? "delivered" : "sent" 
          };
        }
        return { ...prev, [to]: chatMsgs };
      });
    });

    socket.on("message:status", (data) => {
      if (!data) return;
      const { userId: statusId, timestamp, status } = data;
      setMessages(prev => {
        const chatMsgs = [...(prev[statusId] || [])];
        // Mark all messages up to this timestamp as seen
        const updated = chatMsgs.map(m => {
          if (m.isYou && m.status !== "seen" && (m.ts <= timestamp || !m.ts)) {
            return { ...m, status: "seen" };
          }
          return m;
        });
        return { ...prev, [statusId]: updated };
      });
    });

    socket.on("chat:receiveGroup", (data) => {
      if (!data) return;
      const contactId = data.groupId;
      const newMsg = {
        _id: `socket-${Date.now()}`,
        text: data.text,
        from: { _id: data.from, name: data.fromName },
        isYou: data.from === userId,
        ts: data.timestamp,
      };
      setMessages((prev) => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), newMsg],
      }));
      setLastMessages((prev) => ({ ...prev, [contactId]: newMsg }));
    });

    socketRef.current = socket;

    return () => {
      if (socket) {
        socket.off();
        socket.disconnect();
      }
    };
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadContacts = async () => {
      if (!userId) return;
      try {
        const res = await api.get("/employees", { 
          params: { limit: 500 },
          signal: controller.signal 
        });
        const contacts = res.data.users
          ?.filter((u) => u._id !== userId)
          .map((u) => ({
            id: u._id,
            name: u.name,
            department: u.department,
            avatar: u.profileImage,
            role: u.role,
            online: false
          })) || [];
        setDirectContacts(contacts);

        setActiveContact(prev => {
          if (!prev && contacts.length > 0) return contacts[0].id;
          return prev;
        });
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        console.error("Failed to load contacts:", err);
      } finally {
        setLoadingContacts(false);
      }
    };
    loadContacts();
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadGroups = async () => {
      if (!userId) return;
      try {
        const res = await api.get("/chat/groups", { signal: controller.signal });
        if (res.data.success) {
          setCustomGroups(res.data.groups || []);
        }
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        console.error("Failed to load groups:", err);
      }
    };
    loadGroups();
    return () => controller.abort();
  }, [userId]);

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

  const contactList = useMemo(() =>
    filteredContacts.map(c => ({
      ...c,
      lastMessage: lastMessages[c.id] || null,
    })),
    [filteredContacts, lastMessages]
  );

  const groupList = useMemo(() =>
    filteredGroups.map(g => ({
      ...g,
      lastMessage: lastMessages[g.id] || null,
    })),
    [filteredGroups, lastMessages]
  );

  const loadMessages = useCallback(async (contactId, signal) => {
    if (!contactId) return;
    setLoadingMessages(true);
    try {
      const isGroup = isGroupId(contactId);
      const res = await api.get("/chat", {
        params: { contactId, type: isGroup ? "group" : "direct" },
        signal
      });
      const msgs = res.data?.messages || [];
      setMessages((prev) => ({ ...prev, [contactId]: msgs }));

      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        setLastMessages((prev) => ({ ...prev, [contactId]: lastMsg }));

        // Mark as seen if it's a direct chat and we are currently viewing it
        if (!isGroup && contactId === activeContactRef.current && socketRef.current?.connected) {
          const lastUnread = [...msgs].reverse().find(m => !m.isYou);
          if (lastUnread) {
            socketRef.current.emit("message:seen", { from: contactId, timestamp: lastUnread.ts });
          }
        }
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (activeContact) {
      loadMessages(activeContact, controller.signal);
    }
    return () => controller.abort();
  }, [activeContact, loadMessages]);

  const activeName = useMemo(() => {
    const data = [
      ...directContacts.filter((c) => c.id === activeContact),
      ...customGroups.filter((g) => g.id === activeContact),
    ][0];
    return data?.name;
  }, [activeContact, directContacts, customGroups]);

  const currentMessages = useMemo(() => {
    return messages[activeContact] || [];
  }, [messages, activeContact]);

  const handleSend = useCallback(async (text, attachment) => {
    if (!activeContact) return;

    const isGroup = isGroupId(activeContact);
    const tempId = `temp-${Date.now()}`;
    const newMsg = {
      _id: tempId,
      text,
      from: { _id: userId, name: user?.name || "You" },
      isYou: true,
      ts: new Date().toISOString(),
      attachment: attachment,
    };

    setMessages((prev) => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), newMsg],
    }));

    try {
      const formData = new FormData();
      formData.append("contactId", activeContact);
      formData.append("type", isGroup ? "group" : "direct");
      formData.append("text", text);
      if (attachment) {
        formData.append("file", attachment);
      }
      await api.post("/chat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (socketRef.current?.connected) {
        if (isGroup) {
          socketRef.current.emit("chat:sendGroup", {
            groupId: activeContact,
            text,
          });
        } else {
          socketRef.current.emit("chat:send", {
            to: activeContact,
            text,
          });
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    }
  }, [activeContact, userId, user]);

  const handleCreateGroup = useCallback(async (name, description) => {
    try {
      const res = await api.post("/chat/groups", { name, description });
      if (res.data.success) {
        setCustomGroups((prev) => [res.data.group, ...prev]);
        toast.success("Group created!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create group");
      throw err;
    }
  }, []);

  const handleCloseCreateGroup = useCallback(() => {
    setShowCreateGroup(false);
  }, []);

  return {
    activeContact,
    setActiveContact,
    contactList,
    groupList,
    loadingContacts,
    loadingMessages,
    currentMessages,
    searchQuery,
    setSearchQuery,
    messageSearch,
    setMessageSearch,
    showSearch,
    setShowSearch,
    showCreateGroup,
    setShowCreateGroup,
    activeName,
    handleSend,
    handleCreateGroup,
    handleCloseCreateGroup,
  };
}
