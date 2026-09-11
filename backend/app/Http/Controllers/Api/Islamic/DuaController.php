<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Models\Dua;
use Illuminate\Http\Request;

class DuaController extends Controller
{
    public function index(Request $request)
    {
        $duas = Dua::query()
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = $request->string('q');
                $q->where(fn ($sub) => $sub->where('title', 'like', "%{$term}%")->orWhere('translation', 'like', "%{$term}%"));
            })
            ->orderBy('title')
            ->paginate($this->perPage($request, 20));

        return response()->json($duas);
    }

    public function show(Dua $dua)
    {
        return response()->json($dua);
    }

    public function categories()
    {
        return response()->json(Dua::query()->distinct()->orderBy('category')->pluck('category'));
    }
}
