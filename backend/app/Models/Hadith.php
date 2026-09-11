<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hadith extends Model
{
    protected $fillable = ['collection', 'narrator', 'arabic_text', 'text', 'reference', 'category'];
}
