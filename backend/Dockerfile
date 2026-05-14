FROM python:3.12-slim

WORKDIR /app

# Зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Исходный код + Alembic
COPY alembic.ini .
COPY alembic ./alembic
COPY app/ ./app/
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# .env монтируется как volume из compose
EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]

