<?php

namespace App\Http\Controllers\Api\Hog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hog\CreateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventRegistration;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $events = Event::query()
            ->with(['creator', 'registrations'])
            ->withCount('registrations')
            ->when($request->filled('upcoming_only'), fn ($q) => $q->where('starts_at', '>=', now()))
            ->when($request->filled('month') && $request->filled('year'), function ($q) use ($request) {
                $q->whereMonth('starts_at', $request->integer('month'))
                    ->whereYear('starts_at', $request->integer('year'));
            })
            ->orderBy('starts_at')
            ->paginate($this->perPage($request, 20));

        return EventResource::collection($events);
    }

    public function show(Event $event)
    {
        $event->load(['creator', 'registrations']);

        return new EventResource($event);
    }

    public function store(CreateEventRequest $request)
    {
        abort_unless(in_array($request->user()->role, ['teacher', 'admin'], true), 403, 'Only teachers and admins can create events.');

        $event = Event::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return new EventResource($event->load(['creator', 'registrations']));
    }

    public function update(CreateEventRequest $request, Event $event)
    {
        abort_unless(
            $event->created_by === $request->user()->id || $request->user()->isAdmin(),
            403,
            'You can only edit your own events.'
        );

        $event->update($request->validated());

        return new EventResource($event->load(['creator', 'registrations']));
    }

    public function destroy(Request $request, Event $event)
    {
        abort_unless(
            $event->created_by === $request->user()->id || $request->user()->isAdmin(),
            403,
            'You can only delete your own events.'
        );

        $event->delete();

        return response()->json(['message' => 'Event deleted.']);
    }

    public function register(Request $request, Event $event)
    {
        abort_unless($event->requires_registration, 422, 'This event does not require registration.');
        abort_if($event->isFull(), 422, 'This event is full.');

        $registration = EventRegistration::firstOrCreate([
            'event_id' => $event->id,
            'user_id' => $request->user()->id,
        ], [
            'registered_at' => now(),
        ]);

        return new EventResource($event->fresh(['creator', 'registrations']));
    }

    public function unregister(Request $request, Event $event)
    {
        EventRegistration::where('event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return new EventResource($event->fresh(['creator', 'registrations']));
    }
}
