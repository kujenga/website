#!/bin/sh

set -e

cd public

git status

if git diff-index --quiet HEAD; then
    echo 'No changes present, aborting deployment without error.'
    exit 0
fi

git commit -am "Update website content

Commit on source branch: $(git rev-parse --short HEAD)"

git push origin gh-pages
