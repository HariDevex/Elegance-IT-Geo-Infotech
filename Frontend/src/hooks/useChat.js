import { useState, useMemo, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";

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

  const userId = user?._id;

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await api.get("/employees", { params: { limit: 500 } });
        const contacts = res.data.users
          ?.filter((u) => u._id !== userId)
          .map((u) => ({
            id: u._id,
            name: u.name,
            department: u.department,
            avatar: u.profileImage,
            role: u.role,
          })) || [];
        setDirectContacts(contacts);

        if (!activeContact && contacts.length > 0) {
          setActiveContact(contacts[0].id);
        }
      } catch (err) {
        console.error("Failed to load contacts:", err);
      } finally {
        setLoadingContacts(false);
      }
    };
    loadContacts();
  }, [userId, activeContact]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res = await api.get("/chat/groups");
        if (res.data.success) {
          setCustomGroups(res.data.groups || []);
        }
      } catch (err) { console.error("Failed to load groups:", err); }
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

  const loadMessages = useCallback(async (contactId = activeContact) => {
    if (!contactId) return;
    setLoadingMessages(true);
    try {
      const isGroup = isGroupId(contactId);
      const res = await api.get("/chat", {
        params: { contactId, type: isGroup ? "group" : "direct" },
      });
      const msgs = res.data?.messages || [];
      setMessages((prev) => ({ ...prev, [contactId]: msgs }));

      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        setLastMessages((prev) => ({ ...prev, [contactId]: lastMsg }));
      }
    } catch (err) { console.error("Failed to load messages:", err); } finally {
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
      loadMessages(activeContact);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    }
  }, [activeContact, userId, user, loadMessages]);

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
