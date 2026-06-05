import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Edit2,
  AlertTriangle, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  author: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  scheduledAt?: string;
  isRead: boolean;
  targetType: string;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}

export default function AnnouncementCard({ 
  announcement, 
  onMarkRead, 
  onDelete,
  onEdit,
  canDelete = false 
}: AnnouncementCardProps & { onEdit?: (announcement: Announcement) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const priorityConfig = {
    NORMAL: { color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400', icon: Info },
    HIGH: { color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400', icon: AlertTriangle },
    URGENT: { color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400', icon: Megaphone },
  };

  const config = priorityConfig[announcement.priority] || priorityConfig.NORMAL;
  const Icon = config.icon;

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!announcement.isRead && !isExpanded) {
      onMarkRead(announcement.id);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 overflow-hidden",
        !announcement.isRead ? "border-indigo-200 dark:border-indigo-800 shadow-sm" : "border-gray-200 dark:border-slate-700",
        isExpanded ? "shadow-lg ring-1 ring-indigo-500/10" : "hover:shadow-md"
      )}
    >
      {/* Unread Indicator */}
      {!announcement.isRead && (
        <div className="absolute top-0 right-0 p-3">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        </div>
      )}

      <div className="p-5 cursor-pointer" onClick={handleExpand}>
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl shrink-0", config.color)}>
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={cn(
                    "text-lg font-semibold transition-colors",
                    !announcement.isRead ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                  )}>
                    {announcement.title}
                  </h3>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium border",
                    config.color.replace('bg-', 'border-').replace('text-', 'border-')
                  )}>
                    {announcement.priority}
                  </span>
                  {announcement.targetType !== 'ALL' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-600">
                      To: {announcement.targetType}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>{announcement.author.firstName} {announcement.author.lastName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{format(new Date(announcement.createdAt), 'MMM d, yyyy • h:mm a')}</span>
                  </div>
                  {announcement.scheduledAt && (
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <Calendar className="w-4 h-4" />
                      <span>Scheduled: {format(new Date(announcement.scheduledAt), 'MMM d')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(announcement);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Edit Announcement"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(announcement.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="p-2 text-gray-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pl-[4.5rem]">
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
              </div>
              
              {!announcement.isRead && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead(announcement.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Read
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
