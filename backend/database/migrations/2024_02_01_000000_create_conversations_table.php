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
            Schema::create('conversations', function (Blueprint $table) {
                $table->id();
                $table->enum('type', ['private', 'group'])->default('private');
                $table->string('name')->nullable();
                $table->text('description')->nullable();
                $table->string('avatar_path')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('last_message_at')->nullable();
                $table->timestamps();

                $table->index(['type', 'last_message_at']);
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
        Schema::dropIfExists('conversations');
    }
};
