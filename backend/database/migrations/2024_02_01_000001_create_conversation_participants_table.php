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
            Schema::create('conversation_participants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->enum('role', ['member', 'admin'])->default('member');
                $table->timestamp('last_read_at')->nullable();
                $table->timestamp('muted_until')->nullable();
                $table->timestamp('joined_at')->useCurrent();
                $table->timestamp('left_at')->nullable();
                $table->timestamps();

                $table->unique(['conversation_id', 'user_id']);
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
        Schema::dropIfExists('conversation_participants');
    }
};
