<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::where('role', 'admin')->first();

        $rooms = [
            [
                'room_type' => 'discussion',
                'name' => 'Public Discussion Room',
                'description' => 'Open conversation for the whole House of Guidance community.',
            ],
            [
                'room_type' => 'tajweed',
                'name' => 'Tajweed Class Room',
                'description' => 'Practice and questions on the rules of Tajweed.',
            ],
            [
                'room_type' => 'hifdh',
                'name' => 'Hifdh Room',
                'description' => "Support and accountability for those memorizing the Qur'an.",
            ],
            [
                'room_type' => 'arabic',
                'name' => 'Arabic Language Room',
                'description' => 'Learn and practice the Arabic language together.',
            ],
            [
                'room_type' => 'ask_sheikh',
                'name' => 'Ask the Sheikh',
                'description' => 'Ask questions and receive answers from our teachers.',
            ],
        ];

        foreach ($rooms as $room) {
            if (Conversation::where('room_type', $room['room_type'])->exists()) {
                continue;
            }

            $conversation = Conversation::create([
                'type' => 'group',
                'room_type' => $room['room_type'],
                'is_public' => true,
                'name' => $room['name'],
                'description' => $room['description'],
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
}
