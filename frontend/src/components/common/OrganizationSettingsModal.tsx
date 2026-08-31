import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorAlert } from './ErrorAlert';
import { Button } from '../ui/Button';
import { Building2, X, CheckCircle, PlusCircle, Edit, ArrowRightLeft } from 'lucide-react';

interface OrganizationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganizationSettingsModal: React.FC<OrganizationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeRole, setActiveOrganizationId } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [org, setOrg] = useState<any | null>(null);
  const [userOrgs, setUserOrgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [state, setState] = useState('Gujarat');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchOrganizationData();
    }
  }, [isOpen]);

  const fetchOrganizationData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get<any>('/organization/settings');
      setOrg(res.organization);
      setUserOrgs(res.user_organizations || []);

      if (res.organization) {
        populateForm(res.organization);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load organization settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const populateForm = (o: any) => {
    setName(o.name || '');
    setAddress(o.address || '');
    setGstNumber(o.gst_number || '');
    setState(o.state || 'Gujarat');
    setBankName(o.bank_name || '');
    setBankAccountNo(o.bank_account_no || '');
    setBankIfsc(o.bank_ifsc || '');
    setUpiId(o.upi_id || '');
  };

  const handleSwitchOrg = (targetOrgId: number) => {
    setActiveOrganizationId(targetOrgId);
    queryClient.invalidateQueries();
    toast.success('Switched active organization context.');
    onClose();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole !== 'admin') {
      toast.error('Only Organization Administrators can update organization settings.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        name,
        address,
        gst_number: gstNumber,
        state,
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        bank_ifsc: bankIfsc,
        upi_id: upiId,
      };

      const res = await apiClient.put<any>('/organization/settings', payload);
      setOrg(res.organization);
      setIsEditing(false);
      queryClient.invalidateQueries();
      toast.success('Organization settings updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update organization settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        name,
        address,
        gst_number: gstNumber,
        state,
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        bank_ifsc: bankIfsc,
        upi_id: upiId,
      };

      const res = await apiClient.post<any>('/organizations', payload);
      toast.success(`Organization '${res.organization.name}' created successfully.`);
      localStorage.setItem('active_organization_id', String(res.organization.id));
      setIsCreatingNew(false);
      queryClient.invalidateQueries();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create new organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col max-h-[90vh] animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">Organization Profile & Tenant Switcher</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && <ErrorAlert title="Organization Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

          {isLoading ? (
            <LoadingSpinner label="Loading organization profile..." />
          ) : isCreatingNew ? (
            /* Create New Organization Form */
            <form onSubmit={handleCreateNewOrg} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h4 className="font-extrabold text-stone-900 text-sm">Register New Organization</h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    if (org) populateForm(org);
                  }}
                  className="text-xs text-stone-500 font-bold hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">Organization Name *</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Industrial Pvt Ltd"
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 font-medium focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">State *</label>
                  <input
                    required
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Gujarat"
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 font-medium focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="24AAACA1234F1Z5"
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="apexind@sbi"
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="block text-[11px] font-bold text-stone-700">Registered Office Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full office or factory street address..."
                  className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="State Bank of India"
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">Account No.</label>
                  <input
                    type="text"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    placeholder="309988771122"
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">IFSC Code</label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100">
                <Button variant="ghost" onClick={() => setIsCreatingNew(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  Create Organization
                </Button>
              </div>
            </form>
          ) : isEditing ? (
            /* Edit Organization Settings Form */
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h4 className="font-extrabold text-stone-900 text-sm">Edit Organization Settings</h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (org) populateForm(org);
                  }}
                  className="text-xs text-stone-500 font-bold hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">Organization Name *</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">State *</label>
                  <input
                    required
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="block text-[11px] font-bold text-stone-700">Registered Office Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">Account No.</label>
                  <input
                    type="text"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700">IFSC Code</label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border border-stone-200 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  Save Settings
                </Button>
              </div>
            </form>
          ) : (
            /* Organization Overview & Switcher List */
            <div className="space-y-6">
              {/* Active Organization Card */}
              {org && (
                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-[#1E5E41] tracking-wider">
                        Active Profile
                      </span>
                      <h4 className="font-extrabold text-stone-900 text-base">{org.name}</h4>
                    </div>

                    {activeRole === 'admin' && (
                      <button
                        onClick={() => {
                          populateForm(org);
                          setIsEditing(true);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 rounded-xl font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 text-stone-600" />
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-stone-600 pt-1">
                    <div>GSTIN: <strong className="text-stone-900 font-mono">{org.gst_number || 'URP'}</strong></div>
                    <div>State: <strong className="text-stone-900">{org.state}</strong></div>
                    <div className="col-span-2">Address: <span className="text-stone-900">{org.address || 'None'}</span></div>
                    <div>Bank: <span className="text-stone-900">{org.bank_name || 'N/A'}</span></div>
                    <div>UPI: <span className="text-stone-900 font-mono">{org.upi_id || 'N/A'}</span></div>
                  </div>
                </div>
              )}

              {/* Organization Switcher List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-stone-700" />
                    <span>Accessible Tenant Organizations ({userOrgs.length})</span>
                  </h4>

                  {activeRole === 'admin' && (
                    <button
                      onClick={() => {
                        setName('');
                        setAddress('');
                        setGstNumber('');
                        setState('Gujarat');
                        setBankName('');
                        setBankAccountNo('');
                        setBankIfsc('');
                        setUpiId('');
                        setIsCreatingNew(true);
                      }}
                      className="text-xs text-stone-900 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-stone-900" />
                      <span>New Organization</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {userOrgs.map((o) => {
                    const isActive = o.id === org?.id;
                    return (
                      <div
                        key={o.id}
                        onClick={() => !isActive && handleSwitchOrg(o.id)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                          isActive
                            ? 'bg-[#D4F442]/15 border-[#D4F442]/40'
                            : 'bg-white border-stone-200 hover:border-stone-300 cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-stone-900">{o.name}</div>
                          <div className="text-stone-500 text-[11px]">
                            GSTIN: {o.gst_number || 'URP'} • State: {o.state}
                          </div>
                        </div>

                        {isActive ? (
                          <span className="px-2.5 py-1 bg-[#D4F442] text-stone-950 rounded-xl text-[10px] font-extrabold flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-[10px] font-bold">
                            Switch Context
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
