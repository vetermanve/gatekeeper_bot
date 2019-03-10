#!/usr/bin/env bash
if [[ -f /var/www/conf/gatekeeper/process.json ]] ; then
    rm process.json
    cp /var/www/conf/gatekeeper/process.json .
    echo "config replaced";
fi
