<?php

namespace App\Http\Requests\Hog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'event_type' => ['sometimes', Rule::in(['seminar', 'class', 'other'])],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after:starts_at'],
            'requires_registration' => ['sometimes', 'boolean'],
            'capacity' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
