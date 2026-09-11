<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reportable_type' => ['required', Rule::in(['message', 'user'])],
            'reportable_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'max:100'],
            'details' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
