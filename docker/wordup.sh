#!/bin/bash

# This script will be used to initialize the docker container. 
# Never change this file directly.

function install_wordup {
    echo "Run wordup project ($WORDUP_PROJECT) specific commands..."


###CUSTOM_SCRIPTS###

}

function start_wordup {
    echo "Run wordup startup script ..."

    chown -R www-data:www-data /var/www/html/wp-content
}

if [ "$1" = "start" ]
then
    start_wordup
else
    install_wordup
fi