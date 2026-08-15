import { WhatsAppParserDrawer } from './WhatsAppParserDrawer';

export function InvoiceEditorGrid() {
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-md space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Invoice & Ledger Automator</h1>
        <p className="text-slate-500 text-sm">Interactive billing, price intelligence, and ledger management grid.</p>
      </div>

      <WhatsAppParserDrawer />

      <div className="border rounded-lg p-6 bg-slate-50">
        <h3 className="font-semibold text-slate-700 mb-2">Invoice Line Items</h3>
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-200 text-slate-700 uppercase text-xs">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Rate (₹)</th>
              <th className="p-3">GST %</th>
              <th className="p-3">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b bg-white">
              <td className="p-3 font-medium text-slate-800">HDPE Granules</td>
              <td className="p-3">10.000</td>
              <td className="p-3">120.00</td>
              <td className="p-3">18%</td>
              <td className="p-3 font-semibold text-slate-900">₹1,416.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
