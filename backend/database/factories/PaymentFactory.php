<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Organization;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'organization_id'       => Organization::factory(),
            'client_id'             => Client::factory(),
            'amount'                => 100.00,
            'payment_date'          => now()->format('Y-m-d'),
            'payment_mode'          => 'Bank Transfer',
            'transaction_reference' => 'TXN123456',
            'notes'                 => 'Test payment',
        ];
    }
}
