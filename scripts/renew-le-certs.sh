#!/usr/bin/env bash
# Продление Let's Encrypt (webroot) и перезагрузка nginx в Docker.
# Вызывается из cron (см. README, раздел HTTPS).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

docker run --rm \
  -v "${ROOT}/certbot/conf:/etc/letsencrypt" \
  -v "${ROOT}/certbot/www:/var/www/certbot" \
  certbot/certbot renew --quiet --webroot -w /var/www/certbot

docker exec nginx nginx -s reload
