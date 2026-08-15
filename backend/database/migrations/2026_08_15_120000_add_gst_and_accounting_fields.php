<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('state')->default('Gujarat')->after('billing_address');
            $table->string('gst_number')->nullable()->change();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('subtotal', 15, 2)->default(0.00)->after('date');
            $table->decimal('cgst_total', 15, 2)->default(0.00)->after('subtotal');
            $table->decimal('sgst_total', 15, 2)->default(0.00)->after('cgst_total');
            $table->decimal('igst_total', 15, 2)->default(0.00)->after('sgst_total');
            $table->decimal('total_gst', 15, 2)->default(0.00)->after('igst_total');
            $table->date('due_date')->nullable()->after('total_amount');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('taxable_amount', 15, 2)->default(0.00)->after('gst_rate');
            $table->decimal('cgst_rate', 5, 2)->default(0.00)->after('taxable_amount');
            $table->decimal('sgst_rate', 5, 2)->default(0.00)->after('cgst_rate');
            $table->decimal('igst_rate', 5, 2)->default(0.00)->after('sgst_rate');
            $table->decimal('cgst_amount', 15, 2)->default(0.00)->after('igst_rate');
            $table->decimal('sgst_amount', 15, 2)->default(0.00)->after('cgst_amount');
            $table->decimal('igst_amount', 15, 2)->default(0.00)->after('sgst_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn([
                'taxable_amount',
                'cgst_rate',
                'sgst_rate',
                'igst_rate',
                'cgst_amount',
                'sgst_amount',
                'igst_amount',
            ]);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'subtotal',
                'cgst_total',
                'sgst_total',
                'igst_total',
                'total_gst',
                'due_date',
            ]);
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('state');
        });
    }
};
