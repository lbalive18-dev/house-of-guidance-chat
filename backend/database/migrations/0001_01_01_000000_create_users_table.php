<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // TEMPORARY DIAGNOSTIC ONLY — REVERT BEFORE ANY REAL DEPLOY.
        // Marker proves WHICH code is actually running inside the
        // container (stale-image deploys are otherwise indistinguishable).
        // The listener then logs every statement that SUCCEEDS, so the
        // following exception is attributable to an exact position:
        // marker + CREATE-ok + ALTER-25P02  => server-side abort between
        //   statements (pooler/timeout/freeze — escalate with this proof);
        // marker + no CREATE-ok + exists error => stale table (repair path).
        error_log('[MIGRATION-DIAG] 0001-listener-active rev=20260922c');
        DB::listen(function ($query) {
            error_log('[MIGRATION-DDL] ok sql='.substr($query->sql, 0, 160));
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
