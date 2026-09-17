<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Curated collections (e.g. Daily Essentials) copy verified rows out of
     * their original books. These columns keep every curated entry
     * traceable to its original collection + number. NULL for
     * first-party book rows and for all pre-existing legacy rows.
     */
    public function up(): void
    {
        Schema::table('hadiths', function (Blueprint $table) {
            $table->string('source_collection')->nullable()->after('collection');
            $table->unsignedInteger('source_number')->nullable()->after('source_collection');

            $table->index(['source_collection', 'source_number']);
        });
    }

    public function down(): void
    {
        Schema::table('hadiths', function (Blueprint $table) {
            $table->dropIndex(['source_collection', 'source_number']);
            $table->dropColumn(['source_collection', 'source_number']);
        });
    }
};
