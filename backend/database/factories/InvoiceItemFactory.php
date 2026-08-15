<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceItemFactory extends Factory
{
    protected $model = InvoiceItem::class;

    public function definition(): array
    {
        return [
            'invoice_id' => Invoice::factory(),
            'product_id' => Product::factory(),
            'quantity'   => 1,
            'rate'       => 100.00,
            'gst_rate'   => 18.00,
            'amount'     => 118.00,
        ];
    }
}
