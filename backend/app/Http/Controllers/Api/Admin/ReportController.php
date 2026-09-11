<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ResolveReportRequest;
use App\Models\Message;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $reports = Report::query()
            ->with(['reporter', 'reportable', 'resolver'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByRaw("status = 'pending' desc")
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 20));

        $reports->getCollection()->transform(fn (Report $report) => $this->present($report));

        return response()->json($reports);
    }

    public function updateStatus(ResolveReportRequest $request, Report $report)
    {
        if ($request->boolean('delete_content') && $report->reportable instanceof Message) {
            $report->reportable->update(['deleted_at' => now(), 'body' => null]);
        }

        $report->update([
            'status' => $request->validated('status'),
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        return response()->json($this->present($report->fresh(['reporter', 'reportable', 'resolver'])));
    }

    protected function present(Report $report): array
    {
        $reportable = $report->reportable;

        return [
            'id' => $report->id,
            'reason' => $report->reason,
            'details' => $report->details,
            'status' => $report->status,
            'reporter' => [
                'id' => $report->reporter->id,
                'name' => $report->reporter->name,
            ],
            'reportable_type' => $reportable instanceof Message ? 'message' : 'user',
            'reportable' => $reportable instanceof Message
                ? [
                    'id' => $reportable->id,
                    'body' => $reportable->body,
                    'is_deleted' => $reportable->deleted_at !== null,
                    'sender_name' => $reportable->sender?->name,
                    'conversation_id' => $reportable->conversation_id,
                ]
                : ($reportable instanceof User
                    ? ['id' => $reportable->id, 'name' => $reportable->name, 'is_banned' => $reportable->is_banned]
                    : null),
            'resolver' => $report->resolver ? ['id' => $report->resolver->id, 'name' => $report->resolver->name] : null,
            'resolved_at' => $report->resolved_at?->toIso8601String(),
            'created_at' => $report->created_at?->toIso8601String(),
        ];
    }
}
