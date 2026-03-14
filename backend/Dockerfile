# Minimal FastAPI Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and pip in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --upgrade pip setuptools wheel

# Copy requirements first for better caching
COPY requirements.txt requirements-ml.txt ./

# Install core dependencies
RUN pip install --no-cache-dir --no-compile -r requirements.txt

# Install sentence-transformers with CPU-only torch (~200 MB vs ~2.5 GB for CUDA)
RUN pip install --no-cache-dir --no-compile \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements-ml.txt

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
