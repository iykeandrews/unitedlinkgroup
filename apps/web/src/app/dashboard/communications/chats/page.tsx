'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowDown,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Trash2,
  X,
  Users
} from 'lucide-react';
import api from '../../../../lib/api';
import { Modal } from '../../../../components/Modal';
import { toast } from 'sonner';
import { UserRole } from '@unitedlinkgroup/types';

type ThreadType = 'DIRECT' | 'GROUP';

type ChatThread = {
  id: string;
  type: ThreadType;
  title: string | null;
  imageUrl: string | null;
  displayTitle: string;
  displayImageUrl: string | null;
  updatedAt: string;
  unreadCount: number;
  participants: Array<{
    employeeId: string;
    role: string;
    lastReadAt: string | null;
    employee: { id: string; firstName: string; lastName: string; email: string; badgeNumber: string | null; status: string };
  }>;
  lastMessage: null | {
    id: string;
    text: string | null;
    createdAt: string;
    senderEmployeeId: string;
    senderName: string;
    attachments: Array<{ id: string; type: string; url: string; originalName?: string | null; mimeType?: string | null }>;
  };
};

type ThreadDetail = {
  id: string;
  type: ThreadType;
  title: string | null;
  imageUrl: string | null;
  myRole: string | null;
  myLastReadAt: string | null;
  participants: Array<{
    employeeId: string;
    role: string;
    lastReadAt: string | null;
    employee: { id: string; firstName: string; lastName: string; email: string; badgeNumber: string | null; status: string };
  }>;
};

type ChatAttachment = {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'FILE';
  url: string;
  filename?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

type ChatReaction = { id: string; emoji: string; employeeId: string; employeeName: string };

type ChatMessage = {
  id: string;
  threadId: string;
  senderEmployeeId: string;
  senderName: string;
  text: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  replyTo: null | { id: string; senderEmployeeId: string; senderName: string; text: string | null };
  attachments: ChatAttachment[];
  reactions: ChatReaction[];
  pending?: boolean;
  clientId?: string | null;
};

type Employee = { id: string; firstName: string; lastName: string; email: string; badgeNumber?: string | null; status?: string };

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDay(ts: string) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return '';
  }
}

