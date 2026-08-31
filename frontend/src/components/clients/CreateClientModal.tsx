import React, { useState } from 'react';
import { useCreateClientMutation } from '../../hooks/useApiQueries';
import { FormInput } from '../ui/FormInput';
import { FormSelect } from '../ui/FormSelect';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../common/ErrorAlert';
import { X, UserPlus } from 'lucide-react';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (clientId: number) => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const createClientMutation = useCreateClientMutation();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [shortName, setShortName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [state, setState] = useState('Gujarat');
  const [defaultDueDays, setDefaultDueDays] = useState(30);
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [preferredTemplate, setPreferredTemplate] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name || !state) {
      setErrorMsg('Customer name and state are required.');
      return;
    }

    try {
      const created = await createClientMutation.mutateAsync({
        name,
        company_name: companyName || null,
        short_name: shortName || undefined,
        gst_number: gstNumber || null,
        billing_address: billingAddress || null,
        state,
        default_due_days: defaultDueDays,
        contact_phone: contactPhone || null,
        contact_whatsapp: contactWhatsapp || null,
        preferred_template: preferredTemplate || null,
      });

      onSuccess?.(created.id);
      onClose();

      // Reset form
      setName('');
      setCompanyName('');
      setShortName('');
      setGstNumber('');
      setBillingAddress('');
      setContactPhone('');
      setContactWhatsapp('');
      setPreferredTemplate('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create customer record.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <UserPlus className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">Add New Customer Account</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {errorMsg && <ErrorAlert title="Customer Creation Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

          <FormInput
            label="Customer / Trade Name *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Siya Engineering"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Siya Pvt Ltd"
            />
            <FormInput
              label="Short Code"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. siya"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="GSTIN (15 chars)"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              placeholder="24ABCDE1234F1Z5"
            />
            <FormSelect
              label="State *"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="Gujarat">Gujarat</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Delhi">Delhi</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
            </FormSelect>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Billing Address</label>
            <textarea
              rows={2}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Plot / Street / GIDC Industrial Area"
              className="w-full text-xs font-semibold p-2.5 border border-stone-200 rounded-xl bg-white/90 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Preferred Invoice Template"
              value={preferredTemplate}
              onChange={(e) => setPreferredTemplate(e.target.value)}
            >
              <option value="">-- Use Org Default --</option>
              <option value="gst_classic">GST Classic</option>
              <option value="gst_modern">GST Modern</option>
              <option value="gst_detailed">GST Detailed</option>
              <option value="non_gst_classic">Non-GST Classic</option>
              <option value="non_gst_modern">Non-GST Modern</option>
            </FormSelect>

            <FormInput
              label="Default Due Days"
              type="number"
              value={defaultDueDays}
              onChange={(e) => setDefaultDueDays(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Contact Phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="9876543210"
            />
            <FormInput
              label="WhatsApp Number"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="9876543210"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createClientMutation.isPending}>
              Create Customer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
