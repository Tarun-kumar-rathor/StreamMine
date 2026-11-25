import torch
import torch.nn as nn
from typing import Tuple

class StockLSTM(nn.Module):
    """
    2-layer PyTorch LSTM for financial sequence forecasting.
    Takes sliding window inputs of shape (batch_size, seq_len, 3)
    where features are: [normalized_price, pct_change, volume_ratio].
    Outputs:
      - next_step_delta: predicted percentage or price delta for the next step
      - up_down_prob: probability of upward movement (sigmoid activated)
    """
    def __init__(self, input_size: int = 3, hidden_size: int = 64, num_layers: int = 2, dropout: float = 0.2):
        super(StockLSTM, self).__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )

        # Shared dense feature representation
        self.fc_shared = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Dropout(dropout)
        )

        # Head 1: Next-step price delta regression (e.g. % change)
        self.delta_head = nn.Linear(32, 1)

        # Head 2: Up/Down direction classification probability
        self.direction_head = nn.Sequential(
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        x shape: (batch_size, seq_len, input_size)
        Returns:
          delta: (batch_size, 1)
          direction_prob: (batch_size, 1)
        """
        # lstm_out: (batch_size, seq_len, hidden_size)
        lstm_out, _ = self.lstm(x)

        # Take the representation from the final time step
        last_step = lstm_out[:, -1, :]
        feat = self.fc_shared(last_step)

        delta = self.delta_head(feat)
        direction_prob = self.direction_head(feat)

        return delta, direction_prob
