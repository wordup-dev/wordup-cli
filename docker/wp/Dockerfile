FROM wordpress:5.2.2-php7.2-apache

ARG USER_ID=1000
ARG GROUP_ID=1000

COPY php.conf.ini /usr/local/etc/php/conf.d/conf.ini

RUN apt-get update; \
	apt-get install -y msmtp

RUN yes | pecl install xdebug \
	&& echo "zend_extension=$(find /usr/local/lib/php/extensions/ -name xdebug.so)" > /usr/local/etc/php/conf.d/xdebug.ini \
	&& echo "xdebug.remote_enable=on" >> /usr/local/etc/php/conf.d/xdebug.ini \
	&& echo "xdebug.remote_autostart=on" >> /usr/local/etc/php/conf.d/xdebug.ini 

RUN docker-php-ext-install pdo pdo_mysql

RUN userdel -f www-data &&\
    useradd -l -u ${USER_ID} www-data