import React, { useState } from 'react';
import { useCreateProductMutation } from '../../hooks/useApiQueries';
import { FormInput } from '../ui/FormInput';
import { FormSelect } from '../ui/FormSelect';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../common/ErrorAlert';
import { X, PackagePlus } from 'lucide-react';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (productId: number) => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const createProductMutation = useCreateProductMutation();

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [unit, setUnit] = useState('KG');
  const [defaultGstRate, setDefaultGstRate] = useState(18);
  const [basePrice, setBasePrice] = useState(100);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name || !unit || basePrice < 0) {
      setErrorMsg('Product name, unit, and valid base price are required.');
      return;
    }

    try {
      const created = await createProductMutation.mutateAsync({
        name,
        short_name: shortName || undefined,
        hsn_code: hsnCode || null,
        unit,
        default_gst_rate: defaultGstRate,
        base_price: basePrice,
      });

      onSuccess?.(created.id);
      onClose();

      // Reset form
      setName('');
      setShortName('');
      setHsnCode('');
      setBasePrice(100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product item.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <PackagePlus className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">Add New Catalog Product</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && <ErrorAlert title="Product Creation Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

          <FormInput
            label="Product Description / Name *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HDPE Granules Black"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Short Code"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. hdpe-blk"
            />
            <FormInput
              label="HSN Classification Code"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              placeholder="e.g. 3901"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormSelect
              label="Unit (UQC) *"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="KG">KG (Kilograms)</option>
              <option value="PCS">PCS (Pieces)</option>
              <option value="ROLL">ROLL (Rolls)</option>
              <option value="LTR">LTR (Liters)</option>
              <option value="BOX">BOX (Boxes)</option>
              <option value="MTR">MTR (Meters)</option>
            </FormSelect>

            <FormSelect
              label="Default GST % *"
              value={defaultGstRate}
              onChange={(e) => setDefaultGstRate(Number(e.target.value))}
            >
              <option value={0}>0% (Exempt)</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </FormSelect>

            <FormInput
              label="Base Rate (₹) *"
              type="number"
              min="0"
              step="any"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createProductMutation.isPending}>
              Create Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
