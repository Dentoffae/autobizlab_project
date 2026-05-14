# AutoBizLab

Сайт и внутренние сервисы для лидогенерации: лендинг (React SPA), приём заявок (REST API), простая CRM в админке, уведомления в Telegram.

## Стек

| Слой        | Технологии |
|------------|------------|
| Frontend   | React 18, Vite 5, React Router |
| Backend    | Python 3.12, FastAPI, SQLAlchemy 2.x (async), asyncpg |
| БД         | PostgreSQL 16 |
| Прокси     | Nginx (TLS, `/api/`, статика SPA, pgAdmin, медиа) |
| Контейнеры | Docker Compose |

## Структура репозитория

```
Autobizlab/
├── backend/           # FastAPI + Alembic (`backend/alembic/`)
├── frontend-src/      # Исходники SPA (сборка → Nginx внутри образа frontend)
├── frontend/          # Статический HTML-лендинг (опционально, не путать с SPA из frontend-src)
├── nginx/             # reverse proxy: conf.d + snippets (CSP, pgAdmin allowlist)
├── pgadmin/           # servers.json для pgAdmin
├── certbot/           # каталоги для Let's Encrypt (при необходимости)
├── scripts/           # обслуживание (напр. продление TLS)
├── docker-compose.yml
└── .env               # секреты и настройки (не коммитить)
```

## Требования

- Docker и Docker Compose v2
- Предварительно созданный **внешний** том PostgreSQL (в `docker-compose.yml` указано `external: true`):

  ```bash
  docker volume create autobizlab_postgres
  ```

  Том для медиа создаётся Compose автоматически (`autobizlab_media`), если его ещё нет — при первом запуске убедитесь, что политика именования томов совпадает с вашим `docker-compose.yml`.

## Быстрый старт (продакшен-стек)

1. Скопируйте переменные окружения в `.env` в корне проекта (см. раздел ниже).
2. Создайте том `autobizlab_postgres`, если его ещё нет.
3. Запуск:

   ```bash
   docker compose up -d --build
   ```

4. Сайт и API идут через Nginx на портах **80** / **443** (если настроен TLS).

Внутри сети Compose сервисы: `backend:8000`, `frontend:80`, `postgres:5432`, `pgadmin:80`.

## Переменные окружения (`.env`)

Файл монтируется в контейнер backend как `/app/.env`. Минимально нужны параметры БД (совпадают с сервисом `postgres` в Compose):

| Переменная | Назначение |
|------------|------------|
| `POSTGRES_USER` | пользователь БД |
| `POSTGRES_PASSWORD` | пароль |
| `POSTGRES_DB` | имя базы |

**pgAdmin** (сервис `pgadmin`):

| Переменная | Назначение |
|------------|------------|
| `PGADMIN_DEFAULT_EMAIL` | логин в веб-интерфейсе |
| `PGADMIN_DEFAULT_PASSWORD` | пароль |

**Backend (JWT и cookie админки):**

| Переменная | Назначение |
|------------|------------|
| `APP_ENV` | `development` или `production`. В режиме `production` приложение не стартует со слабым `JWT_SECRET` и без `COOKIE_SECURE=true`. |
| `JWT_SECRET` | Подпись JWT. Для продакшена минимум **32 символа**, не значение по умолчанию. Пример: `openssl rand -base64 32`. |
| `COOKIE_SECURE` | `true` если сайт по **HTTPS** (так браузер примет cookie с флагом `Secure`). При `APP_ENV=production` должно быть `true`. На локальном HTTP оставьте `false`. |
| `JWT_COOKIE_NAME` | (опционально) имя httpOnly cookie, по умолчанию `admin_access_token`. |

**Пароль администратора:** при регистрации первого пользователя требуется **не менее 12 символов**, латинские буквы **верхнего и нижнего** регистра и **цифра**, без пробелов.

**2FA (TOTP):** после входа включите в панели **🔐 2FA** или через API (`POST /api/v1/auth/totp/begin` → `POST /api/v1/auth/totp/confirm`). Опционально **`TOTP_ISSUER`** (по умолчанию `AutoBizLab`). Миграция Alembic `20260212_totp` добавляет `admin_users.totp_secret`.

