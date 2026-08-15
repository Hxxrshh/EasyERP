<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
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
            'organization_id'       => 'nullable|exists:organizations,id',
            'client_id'             => 'required|exists:clients,id',
            'amount'                => 'required|numeric|min:0.01',
            'payment_date'          => 'required|date',
            'payment_mode'          => 'required|string|max:50',
            'transaction_reference' => 'nullable|string|max:255',
            'notes'                 => 'nullable|string',
        ];
    }
}