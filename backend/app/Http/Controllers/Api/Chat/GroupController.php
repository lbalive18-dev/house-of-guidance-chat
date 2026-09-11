<?php

namespace App\Http\Controllers\Api\Chat;

use App\Events\ConversationUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\AddMembersRequest;
use App\Http\Requests\Chat\CreateGroupRequest;
use App\Http\Requests\Chat\UpdateGroupRequest;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class GroupController extends Controller
{
    public function store(CreateGroupRequest $request)
    {
        $user = $request->user();

        $conversation = DB::transaction(function () use ($request, $user) {
            $conversation = Conversation::create([
                'type' => 'group',
                'name' => $request->validated('name'),
                'description' => $request->validated('description'),
                'created_by' => $user->id,
            ]);

            if ($request->hasFile('avatar')) {
                $conversation->update(['avatar_path' => $request->file('avatar')->store('group-avatars', 'public')]);
            }

            $attach = [$user->id => ['role' => 'admin', 'joined_at' => now()]];
            foreach ($request->validated('member_ids') as $memberId) {
                $attach[$memberId] = ['role' => 'member', 'joined_at' => now()];
            }
            $conversation->participants()->attach($attach);

            $memberNames = User::whereIn('id', $request->validated('member_ids'))->pluck('name')->implode(', ');
            $conversation->logSystemMessage($user, "{$user->name} created the group and added {$memberNames}.");

            return $conversation;
        });

        $conversation->load(['latestMessage.sender', 'participants']);

        return new ConversationResource($conversation);
    }

    public function update(UpdateGroupRequest $request, Conversation $conversation)
    {
        $this->authorizeGroupAdmin($request, $conversation);

        $conversation->fill($request->safe()->except('avatar'));

        if ($request->hasFile('avatar')) {
            if ($conversation->avatar_path) {
                Storage::disk('public')->delete($conversation->avatar_path);
            }
            $conversation->avatar_path = $request->file('avatar')->store('group-avatars', 'public');
        }

        $conversation->save();
        $conversation->logSystemMessage($request->user(), "{$request->user()->name} updated the group info.");
        $conversation->load('participants');

        broadcast(new ConversationUpdated($conversation))->toOthers();

        return new ConversationResource($conversation);
    }

    public function addMembers(AddMembersRequest $request, Conversation $conversation)
    {
        $this->authorizeGroupAdmin($request, $conversation);

        $existingIds = $conversation->participants()->pluck('users.id')->all();
        $newIds = array_diff($request->validated('member_ids'), $existingIds);

        abort_if(empty($newIds), 422, 'Those users are already in the group.');

        $attach = [];
        foreach ($newIds as $id) {
            $attach[$id] = ['role' => 'member', 'joined_at' => now()];
        }
        $conversation->participants()->attach($attach);

        $names = User::whereIn('id', $newIds)->pluck('name')->implode(', ');
        $conversation->logSystemMessage($request->user(), "{$request->user()->name} added {$names} to the group.");
        $conversation->load('participants');

        broadcast(new ConversationUpdated($conversation))->toOthers();

        return new ConversationResource($conversation);
    }

    public function removeMember(Request $request, Conversation $conversation, User $user)
    {
        abort_if($conversation->type !== 'group', 404);

        $actor = $request->user();
        $isSelf = $actor->id === $user->id;

        if (! $isSelf) {
            $this->authorizeGroupAdmin($request, $conversation);
        }

        abort_unless(
            $conversation->participants()->where('user_id', $user->id)->exists(),
            404,
            'That person is not in this group.'
        );

        $memberPivot = $conversation->participants()->where('user_id', $user->id)->first()->pivot;
        $remainingCount = $conversation->activeParticipants()->count();
        $adminCount = $conversation->participants()->wherePivot('role', 'admin')->count();

        if ($memberPivot->role === 'admin' && $adminCount <= 1 && $remainingCount > 1) {
            abort(422, 'Promote another member to admin before removing the only admin.');
        }

        $conversation->participants()->updateExistingPivot($user->id, ['left_at' => now()]);
        $conversation->participants()->detach($user->id);

        $verb = $isSelf ? 'left the group' : "was removed from the group by {$actor->name}";
        $conversation->logSystemMessage($actor, "{$user->name} {$verb}.");
        $conversation->load('participants');

        broadcast(new ConversationUpdated($conversation))->toOthers();

        return response()->json(['message' => 'Member removed.']);
    }

    public function updateRole(Request $request, Conversation $conversation, User $user)
    {
        $this->authorizeGroupAdmin($request, $conversation);

        $request->validate(['role' => ['required', Rule::in(['member', 'admin'])]]);

        abort_unless(
            $conversation->participants()->where('user_id', $user->id)->exists(),
            404,
            'That person is not in this group.'
        );

        $newRole = $request->string('role')->toString();

        if ($newRole === 'member') {
            $adminCount = $conversation->participants()->wherePivot('role', 'admin')->count();
            $targetIsAdmin = $conversation->participants()->where('user_id', $user->id)->first()->pivot->role === 'admin';

            if ($targetIsAdmin && $adminCount <= 1) {
                abort(422, 'A group must have at least one admin.');
            }
        }

        $conversation->participants()->updateExistingPivot($user->id, ['role' => $newRole]);

        $action = $newRole === 'admin' ? 'made an admin' : 'removed as admin';
        $conversation->logSystemMessage($request->user(), "{$user->name} was {$action}.");
        $conversation->load('participants');

        broadcast(new ConversationUpdated($conversation))->toOthers();

        return new ConversationResource($conversation);
    }

    protected function authorizeGroupAdmin(Request $request, Conversation $conversation): void
    {
        abort_if($conversation->type !== 'group', 404);

        $role = $conversation->participants()->where('user_id', $request->user()->id)->first()?->pivot->role;

        abort_unless($role === 'admin', 403, 'Only group admins can do that.');
    }
}
