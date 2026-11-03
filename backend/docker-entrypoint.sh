#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
    APP_KEY="$(php artisan key:generate --show)"
    export APP_KEY
fi

php artisan migrate --force
php artisan db:seed --force
php artisan db:seed --class=AdminUserSeeder --force
exec php artisan serve --host=0.0.0.0 --port=8000
