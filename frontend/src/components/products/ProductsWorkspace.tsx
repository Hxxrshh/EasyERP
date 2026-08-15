import React, { useState } from 'react';
import { useMetaQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Search } from 'lucide-react';

export const ProductsWorkspace: React.FC = () => {
  const { data: metaData, isLoading } = useMetaQuery();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return <LoadingSpinner label="Loading product catalog..." />;
  }

  const products = metaData?.products || [];
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hsn_code && p.hsn_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Product Catalog ({products.length})</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configured organization products, HSN codes, default rates, and GST tax percentages.</p>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product name, HSN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>
      </div>

      {/* Product Catalog Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">HSN Code</th>
                <th className="p-3">Unit (UQC)</th>
                <th className="p-3 text-right">Base Price (₹)</th>
                <th className="p-3 text-center">Default GST %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{product.name}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">{product.hsn_code || 'NA'}</td>
                  <td className="p-3 font-medium">{product.unit || 'NOS'}</td>
                  <td className="p-3 text-right font-extrabold text-slate-900">₹{Number(product.base_price).toFixed(2)}</td>
                  <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/50">{product.default_gst_rate}%</td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                    No products found matching search criteria.
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
