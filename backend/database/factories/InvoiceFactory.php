<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'client_id'       => Client::factory(),
            'document_type'   => 'invoice',
            'invoice_number'  => null,
            'date'            => now()->format('Y-m-d'),
            'total_amount'    => 118.00,
            'paid_amount'     => 0.00,
            'status'          => 'draft',
            'template_key'    => 'classic_gst',
        ];
    }
}
