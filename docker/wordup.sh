#!/bin/bash

function install_wordup {
    echo "Run wordup project ($WORDUP_PROJECT) specific commands..."

    if [ "$WORDUP_PROJECT_TYPE" = "plugins" ]
    then
        for i in  $(sudo -u daemon wp plugin list --field=name)
        do 
            # This is necessary in order to not delete the own plugin on installation
            if [ $i != ${WORDUP_PROJECT} ]
            then
                sudo -u daemon wp plugin delete $i
            fi
        done
    else
        sudo -u daemon wp plugin delete --all
    fi

    #sudo -u daemon wp plugin install https://storage.googleapis.com/wordup-static/wordup-connect-0.2.0.zip --activate

    sudo echo 'opcache.enable = 0' >> /opt/bitnami/php/etc/php.ini

    ###CUSTOM_SCRIPTS###
}

function start_wordup {
    echo "Run wordup startup script ..."

    sudo echo 'opcache.enable = 0' >> /opt/bitnami/php/etc/php.ini

    nami restart apache
}

if [ "$1" = "start" ]
then
    start_wordup
elif [[ ! -f "/bitnami/wordpress/.user_scripts_initialized" ]]
then
    install_wordup
fi