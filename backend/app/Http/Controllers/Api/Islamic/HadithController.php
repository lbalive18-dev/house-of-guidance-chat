<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Models\Hadith;
use Illuminate\Http\Request;

class HadithController extends Controller
{
    public function daily()
    {
        $count = Hadith::count();

        if ($count === 0) {
            return response()->json(['message' => 'No hadiths available yet.'], 404);
        }

        $index = ((int) now()->format('z')) % $count;
        $hadith = Hadith::orderBy('id')->skip($index)->first();

        return response()->json($hadith);
    }

    public function index(Request $request)
    {
        $hadiths = Hadith::query()
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = $request->string('q');
                $q->where(fn ($sub) => $sub->where('text', 'like', "%{$term}%")->orWhere('narrator', 'like', "%{$term}%"));
            })
            ->orderBy('id')
            ->paginate($this->perPage($request, 20));

        return response()->json($hadiths);
    }

    public function categories()
    {
        return response()->json(Hadith::query()->distinct()->orderBy('category')->pluck('category'));
    }
}
