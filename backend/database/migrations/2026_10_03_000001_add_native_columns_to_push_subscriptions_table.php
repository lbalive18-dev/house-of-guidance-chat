<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Native (FCM) device support alongside browser Web Push rows:
     * - platform distinguishes 'web' from 'android' subscriptions;
     * - fcm_token holds the Firebase registration token (web rows leave
     *   it null; endpoint stays unique and required as before).
     */
    public function up(): void
    {
        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->string('platform', 16)->default('web');
            $table->string('fcm_token', 255)->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->dropColumn(['platform', 'fcm_token']);
        });
    }
};
