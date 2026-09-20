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
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });

            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
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
        Schema::dropIfExists('cache');
        Schema::dropIfExists('cache_locks');
    }
};
