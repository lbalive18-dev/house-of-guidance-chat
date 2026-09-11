<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('is_banned', false)),
                Rule::notIn([$this->user()?->id]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.not_in' => 'You cannot start a conversation with yourself.',
        ];
    }
}
