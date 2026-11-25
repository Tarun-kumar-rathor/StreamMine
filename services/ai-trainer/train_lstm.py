import os
import json
import argparse
import numpy as np
import pandas as pd
import yfinance as yf
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import sys

# Ensure model can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai-inference")))
from model import StockLSTM

class TimeSeriesDataset(Dataset):
    def __init__(self, X: np.ndarray, y_delta: np.ndarray, y_dir: np.ndarray):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y_delta = torch.tensor(y_delta, dtype=torch.float32).unsqueeze(1)
        self.y_dir = torch.tensor(y_dir, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y_delta[idx], self.y_dir[idx]

def fetch_and_prepare_data(symbol: str = "AAPL", period: str = "2y", interval: str = "1h", seq_len: int = 30):
    print(f"[Trainer] Downloading historical data for {symbol} ({period}, {interval})...")
    df = yf.download(symbol, period=period, interval=interval, progress=False)
    if df.empty or len(df) < seq_len + 50:
        raise ValueError(f"Insufficient data retrieved for symbol {symbol}")

    # Standardize column names if MultiIndex
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    close = df['Close'].values.astype(np.float64)
    volume = df['Volume'].values.astype(np.float64)

    # 1. pct_change: (close[t] - close[t-1]) / close[t-1] * 100
    pct_change = np.zeros_like(close)
    pct_change[1:] = (close[1:] - close[:-1]) / (close[:-1] + 1e-8) * 100.0

    # 2. volume_ratio: volume[t] / 20-period moving average
    vol_series = pd.Series(volume)
    vol_ma = vol_series.rolling(window=20, min_periods=1).mean().values
    volume_ratio = volume / (vol_ma + 1e-8)

    # 3. Normalized price scale per window will be computed dynamically,
    # or min-max scaled on train set to prevent look-ahead bias.
    split_idx = int(len(close) * 0.8)
    train_close_min = float(np.min(close[:split_idx]))
    train_close_max = float(np.max(close[:split_idx]))
    close_norm = (close - train_close_min) / (train_close_max - train_close_min + 1e-8)

    # Features: [norm_price, pct_change, volume_ratio]
    features = np.column_stack([close_norm, pct_change, volume_ratio])

    # Target: next step pct_change (or price delta) and up/down direction (1 if > 0 else 0)
    X, y_delta, y_dir = [], [], []
    for i in range(len(features) - seq_len):
        X.append(features[i : i + seq_len])
        next_pct = pct_change[i + seq_len]
        y_delta.append(next_pct)
        y_dir.append(1.0 if next_pct > 0 else 0.0)

    X = np.array(X)
    y_delta = np.array(y_delta)
    y_dir = np.array(y_dir)

    # Chronological Train / Val Split (strictly avoiding look-ahead leakage)
    val_split = int(len(X) * 0.8)
    train_data = (X[:val_split], y_delta[:val_split], y_dir[:val_split])
    val_data = (X[val_split:], y_delta[val_split:], y_dir[val_split:])

    scaler_meta = {
        "symbol": symbol,
        "seq_len": seq_len,
        "train_close_min": train_close_min,
        "train_close_max": train_close_max,
        "mean_pct_change": float(np.mean(pct_change[:split_idx])),
        "std_pct_change": float(np.std(pct_change[:split_idx]) + 1e-8)
    }

    return train_data, val_data, scaler_meta

def train_model(symbol: str = "AAPL", epochs: int = 15, batch_size: int = 32, lr: float = 0.001, output_dir: str = "./weights"):
    os.makedirs(output_dir, exist_ok=True)
    train_data, val_data, meta = fetch_and_prepare_data(symbol=symbol)

    train_dataset = TimeSeriesDataset(*train_data)
    val_dataset = TimeSeriesDataset(*val_data)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=False) # Chronological batches
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = StockLSTM(input_size=3, hidden_size=64, num_layers=2, dropout=0.2).to(device)

    criterion_reg = nn.MSELoss()
    criterion_cls = nn.BCELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)

    print(f"[Trainer] Commencing training on {device} for {epochs} epochs...")
    best_val_loss = float("inf")
    save_path = os.path.join(output_dir, f"lstm_{symbol}.pt")
    meta_path = os.path.join(output_dir, f"scaler_{symbol}.json")

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for batch_x, batch_yd, batch_yc in train_loader:
            batch_x = batch_x.to(device)
            batch_yd = batch_yd.to(device)
            batch_yc = batch_yc.to(device)

            optimizer.zero_grad()
            pred_delta, pred_prob = model(batch_x)

            loss_reg = criterion_reg(pred_delta, batch_yd)
            loss_cls = criterion_cls(pred_prob, batch_yc)
            total_loss = loss_reg + 0.5 * loss_cls

            total_loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            train_loss += total_loss.item() * len(batch_x)

        train_loss /= len(train_dataset)

        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch_x, batch_yd, batch_yc in val_loader:
                batch_x = batch_x.to(device)
                batch_yd = batch_yd.to(device)
                batch_yc = batch_yc.to(device)

                pred_delta, pred_prob = model(batch_x)
                loss_reg = criterion_reg(pred_delta, batch_yd)
                loss_cls = criterion_cls(pred_prob, batch_yc)
                val_loss += (loss_reg + 0.5 * loss_cls).item() * len(batch_x)

        val_loss /= len(val_dataset)
        print(f"Epoch [{epoch:02d}/{epochs:02d}] Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), save_path)
            with open(meta_path, "w") as f:
                json.dump(meta, f, indent=2)

    print(f"[Trainer] Finished. Best weights saved to: {save_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train StockLSTM without look-ahead bias")
    parser.add_argument("--symbol", type=str, default="AAPL", help="Stock ticker symbol")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--output-dir", type=str, default="./weights", help="Directory for weights & scalers")
    args = parser.parse_args()

    train_model(symbol=args.symbol, epochs=args.epochs, batch_size=args.batch_size, output_dir=args.output_dir)
