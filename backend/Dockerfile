FROM php:8.2-cli

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libonig-dev libpng-dev libzip-dev unzip \
    && docker-php-ext-install bcmath pcntl pdo_mysql \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY . .

RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader \
    && mkdir -p storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker-entrypoint.sh /usr/local/bin/assistencia-entrypoint
RUN chmod +x /usr/local/bin/assistencia-entrypoint

USER www-data
EXPOSE 8000
ENTRYPOINT ["assistencia-entrypoint"]
