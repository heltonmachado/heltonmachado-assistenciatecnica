<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'customer_name',
        'phone',
        'device',
        'issue',
        'description',
        'diagnosis',
        'parts_used',
        'status',
        'priority',
        'estimate',
        'estimate_approved',
        'warranty_days',
    ];

    protected function casts(): array
    {
        return [
            'estimate' => 'decimal:2',
            'estimate_approved' => 'boolean',
            'warranty_days' => 'integer',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(TicketStatusHistory::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }
}
