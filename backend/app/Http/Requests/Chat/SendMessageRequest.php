<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required_without:attachment', 'nullable', 'string', 'max:4000'],
            'reply_to_id' => ['sometimes', 'nullable', 'integer', 'exists:messages,id'],
            'attachment' => [
                'required_without:body',
                'nullable',
                'file',
                'max:20480',
                'mimes:jpg,jpeg,png,webp,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,mp3,m4a,wav,webm,ogg',
            ],
            'attachment_type' => ['required_with:attachment', 'nullable', 'in:image,file,pdf,voice'],
            'duration_seconds' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:600'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required_without' => 'Write a message or attach a file.',
            'attachment.required_without' => 'Write a message or attach a file.',
        ];
    }
}
