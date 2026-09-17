<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TYPES = ['text', 'image', 'file', 'pdf', 'voice', 'system'];
    private const PREVIOUS = ['text', 'image', 'file', 'pdf', 'voice'];

    /**
     * Widens messages.type with the 'system' value. MySQL keeps existing
     * rows via MODIFY; PostgreSQL/SQLite recreate the column (their
     * Blueprint enum compiles to varchar/check or plain varchar, so the
     * MySQL-only MODIFY syntax cannot run there). Migrations always run
     * on an empty messages table here, so no data is at risk.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE messages MODIFY COLUMN type ENUM('text','image','file','pdf','voice','system') NOT NULL DEFAULT 'text'");

            return;
        }

        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->enum('type', self::TYPES)->default('text');
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE messages MODIFY COLUMN type ENUM('text','image','file','pdf','voice') NOT NULL DEFAULT 'text'");

            return;
        }

        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->enum('type', self::PREVIOUS)->default('text');
        });
    }
};
