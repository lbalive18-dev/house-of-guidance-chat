<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Reads `per_page` from the request, clamped to a sane maximum so a
     * client can't request an unbounded page size and strain the DB.
     */
    protected function perPage(Request $request, int $default = 20, int $max = 50): int
    {
        return max(1, min($request->integer('per_page', $default), $max));
    }
}
