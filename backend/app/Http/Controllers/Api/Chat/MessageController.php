<?php

namespace App\Http\Controllers\Api\Chat;

use App\Events\ConversationRead;
use App\Events\MessageDeleted;
use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\SendMessageRequest;
use App\Http\Requests\Chat\UpdateMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    private const ATTACHMENT_DISKS = [
        'image' => 'chat-attachments',
        'file' => 'chat-attachments',
        'pdf' => 'chat-attachments',
        'voice' => 'voice-notes',
    ];

    public function index(Request $request, Conversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);

        $messages = $conversation->messages()
            ->with(['sender', 'replyTo.sender', 'attachments', 'reactions.user'])
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 30));

        $this->attachReadStatus($conversation, $request->user(), collect($messages->items()));

        return MessageResource::collection($messages);
    }

    public function store(SendMessageRequest $request, Conversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);

        $user = $request->user();
        $type = 'text';
        $attachmentData = null;

        if ($request->hasFile('attachment')) {
            $type = $request->validated('attachment_type');
            $file = $request->file('attachment');
            $disk = self::ATTACHMENT_DISKS[$type] ?? 'chat-attachments';
            $path = $file->store('', $disk);

            $attachmentData = [
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size_bytes' => $file->getSize(),
                'duration_seconds' => $request->integer('duration_seconds') ?: null,
            ];
        }

        $message = DB::transaction(function () use ($conversation, $user, $type, $request, $attachmentData) {
            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $user->id,
                'reply_to_id' => $request->validated('reply_to_id'),
                'type' => $type,
                'body' => $request->validated('body'),
            ]);

            if ($attachmentData) {
                MessageAttachment::create([...$attachmentData, 'message_id' => $message->id]);
            }

            $conversation->update(['last_message_at' => $message->created_at]);
            $conversation->participants()->updateExistingPivot($user->id, ['last_read_at' => now()]);

            return $message;
        });

        $message->load(['sender', 'replyTo.sender', 'attachments', 'reactions.user']);

        broadcast(new MessageSent($message))->toOthers();

        return new MessageResource($message);
    }

    public function update(UpdateMessageRequest $request, Conversation $conversation, Message $message)
    {
        $this->authorizeParticipant($request, $conversation);
        abort_if($message->conversation_id !== $conversation->id, 404);
        abort_unless($message->sender_id === $request->user()->id, 403, 'You can only edit your own messages.');
        abort_unless($message->isEditable(), 422, 'This message can no longer be edited.');

        $message->update([
            'body' => $request->validated('body'),
            'edited_at' => now(),
        ]);

        $message->load(['sender', 'replyTo.sender', 'attachments', 'reactions.user']);

        broadcast(new MessageUpdated($message))->toOthers();

        return new MessageResource($message);
    }

    public function destroy(Request $request, Conversation $conversation, Message $message)
    {
        $this->authorizeParticipant($request, $conversation);
        abort_if($message->conversation_id !== $conversation->id, 404);
        abort_unless(
            $message->sender_id === $request->user()->id || $request->user()->isAdmin(),
            403,
            'You can only delete your own messages.'
        );

        $message->update(['deleted_at' => now(), 'body' => null]);

        broadcast(new MessageDeleted($message))->toOthers();

        return response()->json(['message' => 'Message deleted.']);
    }

    public function markRead(Request $request, Conversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);

        $readAt = now();
        $conversation->participants()->updateExistingPivot($request->user()->id, ['last_read_at' => $readAt]);

        broadcast(new ConversationRead($conversation, $request->user(), $readAt->toIso8601String()))->toOthers();

        return response()->json(['message' => 'Marked as read.']);
    }

    /**
     * Stamp each of the viewer's own messages with whether the other
     * private-chat participant has read up to that point.
     */
    protected function attachReadStatus(Conversation $conversation, $viewer, $messages): void
    {
        if ($conversation->type !== 'private') {
            return;
        }

        $otherPivot = $conversation->participants()->where('user_id', '!=', $viewer->id)->first()?->pivot;

        if (! $otherPivot || ! $otherPivot->last_read_at) {
            return;
        }

        $lastRead = \Illuminate\Support\Carbon::parse($otherPivot->last_read_at);

        foreach ($messages as $message) {
            if ($message->sender_id === $viewer->id) {
                $message->setAttribute('is_read_by_recipient', $lastRead->greaterThanOrEqualTo($message->created_at));
            }
        }
    }

    protected function authorizeParticipant(Request $request, Conversation $conversation): void
    {
        abort_unless(
            $conversation->participants()->where('user_id', $request->user()->id)->exists(),
            403,
            'You are not a participant in this conversation.'
        );
    }
}
