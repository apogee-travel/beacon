#!/usr/bin/env bash
#https://sharats.me/posts/shell-script-best-practices/

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

help() {
  echo 'Usage: sh install.sh
- Install all project (+workspace) packages.

'
}

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
  help
  exit
fi

# run at project root
cd "$(dirname "$0")/.."
ROOT=`pwd`

installTests() {
  cd "$ROOT"
  for t in "$ROOT"/tests/*; do
    echo "Installing packages in $t..."
    cd "$t"
    npm ci
  done
}

main() {
  echo "Installing packages in $ROOT..."
  npm ci --ignore-scripts

  cd "$ROOT"
}

main "$@"
