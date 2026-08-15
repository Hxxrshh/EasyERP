<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClientFactory extends Factory
{
    protected $model = Client::class;

    public function definition(): array
    {
        return [
            'organization_id'  => Organization::factory(),
            'name'             => $this->faker->company(),
            'short_name'       => $this->faker->unique()->slug(2),
            'gst_number'       => '24BBBCD56781ZC',
            'billing_address'  => $this->faker->address(),
            'state'            => 'Gujarat',
            'default_due_days' => 30,
            'contact_phone'    => '9876543210',
            'contact_whatsapp' => '9876543210',
            'preferred_template' => 'classic_gst',
        ];
    }
}
