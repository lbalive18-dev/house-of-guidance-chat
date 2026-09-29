<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Daily reminder preferences. All nullable with application-level
     * defaults so existing users are unaffected.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('reminder_enabled')->default(true);
            $table->string('reminder_time', 5)->default('07:00');
            $table->string('reminder_timezone', 64)->default('UTC');
            $table->boolean('remind_quran')->default(true);
            $table->boolean('remind_hadith')->default(true);
            $table->boolean('remind_salah')->default(true);
            $table->decimal('prayer_lat', 10, 7)->nullable();
            $table->decimal('prayer_lng', 10, 7)->nullable();
            $table->string('prayer_label', 120)->nullable();
            $table->date('last_reminder_date')->nullable();
            $table->string('last_salah_key', 32)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'reminder_enabled',
                'reminder_time',
                'reminder_timezone',
                'remind_quran',
                'remind_hadith',
                'remind_salah',
                'prayer_lat',
                'prayer_lng',
                'prayer_label',
                'last_reminder_date',
                'last_salah_key',
            ]);
        });
    }
};
