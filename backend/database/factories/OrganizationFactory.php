<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrganizationFactory extends Factory
{
    protected $model = Organization::class;

    public function definition(): array
    {
        return [
            'name'             => $this->faker->company(),
            'billing_address'  => $this->faker->address(),
            'gst_number'       => '24AAACC12341ZB',
            'bank_name'        => 'HDFC Bank',
            'bank_account_no'  => '50100234567890',
            'bank_ifsc'        => 'HDFC0001234',
            'upi_id'           => 'org@hdfcbank',
            'default_template' => 'classic_gst',
            'brand_color'      => '#1E40AF',
        ];
    }
}
