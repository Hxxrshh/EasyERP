import React, { useState } from 'react';
import { useAuditLogsQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { ChevronDown, ChevronUp, User } from 'lucide-react';

export const AuditTrailWorkspace: React.FC = () => {
  const { data: auditData, isLoading, error } = useAuditLogsQuery();
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  if (isLoading) {
    return <LoadingSpinner label="Loading audit trail logs..." />;
  }

  const logs = auditData?.data || [];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System Audit Trail ({auditData?.total || 0})</h2>
          <p className="text-xs text-slate-500 mt-0.5">Immutable audit trail recording document creation, finalization, conversion, cancellation, and payment allocation activity.</p>
        </div>
      </div>

      {error && <ErrorAlert title="Audit Log Error" message={(error as Error).message} />}

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User / Actor</th>
                <th className="p-3">Action Event</th>
                <th className="p-3">Auditable Target</th>
                <th className="p-3 text-center">State Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.user?.name || `User #${log.user_id || 'System'}`}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-bold text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-medium">
                        {log.auditable_type.split('\\').pop()} #{log.auditable_id}
                      </td>
                      <td className="p-3 text-center">
                        {(log.before_data || log.after_data) && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="px-2 py-1 text-xs text-blue-600 font-bold hover:underline flex items-center space-x-1 mx-auto cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Data' : 'View Data'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded JSON State Diff Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="p-4 border-b">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            {log.before_data && (
                              <div className="p-3 bg-rose-50/50 border border-rose-200 rounded">
                                <div className="font-bold text-rose-800 mb-1">State Before Action:</div>
                                <pre className="whitespace-pre-wrap text-[11px] text-slate-700">
                                  {JSON.stringify(log.before_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after_data && (
                              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded">
                                <div className="font-bold text-emerald-800 mb-1">State After Action:</div>
                                <pre className="whitespace-pre-wrap text-[11px] text-slate-700">
                                  {JSON.stringify(log.after_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                    No audit log events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
