#!/usr/bin/env bash
#https://sharats.me/posts/shell-script-best-practices/

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

help() {
  echo 'Usage: sh prettier.sh [packages|example-apps]
Prettify all the things.'
}

if [ "$#" -ne 1 ]; then
  help
  exit
fi

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
  help
  exit
fi

packages=(
  packages/*
)

prettierPackages() {
  for d in "${packages[@]}"
  do
    if [ ! -f "$d/package.json" ]; then
      continue
    fi

    echo "running prettier: $d"
    npm --prefix `realpath "$d"` run prettier
  done
}

exampleapps=(
  example-apps/*
)

prettierExampleApps() {
  for d in "${services[@]}"
  do
    
    if [ ! -f "$d/package.json" ]; then
      continue
    fi

    echo "running prettier: $d"
    npm --prefix `realpath "$d"` run prettier
  done
}

# run at project root
cd "$(dirname "$0")/.."

main() {
  if [[ $1 == "all" || $1 == "packages" ]]; then
    prettierPackages
  fi
  if [[ $1 == "all" || $1 == "services" ]]; then
    prettierExampleApps
  fi
}

main "$@"