**Sentry (опционально):** при сборке фронтенда задайте **`VITE_SENTRY_DSN`**, чтобы ошибки React попадали в Sentry.

**Пререндер SEO:** `npm run build` вызывает `prebuild` — в **`dist/en/...`**, **`dist/ru/...`** копируются HTML-оболочки с корректными `<title>`, `description`, `canonical` для `/enquire` и `/privacy` (без полного SSR).

Сессия админки: после логина токен в **httpOnly** cookie (`SameSite=Lax`); SPA шлёт `credentials: 'include'`. Альтернативно поддерживается заголовок `Authorization: Bearer` (например Postman). Классический CSRF через формы с другого сайта не отправляет такие cookie для cross-site запросов к JSON API при `SameSite=Lax`; при появлении сторонних origin с cookies стоит ввести отдельный CSRF-токен.

Конфигурационные ключи формы `/enquire` для публики доступны только через **`GET /api/v1/public/enquire-form-options`**. Полный список `admin_settings` — только после входа администратором (**`GET /api/v1/auth/me` успешный**).

**Telegram:**

| Переменная | Назначение |
|------------|------------|
| `TELEGRAM_BOT_TOKEN` | токен бота для уведомлений о новых заявках |
| `TELEGRAM_CHAT_ID` | основной чат |
| `TELEGRAM_CHAT_ID_2` | дополнительный чат (если используется) |

Реестр образов в `docker-compose` указан как `localhost:5000/...`; при необходимости замените на свой registry. Учётные данные для `docker login` в проекте могут задаваться отдельно (`REGISTRY_USER`, `REGISTRY_PASSWORD` — если вы их используете в своих скриптах).

## Версия API и служебные эндпоинты

Публичные и админские маршруты FastAPI используют префикс **`/api/v1/`** (например `/api/v1/leads/quick`, `/api/v1/admin/settings`).

- **`GET /api/v1/health`** и **`GET /api/health`** — проверка готовности процесса и пинга БД (`503`, если БД недоступна).
- **`GET /api/v1/metrics`** — метрики в формате Prometheus (в т.ч. счётчик `autobizlab_http_requests_total`).

## Маршрутизация (Nginx)

- `/` — SPA из контейнера `frontend`
- `/api/` — FastAPI (`backend`), основная версия **`/api/v1/...`**
- `/pgadmin/` — pgAdmin
- `/media/` — отдача загруженных файлов из общего тома

**Rate limiting:** зоны в `nginx/nginx.conf`; на вход и 2FA действует отдельная зона для префикса **`/api/v1/auth/`** (`api_auth`); прочие запросы к `/api/` — `api_general`. Долгая серия запросов может привести к **429 Too Many Requests**.

**CSP и связанные заголовки:** `nginx/snippets/security-headers-https.conf` (порт **443**) и `security-headers-http.conf` (**80**). Для `script-src` используется только **`'self'`** (JSON-LD Organization вынесен в статический **`/organization.ld.json`**); стили пока допускают **`'unsafe-inline'`** из‑за инлайнов в приложении и Google Fonts.

**Доступ к `/pgadmin/`:** список `allow` в `nginx/snippets/pgadmin-access.conf` (замените демонстрационный адрес на свой офис/IP VPN).

Список разрешённых origin для CORS задаётся в `backend/app/main.py`.

## Миграции БД (Alembic)

При старте контейнера **backend** (`docker-entrypoint.sh`) выполняется `alembic upgrade head` один раз до запуска uvicorn (избежание гонок при `--workers 2`).

Существующая база без таблицы `alembic_version`, но уже с нужной схемой — один раз:  
`docker compose exec backend alembic stamp head`

## Локальная разработка (без полного Compose)

### Тестовый лендинг (папка `TEST`)

Объединённый промо-лендинг (**autobizlab.store** + оффер для SMB ОАЭ) для превью отдельно от основного SPA:

```bash
cd TEST
npm ci
npm run dev   # http://localhost:5174/ — прокси /api → 127.0.0.1:8000 как у frontend-src
```

### Frontend

В `vite.config.js` настроен **proxy `/api`** → `http://127.0.0.1:8000`, чтобы локально SPA и cookie сессии админки жили на одном origin (`localhost:5173`). Запускайте backend на :8000 или задайте `VITE_API_PROXY_TARGET`.

