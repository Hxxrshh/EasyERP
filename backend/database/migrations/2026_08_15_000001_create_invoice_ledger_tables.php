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
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('billing_address');
            $table->string('gst_number');
            $table->string('bank_name');
            $table->string('bank_account_no');
            $table->string('bank_ifsc');
            $table->string('upi_id');
            $table->string('default_template');
            $table->string('brand_color');
            $table->timestamps();
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->string('name');
            $table->string('short_name')->unique();
            $table->string('gst_number')->nullable();
            $table->text('billing_address');
            $table->string('state');
            $table->integer('default_due_days')->default(30);
            $table->string('contact_phone');
            $table->string('contact_whatsapp');
            $table->string('preferred_template')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->string('name');
            $table->string('short_name')->unique();
            $table->string('hsn_code');
            $table->string('unit');
            $table->decimal('default_gst_rate', 5, 2)->default(18.00);
            $table->decimal('base_price', 15, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->enum('document_type', ['invoice', 'quote', 'proforma', 'challan'])->default('invoice');
            $table->string('invoice_number', 50)->nullable();
            $table->foreignId('client_id')->constrained('clients')->onDelete('restrict');
            $table->date('date');
            $table->decimal('total_amount', 15, 2)->default(0.00);
            $table->decimal('paid_amount', 15, 2)->default(0.00);
            $table->enum('status', ['draft', 'finalized', 'cancelled'])->default('draft');
            $table->string('template_key', 50)->default('classic_gst');
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'invoice_number']);
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('restrict');
            $table->decimal('quantity', 15, 3);
            $table->decimal('rate', 15, 2);
            $table->decimal('gst_rate', 5, 2);
            $table->decimal('amount', 15, 2);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('clients')->onDelete('restrict');
            $table->decimal('amount', 15, 2);
            $table->date('payment_date');
            $table->string('payment_mode', 50);
            $table->string('transaction_reference', 255)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_invoice_map', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->onDelete('cascade');
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->decimal('amount_applied', 15, 2);
            $table->timestamps();
        });

        Schema::create('client_product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->decimal('last_price', 15, 2);
            $table->timestamps();

            $table->unique(['client_id', 'product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_product_prices');
        Schema::dropIfExists('payment_invoice_map');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('products');
        Schema::dropIfExists('clients');
        Schema::dropIfExists('organizations');
    }
};
