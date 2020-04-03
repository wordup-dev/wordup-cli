FROM wordpress:cli

ARG USER_ID=1000
ARG GROUP_ID=1000

ENV WP_CLI_CACHE_DIR=/tmp/.wp-cli/cache/
ENV WP_CLI_PACKAGES_DIR=/tmp/.wp-cli/packages/

USER root
RUN apk add --no-cache zip shadow

COPY php.conf.ini /usr/local/etc/php/conf.d/conf.ini

RUN mkdir -p /var/mail 
RUN userdel -f www-data &&\
    useradd -l -u ${USER_ID} www-data

USER www-data

RUN wp package install https://github.com/wordup-dev/wordup-wp-cli/archive/v0.5.1.zip
RUN wp package install wp-cli/dist-archive-command  