```bash
cd frontend-src
npm ci
npm run dev    # http://localhost:5173 — API через proxy
npm run build  # артефакты в dist/
```

### Backend

Нужен запущенный PostgreSQL с теми же `POSTGRES_*`, что в `.env`. Затем:

```bash
cd backend
pip install -r requirements.txt
export $(grep -v '^#' ../.env | xargs)   # или задайте переменные вручную
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Убедитесь, что в `.env` для локального запуска указан доступный `POSTGRES_HOST` (например `localhost`), если БД не в Docker-сети. Перед первым запуском примените миграции: `cd backend && alembic upgrade head` (нужен синхронный DSN, см. `database_url_sync` в конфиге).

## Поисковая оптимизация и юридические страницы

- **`/robots.txt`** и **`/sitemap.xml`** лежат в `frontend-src/public/` и попадают в корень сборки `dist/` (также продублированы в `frontend/` для статического лендинга).
- Публичная **политика конфиденциальности**: маршруты `/en/privacy`, `/ru/privacy`, редирект `/privacy` → `/en/privacy`. Ссылка в футере на всех основных страницах.
- В корневом `index.html` SPA подключены **JSON-LD Organization** из **`/organization.ld.json`** (синхронизируйте email с `src/constants/siteContact.js`) и `<link rel="sitemap" ...>`. Скрипт `scripts/write-shell-pages.mjs` добавляет в статические оболочки **`hreflang`**, **`canonical`** и **`content-language`** для `/en/...` и `/ru/...`.

## Заявки (лиды) и согласие на обработку ПДн

Эндпоинты `POST /api/v1/leads/quick` и `POST /api/v1/leads/enquire` ожидают в теле JSON поле **`privacy_consent: true`**. Без него API отвечает ошибкой валидации. В SPA (`frontend-src`) и в статическом `frontend/index.html` это поле должно отправляться вместе с формой.

Список заявок для админки: **`GET /api/v1/leads/`** — пагинация (`skip`, `limit`), фильтры **`q`**, **`source`**, **`language`**, **`created_from`**, **`created_to`**; ответ `{ "items", "total", "skip", "limit" }`.

При публикации контента обновляйте **`lastmod`** в `frontend-src/public/sitemap.xml` (и при необходимости в `frontend/sitemap.xml`).

### HTTPS и HSTS

В `nginx/conf.d/main.conf` для порта **80** добавлены базовые заголовки безопасности (`X-Content-Type-Options`, `Referrer-Policy`). **HSTS** имеет смысл включать только на **HTTPS**: готовый пример виртуального хоста — `nginx/conf.d/https.autobizlab.store.sample` (скопируйте в отдельный `.conf` после настройки сертификатов Let's Encrypt и добавьте редирект с HTTP на HTTPS).

**Автопродление Let's Encrypt.** Скрипт `scripts/renew-le-certs.sh` вызывает `certbot renew` (webroot) и затем `docker exec nginx nginx -s reload`. Для cron под **root** (два раза в сутки, лог при желании создаётся самим cron):

```
15 3,15 * * * /root/Autobizlab/scripts/renew-le-certs.sh >> /var/log/autobizlab-cert-renew.log 2>&1
```

Путь `/root/Autobizlab` замените, если каталог проекта на сервере другой. Отредактируйте crontab: `crontab -e`.

## Обновление фронтенда на сервере

После смены текстов, email или логики интерфейса нужно **пересобрать образ и перезапустить контейнеры**, иначе в браузере останется старый JavaScript-бандл:

```bash
docker compose build --no-cache frontend && docker compose up -d frontend nginx
```

Если перед сайтом стоит **Cloudflare** или другой CDN — сделайте **Purge Cache** для HTML/«всего сайта», иначе может отдаваться старый `index.html` со ссылкой на предыдущий `.js` (в футере будет старый email). В образе `frontend` для `index.html` выставлены заголовки **no-cache**, чтобы снижать этот эффект.

## Документация OpenAPI

В продакшене `docs` / `openapi` у FastAPI отключены (`docs_url=None`). Для отладки можно временно включить их в `app/main.py` или пользоваться локальным запуском с тем же кодом.

## Лицензия и контакты

Проект закрытый; вопросы по развёртыванием — к владельцам репозитория.
