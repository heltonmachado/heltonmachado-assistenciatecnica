<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'customer_name' => ['required_without:client_id', 'nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'device' => ['required', 'string', 'max:120'],
            'issue' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'diagnosis' => ['nullable', 'string', 'max:10000'],
            'parts_used' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(['open', 'in_progress', 'completed', 'cancelled'])],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'estimate' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'estimate_approved' => ['nullable', 'boolean'],
            'warranty_days' => ['sometimes', 'integer', 'min:0', 'max:3650'],
        ];
    }
}
