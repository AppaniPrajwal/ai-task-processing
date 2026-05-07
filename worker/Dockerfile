# Stage 1
FROM python:3.11-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir redis pymongo python-dotenv certifi

COPY worker.py .

# Stage 2
FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --group appuser

COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

COPY --chown=appuser:appgroup worker.py .

USER appuser

CMD ["python", "-u", "worker.py"]