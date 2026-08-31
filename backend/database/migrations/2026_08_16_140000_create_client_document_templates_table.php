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
        Schema::create('client_document_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->string('document_type', 50)->default('invoice');
            $table->string('tax_mode', 50)->default('taxable');
            $table->string('template_key', 100);
            $table->string('template_version', 20)->default('v1');
            $table->timestamps();

            $table->unique(
                ['organization_id', 'client_id', 'document_type', 'tax_mode'],
                'client_doc_tax_template_unique'
            );
        });

        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'template_version')) {
                $table->string('template_version', 20)->default('v1')->after('template_key');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_document_templates');

        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'template_version')) {
                $table->dropColumn('template_version');
            }
        });
    }
};
