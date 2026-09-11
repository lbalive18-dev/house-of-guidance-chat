<?php

namespace App\Http\Requests\Hog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:5000'],
            'audience' => ['sometimes', Rule::in(['all', 'students', 'teachers'])],
            'pinned' => ['sometimes', 'boolean'],
        ];
    }
}
