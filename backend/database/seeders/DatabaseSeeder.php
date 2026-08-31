<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed / Retrieve Organization
        $organization = Organization::firstOrCreate(
            ['name' => 'Laxmi Ratan Material Trading'],
            [
                'billing_address' => 'GIDC Phase 3, Vatva, Ahmedabad, Gujarat - 382445',
                'state' => 'Gujarat',
                'gst_number' => '24AAACL1234A1Z5',
                'bank_name' => 'State Bank of India',
                'bank_account_no' => '987654321012',
                'bank_ifsc' => 'SBIN0001234',
                'upi_id' => 'laxmiratan@sbi',
                'default_template' => 'classic_gst',
                'brand_color' => '#1E40AF',
            ]
        );

        // 2. Seed Users & Attach Organization Roles
        $users = [
            [
                'name' => 'ACCURA Administrator',
                'email' => 'admin@accura.io',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
            [
                'name' => 'ACCURA Operator',
                'email' => 'operator@accura.io',
                'password' => Hash::make('password'),
                'role' => 'operator',
            ],
            [
                'name' => 'ACCURA Auditor',
                'email' => 'auditor@accura.io',
                'password' => Hash::make('password'),
                'role' => 'auditor',
            ],
            [
                'name' => 'Admin User',
                'email' => 'admin@lr-billing.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
            [
                'name' => 'Operator User',
                'email' => 'operator@lr-billing.com',
                'password' => Hash::make('password'),
                'role' => 'operator',
            ],
            [
                'name' => 'Auditor User',
                'email' => 'auditor@lr-billing.com',
                'password' => Hash::make('password'),
                'role' => 'auditor',
            ],
        ];

        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => $userData['password'],
                ]
            );

            $user->organizations()->syncWithoutDetaching([
                $organization->id => ['role' => $userData['role']],
            ]);
        }

        // 3. Seed Clients (Idempotent)
        Client::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'short_name' => 'rr',
            ],
            [
                'name' => 'RR Packaging',
                'gst_number' => '24ABCDE1234F1Z5',
                'billing_address' => 'Plot 45, GIDC Naroda, Ahmedabad, Gujarat',
                'state' => 'Gujarat',
                'default_due_days' => 30,
                'contact_phone' => '9876543210',
                'contact_whatsapp' => '9876543210',
                'preferred_template' => 'classic_gst',
            ]
        );

        Client::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'short_name' => 'siya',
            ],
            [
                'name' => 'Siya Engineering',
                'gst_number' => null,
                'billing_address' => 'MIDC Industrial Area, Thane, Maharashtra',
                'state' => 'Maharashtra',
                'default_due_days' => 30,
                'contact_phone' => '9123456789',
                'contact_whatsapp' => '9123456789',
                'preferred_template' => null,
            ]
        );

        // 4. Seed Products (Idempotent)
        Product::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'short_name' => 'hdpe',
            ],
            [
                'name' => 'HDPE Granules',
                'hsn_code' => '3901',
                'unit' => 'KG',
                'default_gst_rate' => 18.00,
                'base_price' => 120.00,
            ]
        );

        Product::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'short_name' => 'pp_bags',
            ],
            [
                'name' => 'PP Woven Bags',
                'hsn_code' => '6305',
                'unit' => 'PCS',
                'default_gst_rate' => 12.00,
                'base_price' => 15.00,
            ]
        );

        Product::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'short_name' => 'liner',
            ],
            [
                'name' => 'Packing Liner',
                'hsn_code' => '3920',
                'unit' => 'ROLL',
                'default_gst_rate' => 5.00,
                'base_price' => 250.00,
            ]
        );
    }
}
