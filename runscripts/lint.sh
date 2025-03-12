#!/usr/bin/env bash
#https://sharats.me/posts/shell-script-best-practices/

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

help() {
  echo 'Usage: sh lint.sh [packages|example-apps]
Lint all the things.'
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

lintPackages() {
  for d in "${packages[@]}"
  do
    if [ ! -f "$d/package.json" ]; then
      continue
    fi

    echo "running lint: $d"
    npm --prefix `realpath "$d"` run lint
  done
}

exampleapps=(
  example-apps/*
)

lintExampleApps() {
  for d in "${exampleapps[@]}"
  do
    if [ ! -f "$d/package.json" ]; then
      continue
    fi

    echo "running lint: $d"
    npm --prefix `realpath "$d"` run lint
  done
}

# run at project root
cd "$(dirname "$0")/.."

main() {
  if [[ $1 == "all" || $1 == "packages" ]]; then
    lintPackages
  fi
  if [[ $1 == "all" || $1 == "services" ]]; then
    lintExampleApps
  fi
}

main "$@"
