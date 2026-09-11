<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateReportRequest;
use App\Models\Message;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private const TYPE_MAP = [
        'message' => Message::class,
        'user' => User::class,
    ];

    public function store(CreateReportRequest $request)
    {
        $modelClass = self::TYPE_MAP[$request->validated('reportable_type')];
        $target = $modelClass::find($request->validated('reportable_id'));

        abort_if(! $target, 404, 'The content you are trying to report no longer exists.');

        if ($target instanceof Message) {
            $canSeeMessage = $target->conversation->participants()
                ->where('user_id', $request->user()->id)
                ->exists();

            abort_unless($canSeeMessage, 403, 'You cannot report a message you do not have access to.');
        }

        if ($target instanceof User) {
            abort_if($target->id === $request->user()->id, 422, 'You cannot report yourself.');
        }

        $alreadyReported = Report::where('reporter_id', $request->user()->id)
            ->where('reportable_type', $modelClass)
            ->where('reportable_id', $target->id)
            ->where('status', 'pending')
            ->exists();

        abort_if($alreadyReported, 422, 'You have already reported this and it is pending review.');

        $report = Report::create([
            'reporter_id' => $request->user()->id,
            'reportable_type' => $modelClass,
            'reportable_id' => $target->id,
            'reason' => $request->validated('reason'),
            'details' => $request->validated('details'),
        ]);

        return response()->json([
            'message' => 'Thank you, your report has been submitted for review.',
            'id' => $report->id,
        ], 201);
    }
}
