<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // TEMPORARY DIAGNOSTIC ONLY — REVERT BEFORE ANY REAL DEPLOY.
    // Disables the wrapping transaction so the FIRST failing statement
    // throws its real error instead of being masked by a later 25P02.
    public $withinTransaction = false;

    public function up(): void
    {
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->enum('role', ['student', 'teacher', 'admin'])
                    ->default('student')
                    ->after('email');
                $table->string('avatar_path')->nullable()->after('role');
                $table->text('bio')->nullable()->after('avatar_path');
                $table->string('phone', 30)->nullable()->after('bio');
                $table->timestamp('last_seen_at')->nullable()->after('phone');
                $table->boolean('is_banned')->default(false)->after('last_seen_at');
                $table->timestamp('banned_at')->nullable()->after('is_banned');
                $table->string('ban_reason')->nullable()->after('banned_at');

                $table->index('role');
                $table->index('last_seen_at');
            });
        } catch (\Throwable $e) {
            $sql = $e instanceof \Illuminate\Database\QueryException
                ? $e->getSql().' ['.implode(',', array_map(fn ($b) => is_scalar($b) ? (string) $b : gettype($b), $e->getBindings())).']'
                : '<not-a-query-exception>';
            error_log('[MIGRATION-DIAG] FIRST-ERROR class='.get_class($e).' code='.$e->getCode().' sql='.$sql.' message='.$e->getMessage());
            throw $e;
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'avatar_path',
                'bio',
                'phone',
                'last_seen_at',
                'is_banned',
                'banned_at',
                'ban_reason',
            ]);
        });
    }
};
