<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'member_ids' => ['required', 'array', 'min:1'],
            'member_ids.*' => [
                'integer',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('is_banned', false)),
                Rule::notIn([$this->user()?->id]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'member_ids.required' => 'Add at least one other member to the group.',
            'member_ids.min' => 'Add at least one other member to the group.',
        ];
    }
}
