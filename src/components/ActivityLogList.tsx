import { ActivityLog } from '../types';
import { Clock, PlusCircle, Pencil, Trash2, Activity } from 'lucide-react';

interface ActivityLogListProps {
  logs: ActivityLog[];
}

export function ActivityLogList({ logs }: ActivityLogListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <PlusCircle className="w-4 h-4 text-emerald-600" />;
      case 'UPDATE': return <Pencil className="w-4 h-4 text-blue-600" />;
      case 'DELETE': return <Trash2 className="w-4 h-4 text-rose-600" />;
      default: return <Activity className="w-4 h-4 text-zinc-600" />;
    }
  };

  const getActionBg = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 border-emerald-100';
      case 'UPDATE': return 'bg-blue-50 border-blue-100';
      case 'DELETE': return 'bg-rose-50 border-rose-100';
      default: return 'bg-zinc-50 border-zinc-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-full">
      <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Log Aktivitas Sistem</h2>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[600px] p-6 sm:p-8">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>Belum ada aktivitas yang dicatat.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-zinc-100 ml-4 space-y-8">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-8">
                <span className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-2 ring-4 ring-white ${getActionBg(log.action)}`}>
                  {getActionIcon(log.action)}
                </span>
                <div className="bg-white border border-zinc-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm text-zinc-800 font-medium mb-2">{log.details}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
