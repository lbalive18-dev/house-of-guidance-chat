# House of Guidance Chat - Backend (Laravel 12 / PHP-FPM)
FROM php:8.3-fpm-alpine AS base

# nginx + supervisor exist for the single-container Render free-tier path
# (in-container reverse proxy + process routing); the Oracle path keeps
# using its dedicated backend-nginx container and ignores them.
RUN apk add --no-cache \
    bash \
    curl \
    freetype-dev \
    icu-dev \
    jpeg-dev \
    libpng-dev \
    libwebp-dev \
    libzip-dev \
    libpq-dev \
    nginx \
    oniguruma-dev \
    zip \
    unzip \
    git \
    supervisor \
    $PHPIZE_DEPS

RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_pgsql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY docker/php/local.ini /usr/local/etc/php/conf.d/local.ini

COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .

RUN composer dump-autoload --optimize --no-scripts \
    && mkdir -p storage/framework/{cache,sessions,testing,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x docker/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/bin/sh", "docker/entrypoint.sh"]

CMD ["php-fpm"]
