import { format } from 'date-fns';
import { Mail, Clock, CheckCircle, AlertCircle, Trash2, Send } from 'lucide-react';

interface EmailCampaignListProps {
  campaigns: any[];
  onDelete: (id: string) => void;
  onSend: (id: string) => void;
}

export default function EmailCampaignList({ campaigns, onDelete, onSend }: EmailCampaignListProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 font-medium">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">To</th>
              <th className="px-6 py-4">Sent/Scheduled</th>
              <th className="px-6 py-4">Recipients</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  No email campaigns found
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {campaign.subject}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200">
                      {campaign.targetType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {campaign.sentAt 
                      ? format(new Date(campaign.sentAt), 'MMM d, h:mm a')
                      : campaign.scheduledAt 
                        ? format(new Date(campaign.scheduledAt), 'MMM d, h:mm a')
                        : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {campaign.recipientCount > 0 ? campaign.recipientCount : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {campaign.status === 'DRAFT' && (
                        <button
                          onClick={() => onSend(campaign.id)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Send Now"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(campaign.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400',
    SCHEDULED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    SENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const icons = {
    DRAFT: Mail,
    SCHEDULED: Clock,
    SENT: CheckCircle,
    FAILED: AlertCircle,
  };

  const Icon = icons[status as keyof typeof icons] || Mail;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
}
