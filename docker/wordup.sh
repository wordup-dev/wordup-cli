#!/bin/bash

# This is necessary in order to not delete the own plugin on installation

if [ "$WORDUP_PROJECT_TYPE" = "plugins" ]
then
    for i in  $(sudo -u daemon wp plugin list --field=name)
    do 
        if [ $i != ${WORDUP_PROJECT} ]
        then
            sudo -u daemon wp plugin delete $i
        fi
    done
else
   sudo -u daemon wp plugin delete --all
fi

sudo -u daemon wp plugin install https://storage.googleapis.com/wordup-static/wordup-connect-0.2.0.zip --activate

sudo echo 'opcache.enable = 0' >> /opt/bitnami/php/etc/php.ini

echo "Init wordup project specific settings..."

