# Slim version causes issues with gcc installation
FROM python:3.11

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first (cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the service
COPY . .

EXPOSE 8080
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
