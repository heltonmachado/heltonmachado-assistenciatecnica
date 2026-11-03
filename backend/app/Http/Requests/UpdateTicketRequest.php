<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => ['sometimes', 'nullable', 'integer', 'exists:clients,id'],
            'customer_name' => ['sometimes', 'required_without:client_id', 'nullable', 'string', 'max:120'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'device' => ['sometimes', 'required', 'string', 'max:120'],
            'issue' => ['sometimes', 'required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'diagnosis' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'parts_used' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(['open', 'in_progress', 'completed', 'cancelled'])],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'estimate' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'estimate_approved' => ['sometimes', 'nullable', 'boolean'],
            'warranty_days' => ['sometimes', 'integer', 'min:0', 'max:3650'],
        ];
    }
}
