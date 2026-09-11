<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dua extends Model
{
    protected $fillable = ['title', 'category', 'arabic_text', 'transliteration', 'translation', 'reference'];
}
