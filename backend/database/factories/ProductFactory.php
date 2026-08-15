<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'organization_id'  => Organization::factory(),
            'name'             => $this->faker->word(),
            'short_name'       => $this->faker->unique()->slug(1),
            'hsn_code'         => '8471',
            'unit'             => 'PCS',
            'default_gst_rate' => 18.00,
            'base_price'       => 100.00,
        ];
    }
}
