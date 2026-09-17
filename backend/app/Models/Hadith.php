<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hadith extends Model
{
    protected $fillable = ['collection', 'source_collection', 'source_number', 'hadith_number', 'chapter', 'narrator', 'arabic_text', 'text', 'reference', 'grade', 'category'];
}
