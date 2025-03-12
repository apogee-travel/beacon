#!/usr/bin/env bash
#https://sharats.me/posts/shell-script-best-practices/

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

help() {
  echo 'Usage: sh clear.sh
Removes all node_modules, coverage, & build directories from the project.'
}

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
  help
  exit
fi

# run at project root
cd "$(dirname "$0")/

main() {
  find `pwd` -type d -name 'node_modules' -prune -exec rm -rf '{}' \;
  find `pwd` -type d -name 'coverage' -prune -exec rm -rf '{}' \;
  find `pwd` -type d -name 'build' -prune -exec rm -rf '{}' \;
  find `pwd` -type f -name '*.d.ts' -exec rm -f '{}' \;
}

main "$@"
