#!/usr/bin/env bash
if [ -d /var/www/conf/gatekeeper/ ] ; then
    rm process.json
    cp /var/www/conf/gatekeeper/process.json .
    echo "config replaced";
fi
