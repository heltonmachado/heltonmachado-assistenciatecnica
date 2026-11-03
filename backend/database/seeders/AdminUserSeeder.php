<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        $validPassword = is_string($password)
            && preg_match('/^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S+$/D', $password) === 1;

        if (! is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false || ! $validPassword) {
            throw new RuntimeException('Configure um ADMIN_EMAIL válido e uma ADMIN_PASSWORD com maiúscula, minúscula, número e símbolo.');
        }

        $admin = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'Administrador'),
                'password' => $password,
                'email_verified_at' => now(),
            ],
        );
        $admin->forceFill(['is_admin' => true, 'is_active' => true])->save();
    }
}
