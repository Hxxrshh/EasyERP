<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Organization
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => 'Laxmi Ratan Material Trading',
            'billing_address' => 'GIDC Phase 3, Vatva, Ahmedabad, Gujarat - 382445',
            'gst_number' => '24AAACL1234A1Z5',
            'bank_name' => 'State Bank of India',
            'bank_account_no' => '987654321012',
            'bank_ifsc' => 'SBIN0001234',
            'upi_id' => 'laxmiratan@sbi',
            'default_template' => 'classic_gst',
            'brand_color' => '#1E40AF',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Seed Clients
        $rrClientId = DB::table('clients')->insertGetId([
            'organization_id' => $organizationId,
            'name' => 'RR Packaging',
            'short_name' => 'rr',
            'gst_number' => '24ABCDE1234F1Z5',
            'billing_address' => 'Plot 45, GIDC Naroda, Ahmedabad, Gujarat',
            'state' => 'Gujarat',
            'default_due_days' => 30,
            'contact_phone' => '9876543210',
            'contact_whatsapp' => '9876543210',
            'preferred_template' => 'classic_gst',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $siyaClientId = DB::table('clients')->insertGetId([
            'organization_id' => $organizationId,
            'name' => 'Siya Engineering',
            'short_name' => 'siya',
            'gst_number' => null,
            'billing_address' => 'MIDC Industrial Area, Thane, Maharashtra',
            'state' => 'Maharashtra',
            'default_due_days' => 30,
            'contact_phone' => '9123456789',
            'contact_whatsapp' => '9123456789',
            'preferred_template' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Seed Products
        DB::table('products')->insert([
            [
                'organization_id' => $organizationId,
                'name' => 'HDPE Granules',
                'short_name' => 'hdpe',
                'hsn_code' => '3901',
                'unit' => 'KG',
                'default_gst_rate' => 18.00,
                'base_price' => 120.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'organization_id' => $organizationId,
                'name' => 'PP Woven Bags',
                'short_name' => 'pp_bags',
                'hsn_code' => '6305',
                'unit' => 'PCS',
                'default_gst_rate' => 12.00,
                'base_price' => 15.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'organization_id' => $organizationId,
                'name' => 'Packing Liner',
                'short_name' => 'liner',
                'hsn_code' => '3920',
                'unit' => 'ROLL',
                'default_gst_rate' => 5.00,
                'base_price' => 250.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
