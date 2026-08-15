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
    return <LoadingSpinner label="Connecting to LR Billing API..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-md space-y-6">
      <div className="border-b pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">LR Billing Foundation</h1>
          <p className="text-slate-500 text-sm">
            Organization: <strong className="text-slate-800">{activeOrganization?.name || 'N/A'}</strong> (State: {activeOrganization?.state || 'N/A'}) | Role: <span className="font-semibold text-blue-600 uppercase">{activeRole || 'Guest'}</span>
          </p>
        </div>
        {user && (
          <div className="text-right text-xs text-slate-500">
            Authenticated as: <strong className="text-slate-700">{user.name}</strong> ({user.email})
          </div>
        )}
      </div>

      {metaError && (
        <ErrorAlert title="Metadata Connection Error" message={(metaError as Error).message} />
      )}

      <WhatsAppParserDrawer />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clients Card */}
        <div className="border rounded-lg p-4 bg-slate-50">
          <h3 className="font-bold text-slate-700 mb-2">Registered Clients ({metaData?.clients.length || 0})</h3>
          <ul className="text-xs text-slate-600 space-y-1">
            {metaData?.clients.map((client) => (
              <li key={client.id} className="p-1 bg-white rounded border flex justify-between">
                <span><strong>{client.name}</strong> ({client.company_name || 'Individual'})</span>
                <span className="text-slate-400">{client.state}</span>
              </li>
            ))}
            {(!metaData?.clients || metaData.clients.length === 0) && (
              <li className="text-slate-400 italic">No clients registered.</li>
            )}
          </ul>
        </div>

        {/* Products Card */}
        <div className="border rounded-lg p-4 bg-slate-50">
          <h3 className="font-bold text-slate-700 mb-2">Product Catalog ({metaData?.products.length || 0})</h3>
          <ul className="text-xs text-slate-600 space-y-1">
            {metaData?.products.map((product) => (
              <li key={product.id} className="p-1 bg-white rounded border flex justify-between">
                <span><strong>{product.name}</strong> (HSN: {product.hsn_code || 'N/A'})</span>
                <span className="font-semibold text-slate-800">₹{product.base_price} ({product.default_gst_rate}% GST)</span>
              </li>
            ))}
            {(!metaData?.products || metaData.products.length === 0) && (
              <li className="text-slate-400 italic">No products in catalog.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Invoices List */}
      <div className="border rounded-lg p-6 bg-slate-50">
        <h3 className="font-bold text-slate-700 mb-3">Recent Documents ({invoicesData?.total || 0})</h3>
        {isInvoicesLoading ? (
          <LoadingSpinner label="Loading documents..." />
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-200 text-slate-700 uppercase text-xs">
              <tr>
                <th className="p-3">Doc #</th>
                <th className="p-3">Type</th>
                <th className="p-3">Client</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoicesData?.data.map((inv) => (
                <tr key={inv.id} className="border-b bg-white hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{inv.invoice_number || 'Draft'}</td>
                  <td className="p-3 uppercase text-xs font-bold text-slate-600">{inv.document_type}</td>
                  <td className="p-3">{inv.client?.name || `Client #${inv.client_id}`}</td>
                  <td className="p-3">{inv.date}</td>
                  <td className="p-3 text-right font-semibold text-slate-900">₹{inv.total_amount}</td>
                  <td className="p-3 capitalize font-bold text-xs">
                    <span className={inv.status === 'finalized' ? 'text-emerald-600' : inv.status === 'cancelled' ? 'text-rose-600' : 'text-amber-600'}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!invoicesData?.data || invoicesData.data.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                    No documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
