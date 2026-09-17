<?php

namespace App\Http\Requests\Call;

use Illuminate\Foundation\Http\FormRequest;

class StartCallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'conversation_id' => ['required', 'integer', 'exists:conversations,id'],
            'media' => ['required', 'in:audio,video'],
        ];
    }
}
