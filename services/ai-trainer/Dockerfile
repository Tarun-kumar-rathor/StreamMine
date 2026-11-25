FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model definition from inference
COPY ../ai-inference/model.py ./
COPY train_lstm.py ./

CMD ["python", "train_lstm.py", "--symbol", "AAPL", "--epochs", "15"]
