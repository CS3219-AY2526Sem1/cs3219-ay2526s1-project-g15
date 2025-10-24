FROM python:3.12-slim

# Create app dir
WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && \
    rm -rf /var/lib/apt/lists/*

# Copy only requirements first
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Expose the FastAPI port
EXPOSE 8002

# Use Uvicorn to run the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
