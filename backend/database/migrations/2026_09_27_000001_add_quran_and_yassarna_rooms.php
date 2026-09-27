<?php

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $owner = User::query()->where('role', 'admin')->first();

        foreach ([
            [
                'room_type' => 'discussion',
                'name' => 'Quran Room',
                'description' => 'Read, reflect on, and discuss the Qur’an together.',
            ],
            [
                'room_type' => 'tajweed',
                'name' => 'Yassarna Room',
                'description' => 'Learn and practise Yassarna reading together.',
            ],
        ] as $room) {
            if (Conversation::query()->where('is_public', true)->where('name', $room['name'])->exists()) {
                continue;
            }

            $conversation = Conversation::query()->create([
                ...$room,
                'type' => 'group',
                'is_public' => true,
                'created_by' => $owner?->id,
            ]);

            if ($owner) {
                $conversation->participants()->attach($owner->id, [
                    'role' => 'admin',
                    'joined_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Preserve community conversations and messages on rollback.
    }
};
