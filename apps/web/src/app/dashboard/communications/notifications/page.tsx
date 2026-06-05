'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Filter, RefreshCw, Search, ExternalLink, MessageSquare, Trash2, Square, CheckSquare } from 'lucide-react';
import api from '../../../../lib/api';
import NotificationItem from '../../../../components/notifications/NotificationItem';
import { Modal } from '../../../../components/Modal';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [sort, setSort] = useState<'NEWEST' | 'OLDEST' | 'UNREAD_FIRST'>('NEWEST');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const [conversationEmployeeId, setConversationEmployeeId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [replyText, setReplyText] = useState('');

  const lastOpenedReadRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      try {
        window.dispatchEvent(new Event('notifications:refresh'));
      } catch {}
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      try {
        window.dispatchEvent(new Event('notifications:refresh'));
      } catch {}
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (activeId === id) setActiveId(null);
      try {
        window.dispatchEvent(new Event('notifications:refresh'));
      } catch {}
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const markSelectedAsRead = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const unreadIds = ids.filter((id) => {
      const n = notifications.find((x) => x.id === id);
      return n && !n.read;
    });
    if (unreadIds.length === 0) return;
    await Promise.all(unreadIds.map((id) => api.patch(`/notifications/${id}/read`).catch(() => null)));
    setNotifications((prev) => prev.map((n) => (selectedIds.has(n.id) ? { ...n, read: true } : n)));
    try {
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch {}
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => api.delete(`/notifications/${id}`).catch(() => null)));
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    clearSelection();
    setActiveId(null);
    try {
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch {}
  };

  const safeParseMetadata = (raw: any) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw !== 'string') return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const buildActionUrl = (n: any, meta: any) => {
    const threadId = meta?.threadId || null;
    const messageId = meta?.messageId || null;
    if (meta?.kind === 'CHAT' || (threadId && n.type === 'CHAT')) {
      const q = new URLSearchParams();
      if (threadId) q.set('threadId', String(threadId));
      if (messageId) q.set('messageId', String(messageId));
      return `/dashboard/communications/chats${q.toString() ? `?${q.toString()}` : ''}`;
    }
    if (meta?.shiftId) return '/dashboard/scheduling';
    if (meta?.incidentId) return '/dashboard/security/incidents';
    return null;
  };

  const activeNotification = useMemo(() => notifications.find((n) => n.id === activeId) || null, [notifications, activeId]);
  const activeMeta = useMemo(() => safeParseMetadata(activeNotification?.metadata), [activeNotification]);
  const activeActionUrl = useMemo(() => (activeNotification ? buildActionUrl(activeNotification, activeMeta) : null), [activeNotification, activeMeta]);

  useEffect(() => {
    const onRefresh = () => fetchNotifications();
    window.addEventListener('notifications:refresh', onRefresh as any);
    const interval = window.setInterval(onRefresh, 30_000);
    return () => {
      window.removeEventListener('notifications:refresh', onRefresh as any);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!activeNotification) return;
    if (activeNotification.read) return;
    if (lastOpenedReadRef.current.has(activeNotification.id)) return;
    lastOpenedReadRef.current.add(activeNotification.id);
    handleMarkAsRead(activeNotification.id);
  }, [activeNotification]);

  useEffect(() => {
    if (!activeNotification) {
      setConversationEmployeeId(null);
      setConversationMessages([]);
      setReplyText('');
      return;
    }
    const employeeId = activeMeta?.employeeId ? String(activeMeta.employeeId) : null;
    const shouldOpenConversation = Boolean(employeeId && activeNotification.type === 'MESSAGE');
    if (!shouldOpenConversation) {
      setConversationEmployeeId(null);
      setConversationMessages([]);
      setReplyText('');
      return;
    }
    setConversationEmployeeId(employeeId);
    setConversationLoading(true);
    api
      .get(`/notifications/conversation/${employeeId}`)
      .then((res) => setConversationMessages(res.data || []))
      .catch(() => setConversationMessages([]))
      .finally(() => setConversationLoading(false));
  }, [activeNotification, activeMeta]);

  const sendReply = async () => {
    if (!conversationEmployeeId) return;
    const text = replyText.trim();
    if (!text) return;
    try {
      setReplyText('');
      await api.post('/notifications/conversation', { employeeId: conversationEmployeeId, text });
      const res = await api.get(`/notifications/conversation/${conversationEmployeeId}`);
      setConversationMessages(res.data || []);
      try {
        window.dispatchEvent(new Event('notifications:refresh'));
      } catch {}
    } catch (error) {
      console.error('Failed to send reply', error);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredNotifications = useMemo(() => {
    const now = Date.now();
    return notifications
      .filter((n) => {
        if (statusFilter === 'UNREAD' && n.read) return false;
        if (statusFilter === 'READ' && !n.read) return false;
        if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
        if (normalizedSearch) {
          const hay = `${n.title || ''} ${n.message || ''}`.toLowerCase();
          if (!hay.includes(normalizedSearch)) return false;
        }
        if (dateFilter !== 'ALL') {
          const created = new Date(n.createdAt).getTime();
          const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
          if (dateFilter === '1' && ageDays > 1) return false;
          if (dateFilter === '7' && ageDays > 7) return false;
          if (dateFilter === '30' && ageDays > 30) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'UNREAD_FIRST') {
          if (!!a.read !== !!b.read) return a.read ? 1 : -1;
        }
        const at = new Date(a.createdAt).getTime();
        const bt = new Date(b.createdAt).getTime();
        return sort === 'OLDEST' ? at - bt : bt - at;
      });
  }, [notifications, statusFilter, typeFilter, dateFilter, normalizedSearch, sort]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, dateFilter, normalizedSearch, sort]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const readCount = useMemo(() => notifications.filter((n) => n.read).length, [notifications]);
  const totalCount = notifications.length;
  const recent7dCount = useMemo(() => {
    const now = Date.now();
    return notifications.filter((n) => now - new Date(n.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
  }, [notifications]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const n of notifications) {
      if (n?.type) set.add(String(n.type));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notifications]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const pageItems = filteredNotifications.slice(startIndex, startIndex + pageSize);

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((n) => selectedIds.has(n.id));
  const anySelected = selectedIds.size > 0;
  const unreadSelectedCount = Array.from(selectedIds).reduce((acc, id) => {
    const n = notifications.find((x) => x.id === id);
    return acc + (n && !n.read ? 1 : 0);
  }, 0);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-sm font-bold px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with system alerts and important events
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchNotifications()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className="text-left p-5 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 transition-colors shadow-sm"
        >
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalCount}</div>
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">All notifications</div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('UNREAD')}
          className="text-left p-5 rounded-2xl border border-indigo-200/60 dark:border-indigo-700/40 bg-indigo-50/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/15 transition-colors shadow-sm"
        >
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Unread</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{unreadCount}</div>
            <CheckSquare className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Needs attention</div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('READ')}
          className="text-left p-5 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 transition-colors shadow-sm"
        >
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Read</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{readCount}</div>
            <CheckCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Already reviewed</div>
        </button>
        <button
          type="button"
          onClick={() => setDateFilter('7')}
          className="text-left p-5 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 transition-colors shadow-sm"
        >
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Last 7 days</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{recent7dCount}</div>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Recent activity</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                statusFilter === 'UNREAD'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              Unread
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('READ')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                statusFilter === 'READ'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              Read
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All time</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NEWEST">Newest</option>
              <option value="OLDEST">Oldest</option>
              <option value="UNREAD_FIRST">Unread first</option>
            </select>
          </div>
        </div>

        {anySelected && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-indigo-200/60 dark:border-indigo-700/40 bg-indigo-50/60 dark:bg-indigo-900/10 p-3">
            <div className="text-sm text-gray-700 dark:text-gray-200">
              <span className="font-bold">{selectedIds.size}</span> selected
              {unreadSelectedCount > 0 ? <span className="text-gray-500 dark:text-gray-400"> • {unreadSelectedCount} unread</span> : null}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={markSelectedAsRead}
                disabled={unreadSelectedCount === 0}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <CheckCheck className="w-4 h-4" />
                Mark read
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <Trash2 className="w-4 h-4" />
                Archive
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-slate-800/60"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))
        ) : pageItems.length > 0 ? (
          <>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <button
                type="button"
                onClick={() => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (allOnPageSelected) {
                      pageItems.forEach((n) => next.delete(n.id));
                    } else {
                      pageItems.forEach((n) => next.add(n.id));
                    }
                    return next;
                  });
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-900/40"
              >
                {allOnPageSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                Select page
              </button>
              <div>
                Showing <span className="font-semibold">{filteredNotifications.length === 0 ? 0 : startIndex + 1}</span>-
                <span className="font-semibold">{Math.min(startIndex + pageSize, filteredNotifications.length)}</span> of{' '}
                <span className="font-semibold">{filteredNotifications.length}</span>
              </div>
            </div>

            {pageItems.map((notification) => (
              <div key={notification.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelected(notification.id)}
                  className="w-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 flex items-center justify-center"
                  aria-label={selectedIds.has(notification.id) ? 'Deselect notification' : 'Select notification'}
                >
                  {selectedIds.has(notification.id) ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <div className="flex-1">
                  <NotificationItem
                    notification={notification}
                    onRead={handleMarkAsRead}
                    onDelete={handleDelete}
                    onOpen={() => setActiveId(notification.id)}
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={clampedPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Page <span className="font-bold">{clampedPage}</span> / <span className="font-bold">{totalPages}</span>
              </div>
              <button
                type="button"
                disabled={clampedPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
            <p className="text-gray-500 mt-1">No notifications to display.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!activeId && !!activeNotification}
        onClose={() => setActiveId(null)}
        title={activeNotification?.title || 'Notification'}
        maxWidth="max-w-3xl"
      >
        {activeNotification && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{activeNotification.type}</span> •{' '}
                {new Date(activeNotification.createdAt).toLocaleString()}
                {activeNotification.read ? (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    Read
                  </span>
                ) : (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    Unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!activeNotification.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(activeNotification.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark read
                  </button>
                )}
                {activeActionUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(null);
                      router.push(activeActionUrl);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </button>
                )}
                {activeNotification.type === 'MESSAGE' && conversationEmployeeId && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('conversation_panel');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Conversation
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(activeNotification.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Archive
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{activeNotification.message}</div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">Metadata</div>
              <pre className="text-xs rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-700 p-3 overflow-x-auto">
{JSON.stringify(activeMeta || {}, null, 2)}
              </pre>
            </div>

            {activeNotification.type === 'MESSAGE' && conversationEmployeeId && (
              <div id="conversation_panel" className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Message Thread</div>
                  <button
                    type="button"
                    onClick={() => {
                      setConversationLoading(true);
                      api
                        .get(`/notifications/conversation/${conversationEmployeeId}`)
                        .then((res) => setConversationMessages(res.data || []))
                        .catch(() => setConversationMessages([]))
                        .finally(() => setConversationLoading(false));
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 p-4 max-h-[45vh] overflow-y-auto">
                  {conversationLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading conversation...</div>
                  ) : conversationMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No messages yet</div>
                  ) : (
                    conversationMessages.map((msg: any) => (
                      <div key={msg.id} className={`flex ${msg.senderRole === 'EMPLOYEE' ? 'justify-start' : 'justify-end'} mb-3`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-lg text-sm shadow-sm ${
                            msg.senderRole === 'EMPLOYEE'
                              ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          <div className="font-semibold mb-1">
                            {msg.senderRole === 'EMPLOYEE' ? 'Employee' : 'Admin'}
                            {msg.senderName ? ` • ${msg.senderName}` : ''}
                          </div>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          <div className={`${msg.senderRole === 'EMPLOYEE' ? 'text-gray-500' : 'text-indigo-200'} text-xs mt-1`}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a reply..."
                    className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={!replyText.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  </div>
  );
}
