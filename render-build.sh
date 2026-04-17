#!/usr/bin/env bash
set -e

npm install
unzip -o data/ceps.zip -d data/
echo "Build complete. ceps.csv ready."