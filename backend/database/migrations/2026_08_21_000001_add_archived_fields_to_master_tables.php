<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->after('contact_whatsapp');
            $table->timestamp('archived_at')->nullable()->after('is_archived');
            $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete()->after('archived_at');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->after('base_price');
            $table->timestamp('archived_at')->nullable()->after('is_archived');
            $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete()->after('archived_at');
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->after('is_active');
            $table->timestamp('archived_at')->nullable()->after('is_archived');
            $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete()->after('archived_at');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['archived_by']);
            $table->dropColumn(['is_archived', 'archived_at', 'archived_by']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['archived_by']);
            $table->dropColumn(['is_archived', 'archived_at', 'archived_by']);
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropForeign(['archived_by']);
            $table->dropColumn(['is_archived', 'archived_at', 'archived_by']);
        });
    }
};
