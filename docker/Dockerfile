FROM wordpress:5.4.0-php7.4-apache

COPY php.conf.ini /usr/local/etc/php/conf.d/conf.ini

# Install msmtp
RUN apt-get update; \
	apt-get install -y \
		msmtp \
		sudo \
		mariadb-client \
	;

# Install wp-cli
ENV WORDPRESS_CLI_VERSION 2.4.0

RUN set -ex; \
    curl -o /usr/local/bin/wp -fSL "https://github.com/wp-cli/wp-cli/releases/download/v${WORDPRESS_CLI_VERSION}/wp-cli-${WORDPRESS_CLI_VERSION}.phar"; \
	chmod +x /usr/local/bin/wp; \
	wp --allow-root --version


