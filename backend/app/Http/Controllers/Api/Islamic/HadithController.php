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
            ->when($request->filled('collection'), fn ($q) => $q->where('collection', $request->string('collection')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = trim((string) $request->string('q'));

                if ($term === '') {
                    return;
                }

                $q->where(function ($sub) use ($term) {
                    foreach ([
                        'text',
                        'arabic_text',
                        'narrator',
                        'reference',
                        'grade',
                        'chapter',
                        'category',
                        'source_collection',
                    ] as $index => $column) {
                        $sub->whereLikeInsensitive($column, $term, $index === 0 ? 'and' : 'or');
                    }

                    if (ctype_digit($term)) {
                        $sub->orWhere('hadith_number', (int) $term)
                            ->orWhere('source_number', (int) $term);
                    }
                });
            })
            ->when($request->filled('chapter'), fn ($q) => $q->where('chapter', $request->string('chapter')))
            ->orderByRaw('hadith_number IS NULL')
            ->orderBy('hadith_number')
            ->orderBy('id')
            ->paginate($this->perPage($request, 20));

        return response()->json($hadiths);
    }

    public function categories()
    {
        return response()->json(Hadith::query()->distinct()->orderBy('category')->pluck('category'));
    }

    public function collections()
    {
        $books = config('hadith_books.books', []);

        $counts = Hadith::query()
            ->selectRaw('collection, COUNT(*) as aggregate')
            ->groupBy('collection')
            ->pluck('aggregate', 'collection');

        $result = array_map(function (array $book) use ($counts) {
            $book['count'] = (int) ($counts[$book['collection']] ?? 0);

            return $book;
        }, $books);

        return response()->json(['books' => $result]);
    }

    public function chapters(Request $request)
    {
        $query = Hadith::query()->whereNotNull('chapter');

        if ($request->filled('collection')) {
            $query->where('collection', $request->string('collection'));
        }

        return response()->json($query->distinct()->orderBy('chapter')->pluck('chapter'));
    }

    public function show(Hadith $hadith)
    {
        return response()->json($hadith);
    }
}
