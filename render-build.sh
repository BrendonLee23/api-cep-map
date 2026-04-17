#!/usr/bin/env bash
set -e

npm install
npm run build
unzip -o data/ceps.zip -d data/
echo "Build complete."