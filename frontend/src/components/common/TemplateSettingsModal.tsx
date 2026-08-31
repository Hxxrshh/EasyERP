import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';
import { ErrorAlert } from '../common/ErrorAlert';
import { Layout, CheckCircle, X } from 'lucide-react';

interface TemplateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateSettingsModal: React.FC<TemplateSettingsModalProps> = ({ isOpen, onClose }) => {
  const { activeRole } = useAuth();
  const [defaultGstTemplate, setDefaultGstTemplate] = useState('gst_classic');
  const [defaultNonGstTemplate, setDefaultNonGstTemplate] = useState('non_gst_classic');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get<any>('/templates');
      setDefaultGstTemplate(res.default_gst_template || 'gst_classic');
      setDefaultNonGstTemplate(res.default_non_gst_template || 'non_gst_classic');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load template settings.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      await apiClient.post('/organization/templates', {
        default_gst_template: defaultGstTemplate,
        default_non_gst_template: defaultNonGstTemplate,
      });

      setSuccessMsg('Organization default templates updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update organization default templates.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Layout className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">Default Template Configuration</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {errorMsg && <ErrorAlert title="Template Configuration Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}
          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-950 font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeRole !== 'admin' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-950 rounded-2xl font-medium">
              Only Organization Administrators can modify default invoice templates. Other roles operate in read-only mode.
            </div>
          )}

          <div className="space-y-4">
            <FormSelect
              label="Default Taxable GST Invoice Template"
              disabled={activeRole !== 'admin' || isLoading}
              value={defaultGstTemplate}
              onChange={(e) => setDefaultGstTemplate(e.target.value)}
            >
              <option value="gst_classic">GST Classic — Traditional Indian accounting format</option>
              <option value="gst_modern">GST Modern — Clean hierarchy & modern spacing</option>
              <option value="gst_detailed">GST Detailed — Detailed HSN breakdown tables</option>
            </FormSelect>

            <FormSelect
              label="Default Non-Taxable Order Template"
              disabled={activeRole !== 'admin' || isLoading}
              value={defaultNonGstTemplate}
              onChange={(e) => setDefaultNonGstTemplate(e.target.value)}
            >
              <option value="non_gst_classic">Non-GST Classic — Traditional commercial bill format</option>
              <option value="non_gst_modern">Non-GST Modern — Modern crisp commercial invoice</option>
            </FormSelect>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Close
            </Button>
            {activeRole === 'admin' && (
              <Button variant="primary" type="submit" isLoading={isSaving}>
                Save Defaults
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
