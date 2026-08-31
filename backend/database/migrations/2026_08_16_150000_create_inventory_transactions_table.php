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
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->decimal('quantity', 12, 2);
            $table->string('unit', 20)->default('KGS');
            $table->string('type', 30); // opening_stock, stock_in, stock_out, adjustment
            $table->string('reference', 100)->nullable(); // e.g. INV-001/26-27, PO-88, ADJ-01
            $table->date('date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['organization_id', 'product_id']);
        });

        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'min_stock_alert')) {
                $table->decimal('min_stock_alert', 12, 2)->default(10.00)->after('base_price');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'min_stock_alert')) {
                $table->dropColumn('min_stock_alert');
            }
        });
    }
};
