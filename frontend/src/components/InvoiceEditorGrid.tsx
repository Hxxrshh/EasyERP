import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useMetaQuery, useInvoicesQuery } from '../hooks/useApiQueries';
import { LoadingSpinner } from './common/LoadingSpinner';
import { ErrorAlert } from './common/ErrorAlert';
import { WhatsAppParserDrawer } from './WhatsAppParserDrawer';

export const InvoiceEditorGrid: React.FC = () => {
  const { user, activeOrganization, activeRole } = useAuth();
  const { data: metaData, isLoading: isMetaLoading, error: metaError } = useMetaQuery();
  const { data: invoicesData, isLoading: isInvoicesLoading } = useInvoicesQuery();

  if (isMetaLoading) {
    return <LoadingSpinner label="Connecting to ACCURA Financial API..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-8 bg-white/85 backdrop-blur-md rounded-3xl shadow-xs border border-stone-900/[0.06] space-y-6">
      <div className="border-b border-stone-100 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">ACCURA Financial Operations</h1>
          <p className="text-stone-500 text-xs">
            Organization: <strong className="text-stone-800">{activeOrganization?.name || 'N/A'}</strong> (State: {activeOrganization?.state || 'N/A'}) | Role: <span className="font-semibold text-stone-900 uppercase">{activeRole || 'Guest'}</span>
          </p>
        </div>
        {user && (
          <div className="text-right text-xs text-stone-500">
            Authenticated as: <strong className="text-stone-700">{user.name}</strong> ({user.email})
          </div>
        )}
      </div>

      {metaError && (
        <ErrorAlert title="Metadata Connection Error" message={(metaError as Error).message} />
      )}

      <WhatsAppParserDrawer />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clients Card */}
        <div className="border border-stone-100 rounded-2xl p-5 bg-stone-50/50">
          <h3 className="font-bold text-stone-700 mb-2 text-xs uppercase tracking-wider">Registered Clients ({metaData?.clients.length || 0})</h3>
          <ul className="text-xs text-stone-600 space-y-1.5">
            {metaData?.clients.map((client) => (
              <li key={client.id} className="p-2 bg-white rounded-xl border border-stone-100 flex justify-between">
                <span><strong>{client.name}</strong> ({client.company_name || 'Individual'})</span>
                <span className="text-stone-400">{client.state}</span>
              </li>
            ))}
            {(!metaData?.clients || metaData.clients.length === 0) && (
              <li className="text-stone-400 italic">No clients registered.</li>
            )}
          </ul>
        </div>

        {/* Products Card */}
        <div className="border border-stone-100 rounded-2xl p-5 bg-stone-50/50">
          <h3 className="font-bold text-stone-700 mb-2 text-xs uppercase tracking-wider">Product Catalog ({metaData?.products.length || 0})</h3>
          <ul className="text-xs text-stone-600 space-y-1.5">
            {metaData?.products.map((product) => (
              <li key={product.id} className="p-2 bg-white rounded-xl border border-stone-100 flex justify-between">
                <span><strong>{product.name}</strong> (HSN: {product.hsn_code || 'N/A'})</span>
                <span className="font-bold text-stone-900">₹{product.base_price} ({product.default_gst_rate}% GST)</span>
              </li>
            ))}
            {(!metaData?.products || metaData.products.length === 0) && (
              <li className="text-stone-400 italic">No products in catalog.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Invoices List */}
      <div className="border border-stone-100 rounded-2xl p-6 bg-stone-50/50 space-y-3">
        <h3 className="font-bold text-stone-700 text-xs uppercase tracking-wider">Recent Documents ({invoicesData?.total || 0})</h3>
        {isInvoicesLoading ? (
          <LoadingSpinner label="Loading documents..." />
        ) : (
          <div className="border border-stone-100 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-100">
                <tr>
                  <th className="p-3">Doc #</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invoicesData?.data.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/50">
                    <td className="p-3 font-semibold text-stone-900 font-mono">{inv.invoice_number || 'Draft'}</td>
                    <td className="p-3 uppercase text-[10px] font-bold text-stone-600">{inv.document_type}</td>
                    <td className="p-3">{inv.client?.name || `Client #${inv.client_id}`}</td>
                    <td className="p-3">{inv.date}</td>
                    <td className="p-3 text-right font-bold text-stone-900">₹{inv.total_amount}</td>
                    <td className="p-3 capitalize font-bold text-xs">
                      <span className={inv.status === 'finalized' ? 'text-emerald-600' : inv.status === 'cancelled' ? 'text-rose-600' : 'text-amber-600'}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!invoicesData?.data || invoicesData.data.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-stone-400 italic">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