function fileUrlToAbsolute(url: string) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const path = `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  if (!url.startsWith('/uploads/')) return path;
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return path;
    const u = new URL(path);
    u.searchParams.set('token', token);
    return u.toString();
  } catch {
    return path;
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return (a + b).toUpperCase();
}

function Avatar({ name, imageUrl, size = 40 }: { name: string; imageUrl?: string | null; size?: number }) {
  if (imageUrl) {
    return (
      <img
        src={fileUrlToAbsolute(imageUrl)}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover border border-gray-200 dark:border-slate-700"
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-white/30"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </div>
  );
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '✅', '👀', '🤝', '💯', '🚀', '😄', '😡', '🤔', '🙌', '⭐️'];

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading chats…</div>}>
      <ChatsPageInner />
    </Suspense>
  );
}

function ChatsPageInner() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'DIRECT' | 'GROUP'>('GROUP');
  const [createTitle, setCreateTitle] = useState('');
  const [createImageUrl, setCreateImageUrl] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [manageAddEmployeeId, setManageAddEmployeeId] = useState('');
  const [managing, setManaging] = useState(false);
  const [manageTitle, setManageTitle] = useState('');
  const [manageImageUrl, setManageImageUrl] = useState<string | null>(null);

  const [presence, setPresence] = useState<Record<string, { online: boolean; lastSeenAt: string | null }>>({});
  const [typing, setTyping] = useState<Record<string, Record<string, boolean>>>({});
  const [socketEmployeeId, setSocketEmployeeId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ messageId: string; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChatMessage | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const currentEmployeeId = profile?.employeeId || socketEmployeeId || null;
  const role = profile?.role || null;
  const canAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN;

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const groupImageInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const dropActiveRef = useRef(false);
  const [groupImageTarget, setGroupImageTarget] = useState<'create' | 'manage'>('create');
  const [deeplinkMessageId, setDeeplinkMessageId] = useState<string | null>(null);
  const deeplinkAttemptsRef = useRef(0);
  const lastDeeplinkKeyRef = useRef<string | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const isNearBottomRef = useRef(true);
  const unseenNewRef = useRef(0);
  const scrollFetchInFlightRef = useRef(false);
  const lastMessagesScrollTopRef = useRef<number | null>(null);
  const pendingPrependScrollRef = useRef<{ height: number; top: number } | null>(null);

  const deeplinkThreadId = searchParams.get('threadId');
  const deeplinkTargetMessageId = searchParams.get('messageId');

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    unseenNewRef.current = 0;
    isNearBottomRef.current = true;
    setShowJumpToBottom(false);
    endRef.current?.scrollIntoView({ behavior });
  };

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.displayTitle.toLowerCase().includes(q) || (t.lastMessage?.text || '').toLowerCase().includes(q));
  }, [threads, query]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const threadId = deeplinkThreadId;
    if (!threadId) return;
    if (loadingThreads) return;
    if (selectedThreadId === threadId) return;
    const exists = threads.some((t) => t.id === threadId);
    if (!exists) return;
    selectThread(threadId);
  }, [deeplinkThreadId, loadingThreads, threads, selectedThreadId]);

  useEffect(() => {
    const threadId = deeplinkThreadId;
    const messageId = deeplinkTargetMessageId;
    if (!threadId || !messageId) return;
    if (selectedThreadId !== threadId) return;
    const key = `${threadId}:${messageId}`;
    if (lastDeeplinkKeyRef.current === key) return;
    lastDeeplinkKeyRef.current = key;
    deeplinkAttemptsRef.current = 0;
    setDeeplinkMessageId(messageId);
  }, [deeplinkThreadId, deeplinkTargetMessageId, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    if (!deeplinkMessageId) return;
    if (loadingMessages || loadingMore) return;

    const el = document.getElementById(`m_${deeplinkMessageId}`);
    if (el) {
      const container = messagesRef.current;
      if (container) {
        const c = container.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const target = container.scrollTop + (r.top - c.top) - (c.height / 2) + (r.height / 2);
        container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setHighlightMessageId(deeplinkMessageId);
      const id = deeplinkMessageId;
      setDeeplinkMessageId(null);
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightMessageId((prev) => (prev === id ? null : prev));
      }, 3500);
      return;
    }

    if (messages.length === 0) return;
    if (deeplinkAttemptsRef.current >= 8) {
      setDeeplinkMessageId(null);
      return;
    }
    deeplinkAttemptsRef.current += 1;
    fetchMessages(selectedThreadId, messages[0].createdAt, 'prepend');
  }, [selectedThreadId, deeplinkMessageId, loadingMessages, loadingMore, messages]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const selectedTypingIds = useMemo(() => {
    if (!selectedThreadId) return [];
    const map = typing[selectedThreadId] || {};
    return Object.entries(map)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .filter((id) => id !== currentEmployeeId);
  }, [typing, selectedThreadId, currentEmployeeId]);

  const canEditMessage = (m: ChatMessage) => {
    if (!currentEmployeeId) return false;
    if (m.deletedAt) return false;
    if (!canAdmin && m.senderEmployeeId !== currentEmployeeId) return false;
    const ageMs = now - new Date(m.createdAt).getTime();
    if (ageMs > 30 * 60 * 1000) return false;
    const hasReply = messages.some((x) => x.replyTo?.id === m.id);
    if (hasReply) return false;
    return true;
  };

  const otherParticipant = useMemo(() => {
    if (!selectedThread || selectedThread.type !== 'DIRECT' || !currentEmployeeId) return null;
    return selectedThread.participants.find((p) => p.employeeId !== currentEmployeeId) || null;
  }, [selectedThread, currentEmployeeId]);

  const otherPresence = otherParticipant ? presence[otherParticipant.employeeId] : null;

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setProfile(res.data || null);
    } catch {
      setProfile(null);
    }
  };

  const fetchThreads = async () => {
    try {
      setLoadingThreads(true);
      const res = await api.get('/chats/threads');
      setThreads(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load chats');
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees/chat-directory');
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEmployees([]);
    }
  };

  const fetchThreadDetail = async (threadId: string) => {
    try {
      const res = await api.get(`/chats/threads/${threadId}`);
      setSelectedThread(res.data || null);
      setManageTitle(res.data?.title || '');
      setManageImageUrl(res.data?.imageUrl || null);
    } catch {
      setSelectedThread(null);
    }
  };

  const fetchMessages = async (threadId: string, before?: string, mode: 'replace' | 'prepend' = 'replace') => {
    try {
      if (mode === 'replace') setLoadingMessages(true);
      if (mode === 'prepend') {
        setLoadingMore(true);
        const container = messagesRef.current;
        if (container) {
          pendingPrependScrollRef.current = { height: container.scrollHeight, top: container.scrollTop };
        }
      }
      const res = await api.get(`/chats/threads/${threadId}/messages`, { params: { take: 50, ...(before ? { before } : {}) } });
      const incoming = Array.isArray(res.data) ? (res.data as ChatMessage[]) : [];
      setMessages((prev) => (mode === 'replace' ? incoming : [...incoming, ...prev]));
      if (mode === 'prepend') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const pending = pendingPrependScrollRef.current;
            const container = messagesRef.current;
            if (!pending || !container) return;
            const newHeight = container.scrollHeight;
            container.scrollTop = pending.top + (newHeight - pending.height);
            pendingPrependScrollRef.current = null;
          });
        });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load messages');
      if (mode === 'replace') setMessages([]);
    } finally {
      setLoadingMessages(false);
      setLoadingMore(false);
    }
  };

  const connectSocket = () => {
    if (socketRef.current) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const selectedBusinessRaw = typeof window !== 'undefined' ? localStorage.getItem('selectedBusiness') : null;
    let businessId: string | null = null;
    if (selectedBusinessRaw) {
      try {
        const parsed = JSON.parse(selectedBusinessRaw);
        if (parsed?.id) businessId = parsed.id;
      } catch {}
    }
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    const socket = io(base, {
      auth: { token, businessId },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('socket:ready', (e: any) => {
      const employeeId = e?.employeeId || null;
      setSocketEmployeeId(employeeId);
    });

    socket.on('disconnect', () => {
      setSocketEmployeeId(null);
    });

    socket.on('presence:update', (p: any) => {
      if (!p?.employeeId) return;
      setPresence((prev) => ({ ...prev, [p.employeeId]: { online: !!p.online, lastSeenAt: p.lastSeenAt || null } }));
    });

    socket.on('presence:snapshot', (entries: any) => {
      if (!Array.isArray(entries)) return;
      setPresence((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          if (!entry?.employeeId) continue;
          next[entry.employeeId] = {
            online: !!entry.online,
            lastSeenAt: entry.lastSeenAt || null,
          };
        }
        return next;
      });
    });

    socket.on('typing:update', (e: any) => {
      const threadId = e?.threadId;
      const employeeId = e?.employeeId;
      const isTyping = !!e?.typing;
      if (!threadId || !employeeId) return;
      setTyping((prev) => ({
        ...prev,
        [threadId]: { ...(prev[threadId] || {}), [employeeId]: isTyping },
      }));
    });

    socket.on('read:update', (e: any) => {
      const threadId = e?.threadId;
      const employeeId = e?.employeeId;
      const lastReadAt = e?.lastReadAt;
      if (!threadId || !employeeId) return;
      setThreads((prev) =>
        prev.map((t) =>
          t.id !== threadId
            ? t
            : {
                ...t,
                participants: t.participants.map((p) => (p.employeeId === employeeId ? { ...p, lastReadAt } : p)),
                unreadCount: employeeId === currentEmployeeId ? 0 : t.unreadCount,
              }
        )
      );
      setSelectedThread((prev) =>
        prev && prev.id === threadId
          ? {
              ...prev,
              participants: prev.participants.map((p) => (p.employeeId === employeeId ? { ...p, lastReadAt } : p)),
            }
          : prev
      );
    });

    socket.on('message:new', (m: any) => {
      if (!m?.threadId || !m?.id) return;
      const message = m as ChatMessage;
      setThreads((prev) =>
        prev
          .map((t) =>
            t.id !== message.threadId
              ? t
              : {
                  ...t,
                  updatedAt: message.createdAt,
                  lastMessage: {
                    id: message.id,
                    text: message.text,
                    createdAt: message.createdAt,
                    senderEmployeeId: message.senderEmployeeId,
                    senderName: message.senderName,
                    attachments: (message.attachments || []).map((a) => ({
                      id: a.id,
                      type: a.type,
                      url: a.url,
                      originalName: a.originalName,
                      mimeType: a.mimeType,
                    })),
                  },
                  unreadCount:
                    selectedThreadId === message.threadId || message.senderEmployeeId === currentEmployeeId
                      ? t.unreadCount
                      : (t.unreadCount || 0) + 1,
                }
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );

      setMessages((prev) => {
        if (selectedThreadId !== message.threadId) return prev;
        if (message.clientId) {
          const idx = prev.findIndex((p) => p.clientId && p.clientId === message.clientId);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = { ...message, pending: false };
            return next;
          }
        }
        if (prev.some((p) => p.id === message.id)) return prev;
        return [...prev, message];
      });

      if (selectedThreadId === message.threadId) {
        const shouldAutoscroll = isNearBottomRef.current || message.senderEmployeeId === currentEmployeeId;
        if (shouldAutoscroll) {
          requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('smooth')));
        } else {
          unseenNewRef.current += 1;
          setShowJumpToBottom(true);
        }
        socket.emit('read:mark', { threadId: message.threadId });
        try {
          window.dispatchEvent(new Event('notifications:refresh'));
        } catch {}
      }
    });

    socket.on('message:ack', (ack: any) => {
      const clientId = ack?.clientId;
      const messageId = ack?.messageId;
      const createdAt = ack?.createdAt;
      if (!clientId || !messageId) return;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.clientId === clientId);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = { ...next[idx], id: messageId, createdAt, pending: false };
        return next;
      });
    });

    socket.on('message:updated', (e: any) => {
      const messageId = e?.messageId;
      const text = e?.text;
      const editedAt = e?.editedAt || null;
      if (!messageId) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, text, editedAt } : m)));
    });

    socket.on('message:deleted', (e: any) => {
      const messageId = e?.messageId;
      const deletedAt = e?.deletedAt || new Date().toISOString();
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: null, deletedAt, attachments: [], reactions: [], replyTo: m.replyTo } : m
        )
      );
    });

    socket.on('reactions:updated', (e: any) => {
      const messageId = e?.messageId;
      const reactions = Array.isArray(e?.reactions) ? (e.reactions as ChatReaction[]) : null;
      if (!messageId || !reactions) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    });
  };

  const joinThreadRoom = (threadId: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('thread:join', { threadId });
  };

  const leaveThreadRoom = (threadId: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('thread:leave', { threadId });
  };

  const selectThread = async (threadId: string) => {
    if (selectedThreadId) leaveThreadRoom(selectedThreadId);
    setSelectedThreadId(threadId);
    setSelectedThread(null);
    setMessages([]);
    setReplyTo(null);
    setEmojiOpen(false);
    lastMessagesScrollTopRef.current = null;

    joinThreadRoom(threadId);
    await Promise.all([fetchThreadDetail(threadId), fetchMessages(threadId)]);
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)));
    socketRef.current?.emit('read:mark', { threadId });
    if (!socketRef.current || !socketRef.current.connected) {
      try {
        await api.post(`/chats/threads/${threadId}/read`);
      } catch {}
    }
    try {
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch {}
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('auto')));
  };

  const onScrollMessages = async () => {
    const el = messagesRef.current;
    if (!el || loadingMore || loadingMessages || !selectedThreadId) return;

    const prevTop = lastMessagesScrollTopRef.current;
    const currentTop = el.scrollTop;
    const scrollingUp = prevTop !== null ? currentTop < prevTop : false;
    lastMessagesScrollTopRef.current = currentTop;

    const delta = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = delta < 140;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      unseenNewRef.current = 0;
      setShowJumpToBottom(false);
    }

    if (!scrollingUp) return;
    if (el.scrollTop > 50) return;
    if (scrollFetchInFlightRef.current) return;
    const first = messages[0];
    if (!first?.createdAt) return;
    scrollFetchInFlightRef.current = true;
    try {
      await fetchMessages(selectedThreadId, first.createdAt, 'prepend');
    } finally {
      scrollFetchInFlightRef.current = false;
    }
  };

  const sendTyping = (on: boolean) => {
    const socket = socketRef.current;
    if (!socket || !selectedThreadId) return;
    socket.emit(on ? 'typing:start' : 'typing:stop', { threadId: selectedThreadId });
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const sendMessage = async (attachments?: ChatAttachment[]) => {
    const mergedAttachments = [...pendingAttachments, ...(attachments || [])];
    if (!selectedThreadId || (!draft.trim() && mergedAttachments.length === 0)) return;
    const socket = socketRef.current;
    const clientId = `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const text = draft.trim();
    setDraft('');
    setEmojiOpen(false);
    setPendingAttachments([]);

    const apiAttachments = mergedAttachments.map((a) => ({
      type: a.type,
      url: a.url,
      filename: a.filename,
      originalName: a.originalName,
      mimeType: a.mimeType,
      size: a.size,
    }));

    if (!socket || !socket.connected) {
      try {
        const res = await api.post(`/chats/threads/${selectedThreadId}/messages`, {
          text: text || undefined,
          replyToId: replyTo?.id || undefined,
          attachments: apiAttachments,
        });
        const serverSenderEmployeeId = res.data?.senderEmployeeId || null;
        if (!currentEmployeeId && serverSenderEmployeeId) {
          setSocketEmployeeId(serverSenderEmployeeId);
        }
        setReplyTo(null);
        await Promise.all([fetchMessages(selectedThreadId), fetchThreads()]);
        requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('smooth')));
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to send message');
      } finally {
        sendTyping(false);
      }
      return;
    }

    const optimistic: ChatMessage = {
      id: clientId,
      threadId: selectedThreadId,
      senderEmployeeId: currentEmployeeId || 'me',
      senderName: 'You',
      text: text || null,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      replyTo: replyTo
        ? { id: replyTo.id, senderEmployeeId: replyTo.senderEmployeeId, senderName: replyTo.senderName, text: replyTo.text }
        : null,
      attachments: mergedAttachments,
      reactions: [],
      pending: true,
      clientId,
    };

    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('smooth')));

    socket.emit('message:send', {
      threadId: selectedThreadId,
      clientId,
      text: text || undefined,
      replyToId: replyTo?.id || undefined,
      attachments: apiAttachments,
    });

    sendTyping(false);
  };

  const insertEmoji = (emoji: string) => {
    const el = composerRef.current;
    if (!el) {
      setDraft((p) => `${p}${emoji}`);
      setEmojiOpen(false);
      return;
    }
    const start = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
    const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : el.value.length;
    setDraft((prev) => `${prev.slice(0, start)}${emoji}${prev.slice(end)}`);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch {}
    });
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    const uploaded: ChatAttachment[] = [];
    for (const file of arr) {
      const form = new FormData();
      form.append('file', file);
      try {
        const isImage = typeof file.type === 'string' && file.type.startsWith('image/');
        const isVideo = typeof file.type === 'string' && file.type.startsWith('video/');
        const endpoint = isImage ? '/uploads/images' : '/uploads';
        const res = await api.post(endpoint, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data?.url as string;
        const mimeType = file.type || null;
        const type: ChatAttachment['type'] =
          isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE';
        uploaded.push({
          id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          type,
          url,
          filename: res.data?.filename || null,
          originalName: res.data?.originalName || file.name,
          mimeType,
          size: file.size,
        });
      } catch (e: any) {
        toast.error(e?.response?.data?.message || `Upload failed: ${file.name}`);
      }
    }

    if (uploaded.length) {
      setPendingAttachments((prev) => [...prev, ...uploaded]);
      requestAnimationFrame(() => composerRef.current?.focus());
    }
  };

  const uploadGroupImage = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/uploads/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data?.url as string;
  };

  const openCreate = async () => {
    setCreateMode(canAdmin ? 'GROUP' : 'DIRECT');
    setCreateTitle('');
    setCreateImageUrl(null);
    setSelectedEmployeeId('');
    setSelectedMembers({});
    await fetchEmployees();
    setCreateOpen(true);
  };

  const createThread = async () => {
    try {
      setCreating(true);
      if (createMode === 'DIRECT') {
        if (!selectedEmployeeId) {
          toast.error('Select an employee');
          return;
        }
        const res = await api.post('/chats/threads/direct', { employeeId: selectedEmployeeId });
        setCreateOpen(false);
        await fetchThreads();
        if (res.data?.id) await selectThread(res.data.id);
        return;
      }

      const title = createTitle.trim();
      if (!title) {
        toast.error('Group name is required');
        return;
      }
      const memberEmployeeIds = Object.entries(selectedMembers)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (!currentEmployeeId && memberEmployeeIds.length === 0) {
        toast.error('Select at least one member');
        return;
      }
      const res = await api.post('/chats/threads/group', { title, imageUrl: createImageUrl || undefined, memberEmployeeIds });
      setCreateOpen(false);
      await fetchThreads();
      if (res.data?.id) await selectThread(res.data.id);
      toast.success('Group created');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  const updateGroup = async () => {
    if (!selectedThreadId) return;
    try {
      setManaging(true);
      await api.patch(`/chats/threads/${selectedThreadId}`, { title: manageTitle.trim(), imageUrl: manageImageUrl || undefined });
      await Promise.all([fetchThreadDetail(selectedThreadId), fetchThreads()]);
      toast.success('Group updated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update group');
    } finally {
      setManaging(false);
    }
  };

  const addMember = async () => {
    if (!selectedThreadId || !manageAddEmployeeId) return;
    try {
      setManaging(true);
      await api.post(`/chats/threads/${selectedThreadId}/members`, { employeeId: manageAddEmployeeId });
      setManageAddEmployeeId('');
      await Promise.all([fetchThreadDetail(selectedThreadId), fetchThreads()]);
      toast.success('Member added');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to add member');
    } finally {
      setManaging(false);
    }
  };

  const removeMember = async (employeeId: string) => {
    if (!selectedThreadId) return;
    try {
      setManaging(true);
      await api.delete(`/chats/threads/${selectedThreadId}/members/${employeeId}`);
      await Promise.all([fetchThreadDetail(selectedThreadId), fetchThreads()]);
      toast.success('Member removed');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to remove member');
    } finally {
      setManaging(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const socket = socketRef.current;
    if (!selectedThreadId) return;

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const has = m.reactions?.some((r) => r.emoji === emoji && r.employeeId === currentEmployeeId);
        if (has) {
          return { ...m, reactions: m.reactions.filter((r) => !(r.emoji === emoji && r.employeeId === currentEmployeeId)) };
        }
        return {
          ...m,
          reactions: [
            ...(m.reactions || []),
            { id: `r_${Date.now()}`, emoji, employeeId: currentEmployeeId || 'me', employeeName: 'You' },
          ],
        };
      })
    );

    if (!socket || !socket.connected) {
      const msg = messages.find((m) => m.id === messageId);
      const has = msg?.reactions?.some((r) => r.emoji === emoji && r.employeeId === currentEmployeeId);
      try {
        if (has) {
          await api.delete(`/chats/messages/${messageId}/reactions`, { params: { emoji } });
        } else {
          await api.post(`/chats/messages/${messageId}/reactions`, { emoji });
        }
        await fetchMessages(selectedThreadId);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to update reaction');
      }
      return;
    }

    socket.emit('reaction:toggle', { messageId, emoji });
  };

  const handleDrop = async (files: FileList) => {
    dropActiveRef.current = false;
    await uploadFiles(files);
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetchProfile().then(() => {
      connectSocket();
    });
    fetchThreads();
  }, []);

  useEffect(() => {
    unseenNewRef.current = 0;
    isNearBottomRef.current = true;
    setShowJumpToBottom(false);
  }, [selectedThreadId]);

  useEffect(() => {
    return () => {
      if (selectedThreadId) leaveThreadRoom(selectedThreadId);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [selectedThreadId]);

  const selectedMemberIds = useMemo(() => new Set((selectedThread?.participants || []).map((p) => p.employeeId)), [selectedThread?.participants]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 w-full p-6 min-h-0">
        <div className="flex items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">Chats</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Real-time messaging</div>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-14rem)] min-h-0">
          <div className={`lg:col-span-4 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden flex flex-col min-h-0 ${isMobile && selectedThreadId ? 'hidden' : ''}`}>
            <div className="p-4 border-b border-gray-200/60 dark:border-slate-700/60">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chats"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
              {loadingThreads ? (
                <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading chats…</div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-6 text-sm text-gray-500 dark:text-gray-400">No chats found.</div>
              ) : (
                <div className="divide-y divide-gray-200/60 dark:divide-slate-700/60">
                  {filteredThreads.map((t) => {
                    const active = t.id === selectedThreadId;
                    return (
                      <motion.button
                        key={t.id}
                        type="button"
                        onClick={() => selectThread(t.id)}
                        className={`w-full text-left p-4 transition-colors ${
                          active ? 'bg-indigo-50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800/40'
                        }`}
                        whileHover={{ x: 2 }}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar name={t.displayTitle} imageUrl={t.displayImageUrl} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-semibold text-gray-900 dark:text-white truncate">{t.displayTitle}</div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {t.lastMessage ? formatTime(t.lastMessage.createdAt) : ''}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {t.lastMessage
                                  ? `${t.type === 'GROUP' ? `${t.lastMessage.senderName}: ` : ''}${t.lastMessage.text || (t.lastMessage.attachments?.length ? 'Attachment' : '')}`
                                  : 'No messages yet'}
                              </div>
                              <div className="flex items-center gap-2">
                                {t.type === 'GROUP' && (
                                  <div className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                                    <Users className="h-3.5 w-3.5" />
                                    {t.participants.length}
                                  </div>
                                )}
                                {t.unreadCount > 0 && (
                                  <div className="min-w-5 h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                                    {t.unreadCount > 99 ? '99+' : t.unreadCount}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div
            className={`lg:col-span-8 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden flex flex-col min-h-0 ${
              isMobile && !selectedThreadId ? 'hidden' : ''
            }`}
            onDragEnter={(e) => {
              if (!selectedThreadId) return;
              e.preventDefault();
              dropActiveRef.current = true;
            }}
            onDragOver={(e) => {
              if (!selectedThreadId) return;
              e.preventDefault();
              dropActiveRef.current = true;
            }}
            onDrop={(e) => {
              if (!selectedThreadId) return;
              e.preventDefault();
              if (e.dataTransfer.files?.length) handleDrop(e.dataTransfer.files);
            }}
          >
            <div className="p-4 border-b border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  {isMobile && selectedThreadId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedThreadId(null);
                        setSelectedThread(null);
                        setMessages([]);
                      }}
                      className="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40"
                    >
                      <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </button>
                  )}
                  {selectedThreadId ? (
                    <>
                      <Avatar
                        name={selectedThread?.title || threads.find((t) => t.id === selectedThreadId)?.displayTitle || 'Chat'}
                        imageUrl={selectedThread?.imageUrl || threads.find((t) => t.id === selectedThreadId)?.displayImageUrl}
                        size={38}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {selectedThread?.type === 'GROUP'
                            ? selectedThread?.title || 'Group'
                            : threads.find((t) => t.id === selectedThreadId)?.displayTitle || 'Chat'}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {selectedThread?.type === 'DIRECT' && otherParticipant ? (
                            otherPresence?.online ? (
                              'Online'
                            ) : otherPresence?.lastSeenAt ? (
                              `Last seen ${formatDay(otherPresence.lastSeenAt)} ${formatTime(otherPresence.lastSeenAt)}`
                            ) : (
                              'Offline'
                            )
                          ) : selectedThread?.type === 'GROUP' ? (
                            `${selectedThread.participants.length} members`
                          ) : (
                            ' '
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="font-semibold text-gray-900 dark:text-white truncate">Select a chat</div>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedThreadId ? '' : 'Choose a conversation from the left'}
                </div>
              </div>
              {selectedThreadId && selectedThread?.type === 'GROUP' && canAdmin && (
                <button
                  type="button"
                  onClick={async () => {
                    await fetchEmployees();
                    setManageAddEmployeeId('');
                    setManageOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                >
                  <Settings className="h-4 w-4" />
                  Manage
                </button>
              )}
            </div>

            <div ref={messagesRef} onScroll={onScrollMessages} className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
              {!selectedThreadId ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">Select a chat to start messaging.</div>
              ) : loadingMessages ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading messages…</div>
              ) : loadingMore ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading more…</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No messages yet.</div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const mine =
                      (!!currentEmployeeId && m.senderEmployeeId === currentEmployeeId) ||
                      (!currentEmployeeId &&
                        role === UserRole.SUPER_ADMIN &&
                        (m.senderEmployeeId === 'me' || m.senderName === 'You'));
                    const directRead =
                      selectedThread?.type === 'DIRECT' &&
                      mine &&
                      otherParticipant?.lastReadAt &&
                      new Date(otherParticipant.lastReadAt).getTime() >= new Date(m.createdAt).getTime();

                    const bubbleColor = mine
                      ? role === UserRole.SUPER_ADMIN
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-200 dark:border-slate-700';

                  return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[86%] rounded-2xl px-4 py-3 border ${bubbleColor} ${
                            highlightMessageId === m.id ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''
                          }`}
                        >
                          <div className={`text-xs flex items-center justify-between gap-3 ${mine ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            <div className="truncate">
                              {m.senderName || 'Unknown'} • {formatTime(m.createdAt)}
                              {m.editedAt ? ' • edited' : ''}
                              {m.pending ? ' • sending…' : ''}
                            </div>
                            {mine && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span>{directRead ? '✓✓' : '✓'}</span>
                              </div>
                            )}
                          </div>

                          {m.replyTo && (
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`m_${m.replyTo?.id}`);
                                if (!el) return;
                                const container = messagesRef.current;
                                if (container) {
                                  const c = container.getBoundingClientRect();
                                  const r = el.getBoundingClientRect();
                                  const target = container.scrollTop + (r.top - c.top) - (c.height / 2) + (r.height / 2);
                                  container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
                                } else {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                              className={`mt-2 w-full text-left rounded-xl px-3 py-2 border ${
                                mine ? 'border-white/20 bg-white/10' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40'
                              }`}
                            >
                              <div className={`text-[11px] font-semibold ${mine ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-300'}`}>{m.replyTo.senderName}</div>
                              <div className={`text-xs truncate ${mine ? 'text-indigo-50' : 'text-gray-500 dark:text-gray-400'}`}>{m.replyTo.text || 'Message'}</div>
                            </button>
                          )}

                          <div id={`m_${m.id}`} className="mt-2 text-sm whitespace-pre-wrap break-words">
                            {m.deletedAt ? (
                              <span className="italic opacity-80">Message deleted</span>
                            ) : editing?.messageId === m.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editing.text}
                                  onChange={(e) => setEditing({ messageId: m.id, text: e.target.value })}
                                  rows={2}
                                  className={`w-full resize-none rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    mine ? 'bg-white/10 border-white/20 text-white placeholder:text-indigo-100' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                                  }`}
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                      mine ? 'border-white/20 bg-white/10 text-white' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200'
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const socket = socketRef.current;
                                      const text = editing.text.trim();
                                      if (!text) return;
                                      if (!canEditMessage(m)) {
                                        toast.error('You can only edit within 30 minutes and before any replies');
                                        setEditing(null);
                                        return;
                                      }
                                      if (!socket || !socket.connected) {
                                        try {
                                          const res = await api.patch(`/chats/messages/${m.id}`, { text });
                                          const editedAt = res?.data?.editedAt || new Date().toISOString();
                                          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, text, editedAt } : x)));
                                        } catch (e: any) {
                                          toast.error(e?.response?.data?.message || 'Failed to edit message');
                                        }
                                        setEditing(null);
                                        return;
                                      }
                                      socket.emit('message:edit', { messageId: m.id, text });
                                      setEditing(null);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                      mine ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
                                    }`}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              m.text
                            )}
                          </div>

                          {m.attachments?.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {m.attachments.map((a) => {
                                const abs = fileUrlToAbsolute(a.url);
                                const isImage = a.type === 'IMAGE';
                                const isVideo = a.type === 'VIDEO';
                                return (
                                  <a
                                    key={a.id}
                                    href={abs}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`rounded-xl overflow-hidden border ${mine ? 'border-white/20 bg-white/10' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40'} hover:opacity-95 transition-opacity`}
                                  >
                                    {isImage ? (
                                      <img src={abs} alt={a.originalName || 'image'} className="w-full h-44 object-cover" />
                                    ) : isVideo ? (
                                      <video src={abs} controls className="w-full h-44 object-cover" />
                                    ) : (
                                      <div className="p-3 text-xs">
                                        <div className={`font-semibold ${mine ? 'text-indigo-50' : 'text-gray-700 dark:text-gray-200'}`}>{a.originalName || 'File'}</div>
                                        <div className={`${mine ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>{a.mimeType || 'document'}</div>
                                      </div>
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {m.reactions?.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {Object.entries(
                                    m.reactions.reduce<Record<string, number>>((acc, r) => {
                                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                      return acc;
                                    }, {})
                                  ).map(([emoji, count]) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => toggleReaction(m.id, emoji)}
                                      className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                                        mine ? 'border-white/20 bg-white/10 text-white' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 text-gray-800 dark:text-gray-200'
                                      }`}
                                    >
                                      {emoji} {count}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {QUICK_EMOJIS.slice(0, 5).map((e) => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => toggleReaction(m.id, e)}
                                  className={`w-8 h-8 rounded-xl text-sm border transition-colors ${
                                    mine ? 'border-white/20 bg-white/10 hover:bg-white/15 text-white' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                                  }`}
                                >
                                  {e}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setReplyTo(m)}
                                className={`w-8 h-8 rounded-xl text-[11px] font-bold border transition-colors ${
                                  mine ? 'border-white/20 bg-white/10 hover:bg-white/15 text-white' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200'
                                }`}
                              >
                                ↩
                              </button>
                              {canEditMessage(m) && (
                                <button
                                  type="button"
                                  onClick={() => setEditing({ messageId: m.id, text: m.text || '' })}
                                  className={`w-8 h-8 rounded-xl border transition-colors flex items-center justify-center ${
                                    mine ? 'border-white/20 bg-white/10 hover:bg-white/15 text-white' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                                  }`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {(mine || canAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(m)}
                                  className={`w-8 h-8 rounded-xl border transition-colors flex items-center justify-center ${
                                    mine ? 'border-white/20 bg-white/10 hover:bg-white/15 text-white' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200'
                                  }`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  );
                  })}
                </AnimatePresence>
              )}
              <div ref={endRef} />
              {selectedThreadId && showJumpToBottom && (
                <div className="sticky bottom-3 flex justify-end pointer-events-none">
                  <button
                    type="button"
                    onClick={() => scrollToBottom('smooth')}
                    className="pointer-events-auto px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 shadow-lg"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Jump to latest
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900">
              {selectedThreadId && selectedTypingIds.length > 0 && (
                <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">{selectedTypingIds.length === 1 ? 'Typing…' : 'Multiple people typing…'}</div>
              )}

              {replyTo && (
                <div className="mb-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200">Replying to {replyTo.senderName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{replyTo.text || 'Message'}</div>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
              )}

              {pendingAttachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingAttachments.map((a) => {
                    const abs = fileUrlToAbsolute(a.url);
                    const isImage = a.type === 'IMAGE';
                    const isVideo = a.type === 'VIDEO';
                    return (
                      <div
                        key={a.id}
                        className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
                      >
                        {isImage ? (
                          <img src={abs} alt={a.originalName || 'image'} className="w-full h-full object-cover" />
                        ) : isVideo ? (
                          <video src={abs} className="w-full h-full object-cover" />
                        ) : (
                          <div className="p-2 text-xs">
                            <div className="font-semibold text-gray-700 dark:text-gray-200 line-clamp-2">{a.originalName || 'File'}</div>
                            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{a.mimeType || 'document'}</div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removePendingAttachment(a.id)}
                          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/55 hover:bg-black/65 text-white flex items-center justify-center"
                          aria-label="Remove attachment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!selectedThreadId}
                    onClick={() => attachmentInputRef.current?.click()}
                    className="w-11 h-11 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/40 flex items-center justify-center disabled:opacity-50"
                  >
                    <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-200" />
                  </button>
                  <button
                    type="button"
                    disabled={!selectedThreadId}
                    onClick={() => setEmojiOpen((v) => !v)}
                    className="w-11 h-11 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/40 flex items-center justify-center disabled:opacity-50"
                  >
                    <Smile className="h-5 w-5 text-gray-600 dark:text-gray-200" />
                  </button>
                </div>

                <div className="flex-1 relative">
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      sendTyping(true);
                    }}
                    onBlur={() => sendTyping(false)}
                    rows={1}
                    disabled={!selectedThreadId}
                    placeholder={selectedThreadId ? 'Write a message…' : 'Select a chat first'}
                    className="w-full resize-none rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />

                  {emojiOpen && selectedThreadId && (
                    <div className="absolute bottom-14 left-0 w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-3 z-50">
                      <div className="grid grid-cols-9 gap-1">
                        {QUICK_EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className="w-9 h-9 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60"
                            onClick={() => insertEmoji(e)}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!selectedThreadId}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>

              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (files) await uploadFiles(files);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New chat" maxWidth="max-w-3xl">
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 w-fit">
            <button
              type="button"
              onClick={() => setCreateMode('DIRECT')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${createMode === 'DIRECT' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/40'}`}
            >
              Direct
            </button>
            {canAdmin && (
              <button
                type="button"
                onClick={() => setCreateMode('GROUP')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${createMode === 'GROUP' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/40'}`}
              >
                Group
              </button>
            )}
          </div>

          {createMode === 'DIRECT' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Employee</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-3 text-sm"
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} — {e.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Group name</label>
                  <input
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-3 text-sm"
                    placeholder="e.g. Operations Team"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Group picture</label>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupImageTarget('create');
                      groupImageInputRef.current?.click();
                    }}
                    className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/40 flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Upload
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Members</label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{Object.values(selectedMembers).filter(Boolean).length} selected</div>
                </div>
                <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  {employees.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No employees found.</div>
                  ) : (
                    <div className="divide-y divide-gray-200/60 dark:divide-slate-700/60">
                      {employees.map((e) => {
                        const checked = !!selectedMembers[e.id];
                        return (
                          <label key={e.id} className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {e.firstName} {e.lastName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.email}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(ev) => setSelectedMembers((p) => ({ ...p, [e.id]: ev.target.checked }))}
                              className="h-4 w-4"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createThread}
              disabled={creating}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={manageOpen} onClose={() => setManageOpen(false)} title="Manage group" maxWidth="max-w-4xl">
        {!selectedThreadId || !selectedThread || selectedThread.type !== 'GROUP' ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Select a group first.</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Group info</div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Name</label>
                  <input
                    value={manageTitle}
                    onChange={(e) => setManageTitle(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Picture</label>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupImageTarget('manage');
                      groupImageInputRef.current?.click();
                    }}
                    className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/40 flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Upload
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={updateGroup}
                  disabled={managing}
                  className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Add member</div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={manageAddEmployeeId}
                  onChange={(e) => setManageAddEmployeeId(e.target.value)}
                  className="md:col-span-2 w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-3 text-sm"
                >
                  <option value="">Select employee…</option>
                  {employees
                    .filter((e) => (e.status || 'ACTIVE') === 'ACTIVE')
                    .filter((e) => !selectedMemberIds.has(e.id))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} — {e.email}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={addMember}
                  disabled={managing || !manageAddEmployeeId}
                  className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Members</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{selectedThread.participants.length} total</div>
              </div>
              <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-gray-200/60 dark:divide-slate-700/60">
                {selectedThread.participants.map((p) => (
                  <div key={p.employeeId} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {p.employee.firstName} {p.employee.lastName}
                        {p.role === 'ADMIN' && <span className="ml-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">Admin</span>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.employee.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMember(p.employeeId)}
                      disabled={managing}
                      className="px-3 py-2 rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 text-sm font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setManageOpen(false)}
                className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <input
        ref={groupImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const url = await uploadGroupImage(file);
            if (groupImageTarget === 'create') setCreateImageUrl(url);
            else setManageImageUrl(url);
            toast.success('Image uploaded');
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Image upload failed');
          } finally {
            e.target.value = '';
          }
        }}
      />

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete message" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Delete this message for everyone in the chat?</div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const socket = socketRef.current;
                if (socket && confirmDelete?.id) {
                  socket.emit('message:delete', { messageId: confirmDelete.id });
                }
                setConfirmDelete(null);
              }}
              className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
