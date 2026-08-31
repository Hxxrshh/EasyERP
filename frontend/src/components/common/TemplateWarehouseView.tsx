import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, getBaseUrl } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorAlert } from './ErrorAlert';
import {
  Search,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';

interface TemplateWarehouseViewProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const TemplateWarehouseView: React.FC<TemplateWarehouseViewProps> = ({
  isOpen = true,
}) => {
  const { activeRole } = useAuth();
  const toast = useToast();

  const [catalog, setCatalog] = useState<any[]>([]);
  const [defaultGstKey, setDefaultGstKey] = useState('gst_classic');
  const [defaultNonGstKey, setDefaultNonGstKey] = useState('non_gst_classic');

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewTemplateKey, setPreviewTemplateKey] = useState<string | null>(null);
  const [demoHtml, setDemoHtml] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchWarehouse();
  }, []);

  useEffect(() => {
    if (previewTemplateKey) {
      fetchDemoHtml(previewTemplateKey);
    }
  }, [previewTemplateKey]);

  const fetchWarehouse = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get<any>('/templates');
      setCatalog(res.available_templates || []);
      setDefaultGstKey(res.default_gst_template || 'gst_classic');
      setDefaultNonGstKey(res.default_non_gst_template || 'non_gst_classic');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load template warehouse catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDemoHtml = async (key: string) => {
    setIsLoadingDemo(true);
    setDemoError(null);
    const token = localStorage.getItem('auth_token');
    const orgId = localStorage.getItem('active_organization_id');

    try {
      const url = `${getBaseUrl()}/templates/preview-demo?template_key=${key}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'text/html',
          'Authorization': `Bearer ${token || ''}`,
          'X-Organization-Id': orgId || '',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Failed to load demo template preview.' }));
        throw new Error(errJson.message || `Demo preview failed with HTTP ${res.status}`);
      }

      const htmlText = await res.text();
      setDemoHtml(htmlText);
    } catch (err: any) {
      setDemoError(err.message || 'Failed to render demo template HTML.');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleSetDefaultGst = async (key: string) => {
    if (activeRole !== 'admin') {
      toast.error('Only Administrators can configure organization default templates.');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post('/organization/templates', {
        default_gst_template: key,
        default_non_gst_template: defaultNonGstKey,
      });
      setDefaultGstKey(key);
      toast.success(`Default GST template updated to '${key}'.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update organization default template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefaultNonGst = async (key: string) => {
    if (activeRole !== 'admin') {
      toast.error('Only Administrators can configure organization default templates.');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post('/organization/templates', {
        default_gst_template: defaultGstKey,
        default_non_gst_template: key,
      });
      setDefaultNonGstKey(key);
      toast.success(`Default Non-GST template updated to '${key}'.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update organization default template.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCatalog = catalog.filter((tmpl) => {
    const tmplKey = tmpl.key || tmpl.template_key || '';
    const tmplName = tmpl.name || tmpl.template_name || '';
    const tmplDesc = tmpl.description || '';

    const matchesCat = selectedCategory === 'All' || tmpl.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesQuery =
      tmplName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmplKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmplDesc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const categories = ['All', 'GST Tax Invoice', 'Commercial Bill', 'Commercial Proposal', 'Advance Request', 'Goods Outward'];

  if (!isOpen) return null;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              SPECIMEN GALLERY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500">Document Layout Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Document Template Studio
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Curated presentation styles for official GST invoices, commercial bills, export proformas, and delivery challans.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-extrabold text-stone-700 bg-white/90 p-2.5 rounded-2xl border border-stone-900/[0.06] shadow-xs">
          <span className="text-[10px] text-stone-400 uppercase tracking-wider">Defaults:</span>
          <span className="bg-[#D4F442] text-stone-950 px-2 py-0.5 rounded-md text-[10px] font-bold">GST: {defaultGstKey}</span>
          <span className="bg-stone-900 text-stone-100 px-2 py-0.5 rounded-md text-[10px] font-bold">Non-GST: {defaultNonGstKey}</span>
        </div>
      </div>

      {errorMsg && <ErrorAlert title="Warehouse Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Filter and Search Bar */}
      <div className="bg-white/85 backdrop-blur-md p-5 rounded-3xl border border-stone-900/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search specimen styles..."
            className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Catalog Grid */}
      {isLoading ? (
        <LoadingSpinner label="Loading document template specimens..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCatalog.map((tmpl) => {
            const tmplKey = tmpl.key || tmpl.template_key;
            const tmplName = tmpl.name || tmpl.template_name;
            const isDefaultGst = tmplKey === defaultGstKey;
            const isDefaultNonGst = tmplKey === defaultNonGstKey;

            return (
              <div
                key={tmplKey}
                className="bg-white/85 backdrop-blur-md border border-stone-900/[0.06] rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-stone-900/[0.15] transition-all flex flex-col justify-between group"
              >
                {/* Structural Header */}
                <div className="p-6 bg-stone-900 text-white space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-[#D4F442] tracking-wider">
                      {tmpl.category}
                    </span>
                    <div className="flex space-x-1">
                      {isDefaultGst && (
                        <span className="px-2 py-0.5 bg-[#D4F442] text-stone-950 rounded-md text-[9px] font-extrabold">
                          GST DEFAULT
                        </span>
                      )}
                      {isDefaultNonGst && (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-950 rounded-md text-[9px] font-extrabold">
                          NON-GST DEFAULT
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-extrabold text-lg tracking-tight text-white">{tmplName}</h3>
                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                </div>

                {/* Structure details */}
                <div className="p-5 space-y-2 flex-1 text-xs text-stone-600 bg-stone-50/50">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Document Support</span>
                      <strong className="text-stone-900 capitalize">{tmpl.supported_document_types?.join(', ') || 'invoice'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Taxation</span>
                      <strong className="text-stone-900 capitalize">{tmpl.supported_tax_modes?.join(', ') || 'taxable'}</strong>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-stone-100 bg-white flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => setPreviewTemplateKey(tmplKey)}
                    className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-stone-700" />
                    <span>Visual Render</span>
                  </button>

                  {activeRole === 'admin' && (
                    <div className="flex items-center space-x-1">
                      {!isDefaultGst && tmpl.category.toLowerCase().includes('gst') && (
                        <button
                          onClick={() => handleSetDefaultGst(tmplKey)}
                          disabled={isSaving}
                          className="px-2.5 py-1.5 bg-[#D4F442]/20 hover:bg-[#D4F442] text-stone-950 font-bold rounded-xl text-[10px] cursor-pointer transition-all border border-[#D4F442]/40"
                        >
                          Set Default
                        </button>
                      )}
                      {!isDefaultNonGst && !tmpl.category.toLowerCase().includes('gst') && (
                        <button
                          onClick={() => handleSetDefaultNonGst(tmplKey)}
                          disabled={isSaving}
                          className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-[10px] cursor-pointer transition-all"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visual HTML Preview Modal */}
      {previewTemplateKey && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-4xl w-full h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-stone-900/[0.08] animate-pop-in">
            <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-[#D4F442]" />
                <h3 className="font-extrabold text-sm tracking-tight text-white">
                  Visual Layout Simulation — {previewTemplateKey.toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => {
                  setPreviewTemplateKey(null);
                  setDemoHtml(null);
                }}
                className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-stone-200/70 p-6 overflow-auto flex justify-center">
              {isLoadingDemo ? (
                <LoadingSpinner label="Rendering live HTML specimen layout..." />
              ) : demoError ? (
                <ErrorAlert title="Preview Error" message={demoError} />
              ) : (
                <iframe
                  title="Template Preview"
                  srcDoc={demoHtml || ''}
                  className="w-full max-w-3xl h-full bg-white shadow-2xl rounded-2xl border border-stone-300"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
