# PostgreSQL: стратегия бэкапов и runbook

## Что бэкапить

- Том `autobizlab_postgres` (данные БД) — основной источник истины.
- По желанию: том `autobizlab_media` (загрузки админки), конфиги `nginx/`, секреты не в git.

## Регулярные снимки

1. **Логический дамп** (портативно, удобно для отката на другую версию Postgres):

   ```bash
   docker exec -t postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/backup.dump
   docker cp postgres:/tmp/backup.dump ./backups/autobizlab-$(date -u +%Y%m%dT%H%M%SZ).dump
   ```

2. **Снимок тома** (быстрый disaster recovery на том же хосте):

   ```bash
   docker run --rm -v autobizlab_postgres:/v -v "$(pwd)/backups:/out" alpine \
     tar czf /out/postgres_vol-$(date -u +%Y%m%dT%H%M%SZ).tar.gz -C /v .
   ```

Хранить дампы вне сервера (S3, отдельный NAS, второй регион).

## Восстановление из `pg_dump -Fc`

```bash
# Остановить backend, освободить подключения к БД
docker compose stop backend

# Восстановить в существующую БД (перетирает объекты с теми же именами — осторожно)
docker exec -i postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < ./backups/your.dump

docker compose start backend
```

При смене major-версии Postgres сначала поднять новый контейнер, восстановить дамп, прогнать миграции при необходимости.

## Runbook: «БД недоступна»

1. Проверить `docker compose ps` и логи `postgres`: `docker logs postgres --tail 200`.
2. Проверить место на диске и inode на хосте.
3. Проверить health API: `GET /api/v1/health` (ожидается 503 при падении БД).
4. При повреждении данных — восстановить последний проверенный дамп; не удалять том до копии.

## RPO / RTO (ориентир)

- Задайте целевые **RPO** (допустимая потеря данных) и **RTO** (время восстановления) для продукта и подстройте частоту дампов и мониторинг под них.
