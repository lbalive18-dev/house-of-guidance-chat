<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hadiths', function (Blueprint $table) {
            $table->unsignedInteger('hadith_number')->nullable()->after('collection');
            $table->string('chapter')->nullable()->after('hadith_number');
            $table->string('grade')->nullable()->after('reference');

            $table->index(['collection', 'hadith_number']);
        });
    }

    public function down(): void
    {
        Schema::table('hadiths', function (Blueprint $table) {
            $table->dropIndex(['collection', 'hadith_number']);
            $table->dropColumn(['hadith_number', 'chapter', 'grade']);
        });
    }
};
