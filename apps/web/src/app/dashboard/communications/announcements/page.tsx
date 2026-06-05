'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Megaphone } from 'lucide-react';
import api from '@/lib/api';
import AnnouncementCard from '@/components/announcements/AnnouncementCard';
import CreateAnnouncementModal from '@/components/announcements/CreateAnnouncementModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (error) {
      console.error('Failed to fetch announcements', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.post(`/announcements/${id}/read`);
      // Optimistically update
      setAnnouncements(prev => prev.map(a => 
        a.id === id ? { ...a, isRead: true } : a
      ));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete announcement', error);
    }
  };

  const handleEdit = (announcement: any) => {
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'ALL' || a.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with company news and important alerts
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <div className="flex items-center gap-2 text-sm font-medium relative">
            <Plus className="w-4 h-4" />
            <span>Create Announcement</span>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'NORMAL', 'HIGH', 'URGENT'].map((priority) => (
            <button
              key={priority}
              onClick={() => setFilterPriority(priority)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filterPriority === priority
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {priority === 'ALL' ? 'All Updates' : priority.charAt(0) + priority.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline/Feed */}
      <div className="relative">
        {/* Timeline Line (Optional visual guide) */}
        <div className="absolute left-[39px] top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700 hidden md:block" />

        <div className="space-y-6">
          <AnimatePresence>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading announcements...</div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
                <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No announcements found</h3>
                <p className="text-gray-500 text-sm">Create a new announcement to get started.</p>
              </div>
            ) : (
              filteredAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  canDelete={true} // In real app, check user role
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAnnouncement(null);
        }}
        onSuccess={fetchAnnouncements}
        initialData={selectedAnnouncement}
      />
    </div>
  </div>
  );
}
