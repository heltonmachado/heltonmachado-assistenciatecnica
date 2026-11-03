<?php

namespace Database\Seeders;

use App\Models\Ticket;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Ticket::query()->firstOrCreate(
            ['code' => 'AT-2026-000001'],
            [
                'customer_name' => 'Cliente demonstração',
                'phone' => '(11) 99999-0000',
                'device' => 'Notebook',
                'issue' => 'Diagnóstico inicial',
                'description' => 'Chamado de exemplo para validar a instalação.',
                'status' => 'open',
                'priority' => 'normal',
                'estimate' => 150.00,
            ],
        );
    }
}
