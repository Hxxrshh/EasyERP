import React, { useState } from 'react';
import { useAuditLogsQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const AuditTrailWorkspace: React.FC = () => {
  const { data: auditData, isLoading, error } = useAuditLogsQuery();
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  if (isLoading) {
    return <LoadingSpinner label="Loading forensic audit trail logs..." />;
  }

  const logs = auditData?.data || [];

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              COMPLIANCE & FORENSICS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500">{auditData?.total || 0} Immutable Entries</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            System Security & Audit Trail
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Immutable log recording document creations, conversions, cancellations, payment allocation adjustments, and historical corrections.
          </p>
        </div>
      </div>

      {error && <ErrorAlert title="Audit Log Error" message={(error as Error).message} />}

      {/* Audit Log Table */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-stone-900/[0.06] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-900/[0.05]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">User / Actor</th>
                <th className="p-4">Action Event</th>
                <th className="p-4">Auditable Target</th>
                <th className="p-4 text-center">State Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-4 font-mono font-medium text-stone-500 text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-stone-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-[10px]">
                            {log.user?.name?.charAt(0) || 'U'}
                          </div>
                          <span>{log.user?.name || `User #${log.user_id || 'System'}`}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-stone-100 text-stone-900 rounded-full font-mono font-extrabold text-[10px] uppercase border border-stone-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-stone-600 font-medium">
                        {log.auditable_type.split('\\').pop()} #{log.auditable_id}
                      </td>
                      <td className="p-4 text-center">
                        {(log.before_data || log.after_data) && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center space-x-1 mx-auto cursor-pointer transition-colors"
                          >
                            <span>{isExpanded ? 'Hide Diff' : 'View Diff'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded JSON State Diff Row */}
                    {isExpanded && (
                      <tr className="bg-stone-50/50">
                        <td colSpan={5} className="p-6 border-b border-stone-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            {log.before_data && (
                              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                                <div className="font-extrabold text-rose-950 mb-2 uppercase text-[10px]">
                                  State Before Action:
                                </div>
                                <pre className="whitespace-pre-wrap text-[11px] text-rose-900 bg-white/80 p-3 rounded-xl border border-rose-200/50 overflow-x-auto">
                                  {JSON.stringify(log.before_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after_data && (
                              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                <div className="font-extrabold text-emerald-950 mb-2 uppercase text-[10px]">
                                  State After Action:
                                </div>
                                <pre className="whitespace-pre-wrap text-[11px] text-emerald-900 bg-white/80 p-3 rounded-xl border border-emerald-200/50 overflow-x-auto">
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
                  <td colSpan={5} className="p-12 text-center text-stone-400 italic">
                    No forensic audit log events recorded yet.
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
