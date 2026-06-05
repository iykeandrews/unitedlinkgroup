import { AlertTriangle, Info, CheckCircle, Trash2, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItemProps {
  notification: any;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen?: (notification: any) => void;
}

export default function NotificationItem({ notification, onRead, onDelete, onOpen }: NotificationItemProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING':
      case 'ALERT':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PAYROLL':
        return <Mail className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(notification)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onOpen?.(notification);
      }}
      className={`group w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
        notification.read
          ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'
          : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800 shadow-sm hover:shadow-md'
      }`}
    >
      <div className={`mt-1 p-2 rounded-full ${
        notification.read ? 'bg-gray-100 dark:bg-slate-700' : 'bg-white dark:bg-slate-800 shadow-sm'
      }`}>
        {getIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className={`text-sm font-semibold ${
            notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'
          }`}>
            {notification.title}
          </h4>
          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className={`text-sm mt-1 line-clamp-2 ${
          notification.read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'
        }`}>
          {notification.message}
        </p>
      </div>

      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification.id);
            }}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title="Mark as read"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Archive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
