<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_debit_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->enum('note_type', ['credit_note', 'debit_note']);
            $table->string('note_number', 50);
            $table->date('date');
            $table->text('reason');
            $table->decimal('subtotal', 15, 2)->default(0.00);
            $table->decimal('cgst_total', 15, 2)->default(0.00);
            $table->decimal('sgst_total', 15, 2)->default(0.00);
            $table->decimal('igst_total', 15, 2)->default(0.00);
            $table->decimal('total_gst', 15, 2)->default(0.00);
            $table->decimal('total_amount', 15, 2)->default(0.00);
            $table->enum('status', ['draft', 'finalized'])->default('finalized');
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->unique(['organization_id', 'note_number']);
        });

        Schema::create('credit_debit_note_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_id')->constrained('credit_debit_notes')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('restrict');
            $table->decimal('quantity', 15, 3);
            $table->decimal('rate', 15, 2);
            $table->decimal('gst_rate', 5, 2);
            $table->decimal('taxable_amount', 15, 2);
            $table->decimal('cgst_amount', 15, 2);
            $table->decimal('sgst_amount', 15, 2);
            $table->decimal('igst_amount', 15, 2);
            $table->decimal('amount', 15, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_debit_note_items');
        Schema::dropIfExists('credit_debit_notes');
    }
};
