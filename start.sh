#!/usr/bin/env bash
pm2 startOrRestart process.json && pm2 save
