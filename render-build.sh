#!/usr/bin/env bash
set -e

npm install
npm run build

cd "$(dirname "$0")"
echo "Working dir: $(pwd)"
echo "data/ contents:"
ls -lh data/

if [ -f "data/ceps.zip" ]; then
  echo "Extracting data/ceps.zip..."
  unzip -o data/ceps.zip -d data/
  echo "Extraction done."
else
  echo "ERROR: data/ceps.zip not found"
  exit 1
fi
