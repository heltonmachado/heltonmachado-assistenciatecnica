<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_id' => $this->client_id,
            'client' => $this->whenLoaded('client', fn () => $this->client?->only(['id', 'name', 'email', 'phone'])),
            'code' => $this->code,
            'customer_name' => $this->customer_name,
            'phone' => $this->phone,
            'device' => $this->device,
            'issue' => $this->issue,
            'description' => $this->description,
            'diagnosis' => $this->diagnosis,
            'parts_used' => $this->parts_used,
            'status' => $this->status,
            'priority' => $this->priority,
            'estimate' => $this->estimate,
            'estimate_approved' => $this->estimate_approved,
            'warranty_days' => $this->warranty_days,
            'created_at' => $this->created_at,
        ];
    }
}
