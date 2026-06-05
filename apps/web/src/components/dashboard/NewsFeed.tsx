import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface NewsFeedProps {
  userProfile: any;
}

export function NewsFeed({ userProfile }: NewsFeedProps) {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements');
        // Ensure they are sorted by date (newest first)
        const sorted = res.data.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAnnouncements(sorted.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch announcements', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const isAdmin = userProfile?.role === 'BUSINESS_ADMIN' || userProfile?.role === 'SUPER_ADMIN';

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
      case 'HIGH':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
      default:
        return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Company Updates</h2>
        </div>
        {isAdmin && (
          <button 
            onClick={() => router.push('/dashboard/communications/announcements')}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Post Update
          </button>
        )}
      </div>
      
      <div className="p-6 space-y-8 flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading updates...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No recent announcements</div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="group flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`
                flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm
                ${getPriorityColor(announcement.priority)}
              `}>
                {getInitials(announcement.author.firstName, announcement.author.lastName)}
              </div>
              
              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {announcement.title}
                      {announcement.priority === 'URGENT' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          Urgent
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                      <span>{announcement.author.firstName} {announcement.author.lastName}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl rounded-tl-none border border-gray-100 dark:border-slate-700/50 text-gray-600 dark:text-slate-400 text-xs line-clamp-2 overflow-hidden [&_*]:m-0 [&_*]:inline">
                   <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50">
        <button 
          onClick={() => router.push('/dashboard/communications/announcements')}
          className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-xl transition-all"
        >
          View All Updates
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
