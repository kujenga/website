#!/bin/sh

set -e

# NOTE: As we are currently using App Engine to deploy and serve this site,
# this is disabled at the current time.

# This is the postinstall script for the repository, and it sets up a git
# worktree for the gh-pages branch as outlined in this guide, it needed.
# https://medium.com/linagora-engineering/deploying-your-js-app-to-github-pages-the-easy-way-or-not-1ef8c48424b7

# if [ ! -f public/.git ]; then
#     git worktree add public gh-pages
# fi
