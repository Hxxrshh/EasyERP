<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->attributes->has('active_organization_id')) {
            $this->merge([
                'organization_id' => $this->attributes->get('active_organization_id'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'organization_id'    => 'nullable|exists:organizations,id',
            'client_id'          => 'required|exists:clients,id',
            'document_type'      => 'required|in:invoice,quote,proforma,challan',
            'date'               => 'required|date',
            'template_key'       => 'nullable|string|max:50',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|numeric|min:0.001',
            'items.*.rate'       => 'required|numeric|min:0',
            'items.*.gst_rate'   => 'required|numeric|min:0',
        ];
    }
}