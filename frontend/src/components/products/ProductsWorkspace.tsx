import React, { useState } from 'react';
import { useProductsQuery } from '../../hooks/useApiQueries';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { CreateProductModal } from './CreateProductModal';
import { ProductActionModal } from './ProductActionModal';
import { PriceComparisonDrawer } from './PriceComparisonDrawer';
import { ShortcutHint } from '../ui/ShortcutHint';
import {
  PackagePlus,
  Search,
  Archive,
  RotateCcw,
  Trash2,
  BarChart3,
} from 'lucide-react';
import type { Product } from '../../types';

export const ProductsWorkspace: React.FC = () => {
  const { activeRole } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const { data: productsData, isLoading, error } = useProductsQuery({
    include_archived: showArchived ? true : undefined,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Lifecycle modal states
  const [selectedActionProduct, setSelectedActionProduct] = useState<Product | null>(null);
  const [actionModalMode, setActionModalMode] = useState<'archive' | 'delete' | 'restore'>('archive');

  // Price comparison drawer state
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonTargetProductId, setComparisonTargetProductId] = useState<number | null>(null);

  if (isLoading) {
    return <LoadingSpinner label="Loading products & pricing catalog..." />;
  }

  const products = productsData?.data || [];
  const filteredProducts = products.filter((p: Product) => {
    const q = searchQuery.toLowerCase();
    const name = p.name.toLowerCase();
    const hsn = (p.hsn_code || '').toLowerCase();
    return name.includes(q) || hsn.includes(q);
  });

  const handleOpenComparison = (productId?: number) => {
    if (productId) setComparisonTargetProductId(productId);
    setIsComparisonOpen(true);
  };

  const handleOpenActionModal = (product: Product, mode: 'archive' | 'delete' | 'restore') => {
    setSelectedActionProduct(product);
    setActionModalMode(mode);
  };

  return (
    <div className="space-y-8">
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <ProductActionModal
        isOpen={Boolean(selectedActionProduct)}
        product={selectedActionProduct}
        mode={actionModalMode}
        onClose={() => setSelectedActionProduct(null)}
      />

      <PriceComparisonDrawer
        isOpen={isComparisonOpen}
        initialProductId={comparisonTargetProductId}
        onClose={() => {
          setIsComparisonOpen(false);
          setComparisonTargetProductId(null);
        }}
      />

      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              CATALOG & VALUATION
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              {products.length} Products Registered
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Products & Rate Master
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Centralized goods and services catalog with default GST rates, HSN tax classifications, base reference pricing, and cross-client price intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* COMPARE PRICES Button */}
          <Button
            variant="secondary"
            onClick={() => handleOpenComparison()}
            icon={<BarChart3 className="w-4 h-4 text-purple-700" />}
          >
            <span>Compare Prices</span>
          </Button>

          {/* Show Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center space-x-1.5 ${
              showArchived
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
          </button>

          {activeRole !== 'auditor' && (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              icon={<PackagePlus className="w-4 h-4 text-stone-950" />}
            >
              <span>Add Product</span>
              <ShortcutHint type="newProduct" className="ml-1" />
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorAlert title="Catalog Error" message={(error as Error).message} />}

      {/* Filter and Search Bar */}
      <div className="bg-white/85 backdrop-blur-md p-5 rounded-3xl border border-stone-900/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product name or HSN code..."
            className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product: Product) => (
          <div
            key={product.id}
            className={`bg-white/85 backdrop-blur-md border rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
              product.is_archived
                ? 'border-amber-300/80 bg-amber-50/20'
                : 'border-stone-900/[0.06] hover:border-stone-900/[0.12]'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase font-mono text-stone-400">
                    HSN {product.hsn_code || 'N/A'}
                  </span>
                  {product.is_archived && (
                    <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                      ARCHIVED
                    </span>
                  )}
                </div>
                <span className="px-2.5 py-0.5 bg-stone-100 text-stone-900 rounded-full text-[10px] font-extrabold border border-stone-200">
                  {product.default_gst_rate}% GST
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-stone-900 text-lg tracking-tight">
                  {product.name}
                </h3>
                {product.short_name && (
                  <span className="text-[10px] font-mono text-stone-400 block mt-0.5">
                    Parser Code: {product.short_name}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Base Price</span>
                <div className="text-xl font-extrabold text-stone-900">
                  ₹{Number(product.base_price).toFixed(2)}
                  <span className="text-xs text-stone-500 font-medium ml-1">/ {product.unit}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenComparison(product.id)}
                  title="Compare client prices for this product"
                  className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>

                {activeRole === 'admin' && (
                  <>
                    {product.is_archived ? (
                      <button
                        onClick={() => handleOpenActionModal(product, 'restore')}
                        title="Restore Product"
                        className="px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenActionModal(product, 'archive')}
                        title="Archive or Delete Product"
                        className="p-2 bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 border border-stone-200 rounded-xl text-xs font-bold flex items-center cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full p-12 text-center text-stone-400 bg-white/80 rounded-3xl border border-stone-900/[0.06] italic">
            No products found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};
