#!/bin/bash

# This script will be used to initialize the docker container. 
# Never change or delete this file.

function install_wordup {
    echo "Run Wordup project ($WORDUP_PROJECT) specific commands..."


###CUSTOM_SCRIPTS###

}

function start_wordup {
    echo "Run Wordup startup script ..."

    chown -R www-data:www-data /var/www/html/wp-content
}

function backup_wordup {
    echo "Backup WordPress for Wordup ..."

    wp_version=$(wp core version)
    timestamp=$(date +%s)
    backupfile="installation-$timestamp.tar.gz"

    [[ -z "${WORDUP_BACKUP_PATH}" ]] && target_folder="/wordup/dist/$backupfile" || target_folder="${WORDUP_BACKUP_PATH}"

    echo "Export DB"
    tmp_dir=$(mktemp -d -t wp-XXXXXXXXXX)
    wp db export "$tmp_dir/sql_dump.sql"

    echo "Copy files to tmp folder"
    cp -r /var/www/html/. $tmp_dir

    echo "Create json file"
    jq -n '{"source":"docker", "wp_version":"\($wp_version)", "created":"\($created)"}' \
        --arg wp_version $wp_version \
        --arg created $timestamp \
        > "$tmp_dir/info.json"

    echo "Create tar.gz file to /tmp/$backupfile"
    tar czf "/tmp/$backupfile" -C "$tmp_dir" .

    echo "Delete tmp files"
    rm -rf "$tmp_dir/*"

    echo "Move file to target folder"
    mv "/tmp/$backupfile" "$target_folder"

}

if [ "$1" = "start" ]
then
    start_wordup
elif [ "$1" = "install" ]
then
    install_wordup
elif [ "$1" = "backup" ]
then
    backup_wordup
else
    echo "Please provide an command"
fi