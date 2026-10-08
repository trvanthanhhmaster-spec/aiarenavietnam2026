FROM php:8.3-fpm-alpine
RUN apk add --no-cache libcurl oniguruma \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS curl-dev oniguruma-dev \
    && docker-php-ext-install -j2 curl mbstring opcache \
    && apk del .build-deps
COPY deploy/vps/php-fpm.conf /usr/local/etc/php-fpm.conf
WORKDIR /var/www/html
USER 10001:10001
EXPOSE 9000
CMD ["php-fpm", "--nodaemonize", "--fpm-config", "/usr/local/etc/php-fpm.conf"]

