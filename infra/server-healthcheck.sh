#!/bin/sh
# Probes the readiness endpoint of whichever role this container runs.
set -eu

if [ "${ROLE:-game}" = "worker" ]; then
  port="${WORKER_HEALTH_PORT:-2568}"
else
  port="${PORT:-2567}"
fi

exec wget -q -O /dev/null -T 4 "http://127.0.0.1:${port}/readyz"
