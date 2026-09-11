<?php

namespace App\Http\Controllers\Api\Hog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hog\CreateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $audiences = match ($user->role) {
            'teacher', 'admin' => ['all', 'teachers'],
            default => ['all', 'students'],
        };

        $announcements = Announcement::query()
            ->with('author')
            ->whereIn('audience', $audiences)
            ->orderByDesc('pinned')
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 15));

        return AnnouncementResource::collection($announcements);
    }

    public function store(CreateAnnouncementRequest $request)
    {
        abort_unless(in_array($request->user()->role, ['teacher', 'admin'], true), 403, 'Only teachers and admins can post announcements.');

        $announcement = Announcement::create([
            ...$request->validated(),
            'author_id' => $request->user()->id,
        ]);

        return new AnnouncementResource($announcement->load('author'));
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        abort_unless(
            $announcement->author_id === $request->user()->id || $request->user()->isAdmin(),
            403,
            'You can only delete your own announcements.'
        );

        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }
}
