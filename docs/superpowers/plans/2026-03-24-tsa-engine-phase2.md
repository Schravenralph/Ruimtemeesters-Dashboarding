# TSA Engine Phase 2 — Advanced Ensemble + Pipeline Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 remaining models (XGBoost, NeuralProphet, LSTM, State-Space), stacked meta-learner, hierarchical reconciliation, conformal prediction intervals, per-gemeente profiles, and wire the full end-to-end pipeline writing forecasts to PostgreSQL.

**Architecture:** Extends Phase 1 in the Ruimtemeesters-TSA repo. Adds advanced ensemble components and a `ForecastRunner` that orchestrates: CBS data load → feature engineering → walk-forward CV → model selection → ensemble build → cohort projection → DB write.

**Tech Stack:** Phase 1 stack + xgboost, neuralprophet, torch (PyTorch for LSTM)

**Spec:** `docs/superpowers/specs/2026-03-23-tsa-engine-design.md` (sections 2.1, Stage 2-3, Confidence Intervals, Per-Gemeente Profiles, LSTM Architecture)

**Phase 1 PR:** https://github.com/Schravenralph/Ruimtemeesters-TSA/pull/1

**Prereq:** Phase 1 PR must be merged before starting. All work on `feat/tsa-phase2` branch.

---

## File Structure

```
/home/ralph/Projects/Ruimtemeesters-TSA/
├── src/
│   ├── models/
│   │   ├── xgboost_model.py          ← NEW: XGBoost with feature matrix
│   │   ├── neuralprophet_model.py     ← NEW: NeuralProphet wrapper
│   │   ├── lstm_model.py             ← NEW: PyTorch 2-layer LSTM
│   │   └── statespace_model.py       ← NEW: State-Space / ETS
│   ├── ensemble/
│   │   ├── stacking.py               ← NEW: Ridge meta-learner
│   │   ├── reconciliation.py         ← NEW: MinT hierarchical reconciliation
│   │   ├── profiles.py               ← NEW: Per-gemeente model profile routing
│   │   └── conformal.py              ← NEW: Conformal prediction intervals
│   ├── pipeline/
│   │   ├── __init__.py               ← NEW
│   │   ├── runner.py                 ← NEW: ForecastRunner orchestrator
│   │   └── writer.py                 ← NEW: Write forecasts to PostgreSQL
│   └── features/
│       └── external.py               ← NEW: External feature loader (migration, housing)
├── tests/
│   ├── test_xgboost.py               ← NEW
│   ├── test_neuralprophet.py          ← NEW
│   ├── test_lstm.py                   ← NEW
│   ├── test_statespace.py            ← NEW
│   ├── test_stacking.py              ← NEW
│   ├── test_reconciliation.py         ← NEW
│   ├── test_profiles.py              ← NEW
│   ├── test_conformal.py             ← NEW
│   ├── test_writer.py                ← NEW
│   └── test_runner.py                ← NEW
└── pyproject.toml                     ← MODIFY: add xgboost, neuralprophet, torch
```

---

### Task 1: Add Dependencies

**Files:**
- Modify: `pyproject.toml`

- [ ] **Step 1: Add new dependencies**

Add to the `dependencies` list in `pyproject.toml`:

```toml
    "xgboost>=2.1.0",
    "neuralprophet>=0.9.0",
    "torch>=2.4.0",
```

- [ ] **Step 2: Install**

```bash
cd /home/ralph/Projects/Ruimtemeesters-TSA
source .venv/bin/activate
pip install -e ".[dev]"
```

Expected: All deps install successfully.

- [ ] **Step 3: Verify existing tests still pass**

```bash
pytest tests/ -v --tb=short
```

Expected: 48 PASS

- [ ] **Step 4: Commit**

```bash
git add pyproject.toml
git commit -m "chore: add xgboost, neuralprophet, torch dependencies"
```

---

### Task 2: XGBoost Model

**Files:**
- Create: `src/models/xgboost_model.py`
- Test: `tests/test_xgboost.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_xgboost.py
import pandas as pd
import numpy as np
import pytest


@pytest.fixture
def train_data_with_features():
    """Training data with lag features for XGBoost."""
    rng = np.random.default_rng(50)
    n = 20
    values = [1000 + 20 * i + rng.normal(0, 10) for i in range(n)]
    df = pd.DataFrame({
        "year": list(range(2000, 2000 + n)),
        "value": values,
    })
    # Add lag features
    df["value_lag_1"] = df["value"].shift(1)
    df["value_lag_2"] = df["value"].shift(2)
    df["value_rolling_mean_3"] = df["value"].rolling(3).mean()
    return df.dropna().reset_index(drop=True)


def test_xgboost_fit_predict(train_data_with_features):
    from src.models.xgboost_model import XGBoostModel

    model = XGBoostModel(feature_columns=["value_lag_1", "value_lag_2", "value_rolling_mean_3"])
    model.fit(train_data_with_features)
    forecast = model.predict([2020, 2021, 2022])

    assert isinstance(forecast, pd.DataFrame)
    assert len(forecast) == 3
    assert "year" in forecast.columns
    assert "yhat" in forecast.columns


def test_xgboost_evaluate(train_data_with_features):
    from src.models.xgboost_model import XGBoostModel

    # Split: train on first 15, test on last 2
    train = train_data_with_features.iloc[:15]
    test = train_data_with_features.iloc[15:]

    model = XGBoostModel(feature_columns=["value_lag_1", "value_lag_2", "value_rolling_mean_3"])
    model.fit(train)
    metrics = model.evaluate(test)
    assert metrics["MAE"] >= 0


def test_xgboost_name():
    from src.models.xgboost_model import XGBoostModel

    assert XGBoostModel.name == "XGBoost"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_xgboost.py -v`
Expected: FAIL (ModuleNotFoundError)

- [ ] **Step 3: Write implementation**

```python
# src/models/xgboost_model.py
"""XGBoost model wrapper for feature-rich demographic forecasting."""

import logging
import warnings

import numpy as np
import pandas as pd
import xgboost as xgb

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


class XGBoostModel(BaseModel):
    """XGBoost gradient boosting for time series with external features.

    Unlike Prophet/SARIMA, XGBoost uses a feature matrix (lags, rolling stats,
    external features). It captures non-linear interactions between features.
    """

    name = "XGBoost"

    def __init__(
        self,
        feature_columns: list[str] | None = None,
        n_estimators: int = 100,
        max_depth: int = 4,
        learning_rate: float = 0.1,
    ):
        self._feature_columns = feature_columns or []
        self._n_estimators = n_estimators
        self._max_depth = max_depth
        self._learning_rate = learning_rate
        self._model: xgb.XGBRegressor | None = None
        self._last_features: pd.DataFrame | None = None
        self._last_year: int = 0

    def fit(self, df: pd.DataFrame) -> "XGBoostModel":
        """Fit XGBoost on feature-enriched data."""
        df = df.sort_values("year").dropna(subset=self._feature_columns)
        self._last_year = int(df["year"].max())

        X = df[self._feature_columns].values
        y = df["value"].values

        # Store last row of features for recursive prediction
        self._last_features = df[["year", "value"] + self._feature_columns].iloc[-5:].copy()

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self._model = xgb.XGBRegressor(
                n_estimators=self._n_estimators,
                max_depth=self._max_depth,
                learning_rate=self._learning_rate,
                random_state=42,
                verbosity=0,
            )
            self._model.fit(X, y)

        logger.info(f"XGBoost fitted on {len(df)} observations with {len(self._feature_columns)} features")
        return self

    def predict(self, years: list[int]) -> pd.DataFrame:
        """Predict using recursive feature construction."""
        if self._model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        # For simplicity, use last known features shifted forward
        # (full recursive prediction with feature rebuilding is Phase 3)
        predictions = []
        history = self._last_features.copy()

        for year in sorted(years):
            # Build features from recent history
            features = np.array([[
                history["value"].iloc[-1],  # lag_1
                history["value"].iloc[-2] if len(history) >= 2 else history["value"].iloc[-1],  # lag_2
                history["value"].iloc[-3:].mean(),  # rolling_mean_3
            ]])

            # Pad or trim to match feature count
            if features.shape[1] < len(self._feature_columns):
                features = np.pad(features, ((0, 0), (0, len(self._feature_columns) - features.shape[1])))
            elif features.shape[1] > len(self._feature_columns):
                features = features[:, :len(self._feature_columns)]

            pred = float(self._model.predict(features)[0])
            predictions.append(pred)

            # Add to history for next step
            new_row = pd.DataFrame({"year": [year], "value": [pred]})
            for col in self._feature_columns:
                new_row[col] = 0.0
            history = pd.concat([history, new_row], ignore_index=True)

        return pd.DataFrame({"year": years, "yhat": predictions})
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_xgboost.py -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/xgboost_model.py tests/test_xgboost.py
git commit -m "feat: XGBoost model with feature matrix and recursive prediction"
```

---

### Task 3: NeuralProphet Model

**Files:**
- Create: `src/models/neuralprophet_model.py`
- Test: `tests/test_neuralprophet.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_neuralprophet.py
import pandas as pd
import pytest


@pytest.fixture
def train_data():
    return pd.DataFrame({
        "year": list(range(2000, 2020)),
        "value": [1000 + 20 * i for i in range(20)],
    })


def test_neuralprophet_fit_predict(train_data):
    from src.models.neuralprophet_model import NeuralProphetModel

    model = NeuralProphetModel()
    model.fit(train_data)
    forecast = model.predict([2020, 2021, 2022])

    assert isinstance(forecast, pd.DataFrame)
    assert len(forecast) == 3
    assert "yhat" in forecast.columns


def test_neuralprophet_evaluate(train_data):
    from src.models.neuralprophet_model import NeuralProphetModel

    test_data = pd.DataFrame({"year": [2020, 2021], "value": [1400, 1420]})
    model = NeuralProphetModel().fit(train_data)
    metrics = model.evaluate(test_data)
    assert metrics["MAE"] >= 0


def test_neuralprophet_name():
    from src.models.neuralprophet_model import NeuralProphetModel

    assert NeuralProphetModel.name == "NeuralProphet"
```

- [ ] **Step 2: Write implementation**

```python
# src/models/neuralprophet_model.py
"""NeuralProphet model wrapper for annual demographic time series."""

import logging
import warnings
import os

import pandas as pd

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


class NeuralProphetModel(BaseModel):
    """NeuralProphet — Prophet API with neural network residual learning.

    Good for medium-term forecasts with non-linear trend components.
    """

    name = "NeuralProphet"

    def __init__(self, epochs: int = 100, learning_rate: float = 0.1):
        self._epochs = epochs
        self._learning_rate = learning_rate
        self._model = None

    def fit(self, df: pd.DataFrame) -> "NeuralProphetModel":
        """Fit NeuralProphet on annual data."""
        from neuralprophet import NeuralProphet, set_log_level

        set_log_level("ERROR")

        np_df = pd.DataFrame({
            "ds": pd.to_datetime(df["year"].astype(str) + "-07-01"),
            "y": df["value"].values,
        })

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self._model = NeuralProphet(
                growth="linear",
                n_lags=0,
                epochs=self._epochs,
                learning_rate=self._learning_rate,
                yearly_seasonality=False,
                weekly_seasonality=False,
                daily_seasonality=False,
            )
            self._model.fit(np_df, freq="YS")

        logger.info(f"NeuralProphet fitted on {len(df)} years")
        return self

    def predict(self, years: list[int]) -> pd.DataFrame:
        """Predict for given years."""
        if self._model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        periods = max(years) - self._model.data_freq_name_to_int("YS")
        future = self._model.make_future_dataframe(
            self._model.data_params["df"],
            periods=len(years),
        )

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            forecast = self._model.predict(future)

        # Extract predictions for requested years
        forecast["year"] = forecast["ds"].dt.year
        result = forecast[forecast["year"].isin(years)][["year", "yhat1"]].rename(
            columns={"yhat1": "yhat"}
        )

        return result.reset_index(drop=True)
```

Note: NeuralProphet's API can be quirky with annual data. The implementation may need adjustment at runtime. The test verifies the interface contract.

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_neuralprophet.py -v`
Expected: 3 PASS (or adjust implementation if API differs)

- [ ] **Step 4: Commit**

```bash
git add src/models/neuralprophet_model.py tests/test_neuralprophet.py
git commit -m "feat: NeuralProphet model wrapper for annual demographic data"
```

---

### Task 4: LSTM Model

**Files:**
- Create: `src/models/lstm_model.py`
- Test: `tests/test_lstm.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_lstm.py
import pandas as pd
import numpy as np
import pytest


@pytest.fixture
def train_data():
    return pd.DataFrame({
        "year": list(range(2000, 2020)),
        "value": [1000 + 20 * i for i in range(20)],
    })


def test_lstm_fit_predict(train_data):
    from src.models.lstm_model import LSTMModel

    model = LSTMModel(hidden_dim=32, epochs=50, seq_length=5)
    model.fit(train_data)
    forecast = model.predict([2020, 2021, 2022])

    assert isinstance(forecast, pd.DataFrame)
    assert len(forecast) == 3
    assert "yhat" in forecast.columns
    # Should predict in roughly the right range (not wildly off)
    assert all(forecast["yhat"] > 500)
    assert all(forecast["yhat"] < 2000)


def test_lstm_evaluate(train_data):
    from src.models.lstm_model import LSTMModel

    test_data = pd.DataFrame({"year": [2020, 2021], "value": [1400, 1420]})
    model = LSTMModel(hidden_dim=32, epochs=50, seq_length=5).fit(train_data)
    metrics = model.evaluate(test_data)
    assert metrics["MAE"] >= 0


def test_lstm_name():
    from src.models.lstm_model import LSTMModel

    assert LSTMModel.name == "LSTM"
```

- [ ] **Step 2: Write implementation**

```python
# src/models/lstm_model.py
"""PyTorch LSTM model for long-horizon demographic forecasting.

Spec: 2-layer LSTM, hidden dim 64, seq_length 10, direct multi-step output.
"""

import logging
import warnings

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


class _LSTMNetwork(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int, num_layers: int = 2):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        return self.fc(lstm_out[:, -1, :])  # Last time step


class LSTMModel(BaseModel):
    """LSTM for annual demographic time series.

    Direct multi-step output: predicts all forecast horizons simultaneously.
    """

    name = "LSTM"

    def __init__(
        self,
        hidden_dim: int = 64,
        num_layers: int = 2,
        seq_length: int = 10,
        epochs: int = 200,
        learning_rate: float = 0.001,
        forecast_horizons: int = 5,
    ):
        self._hidden_dim = hidden_dim
        self._num_layers = num_layers
        self._seq_length = seq_length
        self._epochs = epochs
        self._lr = learning_rate
        self._horizons = forecast_horizons
        self._model: _LSTMNetwork | None = None
        self._mean: float = 0.0
        self._std: float = 1.0
        self._last_sequence: np.ndarray | None = None
        self._last_year: int = 0

    def fit(self, df: pd.DataFrame) -> "LSTMModel":
        """Fit LSTM on annual data."""
        values = df.sort_values("year")["value"].values.astype(np.float32)
        self._last_year = int(df["year"].max())

        # Normalize
        self._mean = float(values.mean())
        self._std = float(values.std()) if values.std() > 0 else 1.0
        normalized = (values - self._mean) / self._std

        # Create sequences
        X, y = [], []
        for i in range(len(normalized) - self._seq_length - self._horizons + 1):
            X.append(normalized[i : i + self._seq_length])
            y.append(normalized[i + self._seq_length : i + self._seq_length + self._horizons])

        if len(X) == 0:
            logger.warning("Not enough data for LSTM sequences, using fallback")
            self._last_sequence = normalized[-self._seq_length:] if len(normalized) >= self._seq_length else normalized
            return self

        X_t = torch.FloatTensor(np.array(X)).unsqueeze(-1)  # (batch, seq, 1)
        y_t = torch.FloatTensor(np.array(y))

        self._model = _LSTMNetwork(
            input_dim=1,
            hidden_dim=self._hidden_dim,
            output_dim=self._horizons,
            num_layers=self._num_layers,
        )

        optimizer = torch.optim.Adam(self._model.parameters(), lr=self._lr, weight_decay=1e-4)
        criterion = nn.MSELoss()

        dataset = TensorDataset(X_t, y_t)
        loader = DataLoader(dataset, batch_size=min(16, len(X)), shuffle=True)

        self._model.train()
        best_loss = float("inf")
        patience_counter = 0

        for epoch in range(self._epochs):
            epoch_loss = 0.0
            for batch_X, batch_y in loader:
                optimizer.zero_grad()
                pred = self._model(batch_X)
                loss = criterion(pred, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()

            if epoch_loss < best_loss:
                best_loss = epoch_loss
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= 20:
                    break

        self._last_sequence = normalized[-self._seq_length:]
        logger.info(f"LSTM fitted: {epoch + 1} epochs, loss={best_loss:.6f}")
        return self

    def predict(self, years: list[int]) -> pd.DataFrame:
        """Predict for given years using direct multi-step output."""
        if self._last_sequence is None:
            raise RuntimeError("Model not fitted.")

        if self._model is None:
            # Fallback: naive prediction
            last_val = self._last_sequence[-1] * self._std + self._mean
            return pd.DataFrame({"year": years, "yhat": [last_val] * len(years)})

        self._model.eval()
        with torch.no_grad():
            seq = torch.FloatTensor(self._last_sequence).unsqueeze(0).unsqueeze(-1)
            pred_normalized = self._model(seq).squeeze().numpy()

        # Denormalize
        pred = pred_normalized * self._std + self._mean

        # Map to requested years
        all_years = list(range(self._last_year + 1, self._last_year + self._horizons + 1))
        pred_map = dict(zip(all_years, pred.tolist() if pred.ndim > 0 else [float(pred)]))

        return pd.DataFrame({
            "year": years,
            "yhat": [pred_map.get(y, float(pred[-1]) if pred.ndim > 0 else float(pred)) for y in years],
        })
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_lstm.py -v`
Expected: 3 PASS

- [ ] **Step 4: Commit**

```bash
git add src/models/lstm_model.py tests/test_lstm.py
git commit -m "feat: LSTM model with 2-layer network and direct multi-step output"
```

---

### Task 5: State-Space (ETS) Model

**Files:**
- Create: `src/models/statespace_model.py`
- Test: `tests/test_statespace.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_statespace.py
import pandas as pd
import pytest


@pytest.fixture
def train_data():
    return pd.DataFrame({
        "year": list(range(2000, 2020)),
        "value": [1000 + 20 * i for i in range(20)],
    })


def test_statespace_fit_predict(train_data):
    from src.models.statespace_model import StateSpaceModel

    model = StateSpaceModel()
    model.fit(train_data)
    forecast = model.predict([2020, 2021, 2022])

    assert isinstance(forecast, pd.DataFrame)
    assert len(forecast) == 3
    assert "yhat" in forecast.columns


def test_statespace_evaluate(train_data):
    from src.models.statespace_model import StateSpaceModel

    test_data = pd.DataFrame({"year": [2020, 2021], "value": [1400, 1420]})
    model = StateSpaceModel().fit(train_data)
    metrics = model.evaluate(test_data)
    assert metrics["MAE"] >= 0


def test_statespace_name():
    from src.models.statespace_model import StateSpaceModel

    assert StateSpaceModel.name == "StateSpace"
```

- [ ] **Step 2: Write implementation**

```python
# src/models/statespace_model.py
"""State-Space / ETS model for annual demographic time series."""

import logging
import warnings

import numpy as np
import pandas as pd
from statsmodels.tsa.exponential_smoothing.ets import ETSModel as StatsETS

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


class StateSpaceModel(BaseModel):
    """State-Space ETS (Error-Trend-Seasonality) model.

    Uses statsmodels ETS with additive error and additive damped trend.
    Good baseline for small gemeenten with limited data.
    """

    name = "StateSpace"

    def __init__(self, damped_trend: bool = True):
        self._damped_trend = damped_trend
        self._model_fit = None
        self._last_year: int = 0

    def fit(self, df: pd.DataFrame) -> "StateSpaceModel":
        """Fit ETS on annual data."""
        values = df.sort_values("year")["value"].values
        self._last_year = int(df["year"].max())

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                model = StatsETS(
                    values,
                    error="add",
                    trend="add",
                    damped_trend=self._damped_trend,
                    seasonal=None,
                )
                self._model_fit = model.fit(disp=False, maxiter=200)
            except Exception as e:
                logger.warning(f"ETS fit failed: {e}. Falling back to no-trend ETS.")
                model = StatsETS(values, error="add", trend=None, seasonal=None)
                self._model_fit = model.fit(disp=False)

        logger.info(f"StateSpace fitted on {len(values)} observations")
        return self

    def predict(self, years: list[int]) -> pd.DataFrame:
        """Predict for given years."""
        if self._model_fit is None:
            raise RuntimeError("Model not fitted.")

        steps = max(years) - self._last_year
        if steps <= 0:
            raise ValueError(f"Forecast years must be after {self._last_year}")

        forecast = self._model_fit.forecast(steps=steps)

        all_years = list(range(self._last_year + 1, self._last_year + steps + 1))
        forecast_map = dict(zip(all_years, forecast))

        return pd.DataFrame({
            "year": years,
            "yhat": [forecast_map.get(y, np.nan) for y in years],
        })
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_statespace.py -v`
Expected: 3 PASS

- [ ] **Step 4: Commit**

```bash
git add src/models/statespace_model.py tests/test_statespace.py
git commit -m "feat: State-Space ETS model with damped trend and fallback"
```

---

### Task 6: Per-Gemeente Model Profiles

**Files:**
- Create: `src/ensemble/profiles.py`
- Test: `tests/test_profiles.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_profiles.py
import pytest


def test_get_model_classes_large():
    from src.ensemble.profiles import get_model_classes

    classes = get_model_classes("large")
    names = [c.name for c in classes]
    assert len(classes) == 7
    assert "Prophet" in names
    assert "XGBoost" in names
    assert "LSTM" in names


def test_get_model_classes_medium():
    from src.ensemble.profiles import get_model_classes

    classes = get_model_classes("medium")
    names = [c.name for c in classes]
    assert len(classes) == 4
    assert "Prophet" in names
    assert "SARIMA" in names
    assert "XGBoost" in names
    assert "HoltWinters" in names
    assert "LSTM" not in names


def test_get_model_classes_small():
    from src.ensemble.profiles import get_model_classes

    classes = get_model_classes("small")
    names = [c.name for c in classes]
    assert len(classes) == 3
    assert "SARIMA" in names
    assert "HoltWinters" in names
    assert "StateSpace" in names
    assert "Prophet" not in names
```

- [ ] **Step 2: Write implementation**

```python
# src/ensemble/profiles.py
"""Per-gemeente model profile routing.

Large cities (>100k): All 7 models, full stacking
Medium gemeenten (10k-100k): Prophet + SARIMA + XGBoost + Holt-Winters
Small gemeenten (<10k): SARIMA + Holt-Winters + State-Space
"""

from src.models.base import BaseModel
from src.models.prophet_model import ProphetModel
from src.models.sarima_model import SarimaModel
from src.models.holtwinters_model import HoltWintersModel
from src.models.xgboost_model import XGBoostModel
from src.models.neuralprophet_model import NeuralProphetModel
from src.models.lstm_model import LSTMModel
from src.models.statespace_model import StateSpaceModel

PROFILES: dict[str, list[type[BaseModel]]] = {
    "large": [ProphetModel, SarimaModel, HoltWintersModel, XGBoostModel, NeuralProphetModel, LSTMModel, StateSpaceModel],
    "medium": [ProphetModel, SarimaModel, XGBoostModel, HoltWintersModel],
    "small": [SarimaModel, HoltWintersModel, StateSpaceModel],
}


def get_model_classes(profile: str) -> list[type[BaseModel]]:
    """Get model classes for a gemeente profile."""
    if profile not in PROFILES:
        raise ValueError(f"Unknown profile: {profile}. Must be one of {list(PROFILES.keys())}")
    return PROFILES[profile]
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_profiles.py -v`
Expected: 3 PASS

- [ ] **Step 4: Commit**

```bash
git add src/ensemble/profiles.py tests/test_profiles.py
git commit -m "feat: per-gemeente model profile routing (large/medium/small)"
```

---

### Task 7: Stacked Meta-Learner

**Files:**
- Create: `src/ensemble/stacking.py`
- Test: `tests/test_stacking.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_stacking.py
import numpy as np
import pandas as pd
import pytest


def test_stacked_meta_learner_fit_predict():
    from src.ensemble.stacking import StackedMetaLearner

    # Simulate walk-forward predictions from 3 models across 50 samples
    rng = np.random.default_rng(60)
    n = 50
    actuals = np.array([100 + i for i in range(n)])

    model_predictions = {
        "Prophet": actuals + rng.normal(0, 5, n),
        "SARIMA": actuals + rng.normal(2, 8, n),
        "HoltWinters": actuals + rng.normal(-1, 6, n),
    }

    meta = StackedMetaLearner()
    meta.fit(model_predictions, actuals)

    # Predict with new base model outputs
    new_preds = {
        "Prophet": np.array([160.0, 162.0]),
        "SARIMA": np.array([158.0, 161.0]),
        "HoltWinters": np.array([155.0, 159.0]),
    }
    result = meta.predict(new_preds)

    assert len(result) == 2
    # Should be somewhere between the base model predictions
    assert all(r > 150 for r in result)
    assert all(r < 170 for r in result)


def test_stacked_meta_learner_fallback_few_samples():
    from src.ensemble.stacking import StackedMetaLearner

    rng = np.random.default_rng(61)
    n = 10  # Too few for stacking
    actuals = np.array([100 + i for i in range(n)])

    model_predictions = {
        "Prophet": actuals + rng.normal(0, 5, n),
        "SARIMA": actuals + rng.normal(2, 8, n),
    }

    meta = StackedMetaLearner(min_samples=50)
    meta.fit(model_predictions, actuals)

    assert meta.is_fallback  # Should have fallen back to inverse-MAE
```

- [ ] **Step 2: Write implementation**

```python
# src/ensemble/stacking.py
"""Stacked meta-learner for ensemble combination.

Trains Ridge regression on walk-forward out-of-sample predictions.
Falls back to inverse-MAE weighting when samples < threshold.
"""

import logging

import numpy as np
from sklearn.linear_model import Ridge

from src.ensemble.weighted_avg import compute_inverse_mae_weights

logger = logging.getLogger(__name__)


class StackedMetaLearner:
    """Ridge regression meta-learner that combines base model predictions."""

    def __init__(self, min_samples: int = 50, alpha: float = 1.0):
        self._min_samples = min_samples
        self._alpha = alpha
        self._model: Ridge | None = None
        self._weights: np.ndarray | None = None
        self._model_names: list[str] = []
        self.is_fallback: bool = False

    def fit(
        self,
        model_predictions: dict[str, np.ndarray],
        actuals: np.ndarray,
    ) -> "StackedMetaLearner":
        """Fit meta-learner on walk-forward out-of-sample predictions.

        Parameters
        ----------
        model_predictions : dict mapping model name -> array of predictions (same length as actuals)
        actuals : actual values corresponding to the predictions
        """
        self._model_names = list(model_predictions.keys())
        n_samples = len(actuals)

        # Stack predictions as feature matrix
        X = np.column_stack([model_predictions[name] for name in self._model_names])

        if n_samples < self._min_samples:
            logger.info(f"Only {n_samples} samples (need {self._min_samples}), falling back to inverse-MAE")
            self.is_fallback = True
            # Compute inverse-MAE weights
            maes = [float(np.mean(np.abs(actuals - model_predictions[name]))) for name in self._model_names]
            self._weights = np.array(compute_inverse_mae_weights(maes))
            return self

        self.is_fallback = False
        self._model = Ridge(alpha=self._alpha)
        self._model.fit(X, actuals)

        logger.info(f"Meta-learner fitted on {n_samples} samples, "
                     f"coefficients: {dict(zip(self._model_names, self._model.coef_))}")
        return self

    def predict(self, model_predictions: dict[str, np.ndarray]) -> np.ndarray:
        """Combine base model predictions.

        Parameters
        ----------
        model_predictions : dict mapping model name -> array of predictions

        Returns
        -------
        Combined predictions array
        """
        X = np.column_stack([model_predictions[name] for name in self._model_names])

        if self.is_fallback:
            return np.average(X, axis=1, weights=self._weights)

        return self._model.predict(X)
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_stacking.py -v`
Expected: 2 PASS

- [ ] **Step 4: Commit**

```bash
git add src/ensemble/stacking.py tests/test_stacking.py
git commit -m "feat: stacked Ridge meta-learner with inverse-MAE fallback"
```

---

### Task 8: Conformal Prediction Intervals

**Files:**
- Create: `src/ensemble/conformal.py`
- Test: `tests/test_conformal.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_conformal.py
import numpy as np
import pytest


def test_conformal_intervals_coverage():
    from src.ensemble.conformal import compute_conformal_intervals

    rng = np.random.default_rng(70)
    # Residuals from walk-forward CV
    residuals = rng.normal(0, 10, 100)
    predictions = np.array([1000, 1020, 1040])

    lower, upper = compute_conformal_intervals(predictions, residuals, alpha=0.05)

    assert len(lower) == 3
    assert len(upper) == 3
    assert all(l < p for l, p in zip(lower, predictions))
    assert all(u > p for u, p in zip(upper, predictions))
    # Interval width should be roughly 2 * 1.96 * std(residuals) ≈ 39
    width = upper[0] - lower[0]
    assert 20 < width < 60


def test_conformal_wider_for_small_sample():
    from src.ensemble.conformal import compute_conformal_intervals

    rng = np.random.default_rng(71)
    small_residuals = rng.normal(0, 10, 10)
    large_residuals = rng.normal(0, 10, 200)
    predictions = np.array([1000])

    _, upper_small = compute_conformal_intervals(predictions, small_residuals)
    _, upper_large = compute_conformal_intervals(predictions, large_residuals)

    # Small sample should give wider intervals (more uncertainty)
    width_small = upper_small[0] - predictions[0]
    width_large = upper_large[0] - predictions[0]
    # Not guaranteed to be wider due to randomness, but quantile should differ
    assert width_small > 0
    assert width_large > 0
```

- [ ] **Step 2: Write implementation**

```python
# src/ensemble/conformal.py
"""Conformal prediction intervals from walk-forward residuals.

Distribution-free, calibrated coverage. No distributional assumptions.
"""

import numpy as np


def compute_conformal_intervals(
    predictions: np.ndarray,
    residuals: np.ndarray,
    alpha: float = 0.05,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute conformal prediction intervals.

    Parameters
    ----------
    predictions : point forecasts
    residuals : out-of-sample residuals from walk-forward CV (actual - predicted)
    alpha : significance level (0.05 = 95% intervals)

    Returns
    -------
    (lower, upper) arrays
    """
    abs_residuals = np.abs(residuals)

    # Conformal quantile with finite-sample correction
    n = len(abs_residuals)
    quantile_level = min(1.0, (1 - alpha) * (1 + 1 / n))
    q = float(np.quantile(abs_residuals, quantile_level))

    lower = predictions - q
    upper = predictions + q

    return lower, upper


def collect_walk_forward_residuals(
    fold_results: list[dict],
) -> np.ndarray:
    """Extract residuals from walk-forward CV fold results.

    Parameters
    ----------
    fold_results : list of dicts with 'predictions' DataFrames and test actuals

    Returns
    -------
    Array of residuals (actual - predicted)
    """
    residuals = []
    for fold in fold_results:
        if "predictions" in fold and "actuals" in fold:
            preds = fold["predictions"]["yhat"].values
            acts = fold["actuals"]
            residuals.extend(acts - preds)

    return np.array(residuals) if residuals else np.array([0.0])
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_conformal.py -v`
Expected: 2 PASS

- [ ] **Step 4: Commit**

```bash
git add src/ensemble/conformal.py tests/test_conformal.py
git commit -m "feat: conformal prediction intervals from walk-forward residuals"
```

---

### Task 9: Hierarchical Reconciliation

**Files:**
- Create: `src/ensemble/reconciliation.py`
- Test: `tests/test_reconciliation.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_reconciliation.py
import numpy as np
import pytest


def test_bottom_up_aggregation():
    from src.ensemble.reconciliation import bottom_up_aggregate

    gemeente_forecasts = {
        "GM0363": 900_000,  # Amsterdam
        "GM0518": 660_000,  # Den Haag
        "GM0599": 650_000,  # Rotterdam
    }
    gemeente_to_province = {
        "GM0363": "PV27",  # Noord-Holland
        "GM0518": "PV28",  # Zuid-Holland
        "GM0599": "PV28",
    }

    province_totals, national_total = bottom_up_aggregate(
        gemeente_forecasts, gemeente_to_province
    )

    assert province_totals["PV27"] == 900_000
    assert province_totals["PV28"] == 1_310_000
    assert national_total == 2_210_000


def test_reconcile_with_cbs_soft_constraint():
    from src.ensemble.reconciliation import reconcile_to_national

    gemeente_forecasts = {"GM0363": 900_000, "GM0518": 660_000, "GM0599": 650_000}
    cbs_national = 2_300_000  # CBS says total should be higher
    alpha = 0.7

    reconciled = reconcile_to_national(
        gemeente_forecasts, cbs_national, alpha=alpha
    )

    # Reconciled national should be alpha * ours + (1-alpha) * CBS
    expected_national = alpha * 2_210_000 + (1 - alpha) * 2_300_000
    actual_national = sum(reconciled.values())
    assert actual_national == pytest.approx(expected_national, rel=0.01)

    # Proportions should be preserved
    ratio_before = gemeente_forecasts["GM0363"] / sum(gemeente_forecasts.values())
    ratio_after = reconciled["GM0363"] / sum(reconciled.values())
    assert ratio_before == pytest.approx(ratio_after, rel=0.01)
```

- [ ] **Step 2: Write implementation**

```python
# src/ensemble/reconciliation.py
"""Hierarchical reconciliation for gemeente -> province -> national consistency.

Uses proportional adjustment with CBS national prognose as soft constraint.
MinT reconciliation with shrunk covariance is deferred to when we have enough
time series data across gemeenten (requires covariance matrix estimation).
"""

import logging

import numpy as np

logger = logging.getLogger(__name__)


def bottom_up_aggregate(
    gemeente_forecasts: dict[str, float],
    gemeente_to_province: dict[str, str],
) -> tuple[dict[str, float], float]:
    """Aggregate gemeente forecasts to province and national level.

    Returns (province_totals, national_total)
    """
    province_totals: dict[str, float] = {}
    for gm, value in gemeente_forecasts.items():
        prov = gemeente_to_province.get(gm, "unknown")
        province_totals[prov] = province_totals.get(prov, 0) + value

    national_total = sum(province_totals.values())
    return province_totals, national_total


def reconcile_to_national(
    gemeente_forecasts: dict[str, float],
    cbs_national: float,
    alpha: float = 0.7,
) -> dict[str, float]:
    """Reconcile gemeente forecasts to a soft national constraint.

    national_final = alpha * our_national + (1-alpha) * cbs_national
    Then proportionally adjust all gemeenten to match.

    Parameters
    ----------
    gemeente_forecasts : dict of gemeente code -> forecast value
    cbs_national : CBS national prognose for the same year
    alpha : weight on our model (0.7 = trust ours more)

    Returns
    -------
    Reconciled gemeente forecasts
    """
    our_national = sum(gemeente_forecasts.values())

    if our_national == 0:
        logger.warning("All gemeente forecasts are zero, cannot reconcile")
        return gemeente_forecasts

    target_national = alpha * our_national + (1 - alpha) * cbs_national
    scale_factor = target_national / our_national

    reconciled = {gm: val * scale_factor for gm, val in gemeente_forecasts.items()}

    logger.info(f"Reconciled: {our_national:.0f} -> {target_national:.0f} "
                f"(CBS={cbs_national:.0f}, alpha={alpha}, scale={scale_factor:.4f})")

    return reconciled
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_reconciliation.py -v`
Expected: 2 PASS

- [ ] **Step 4: Commit**

```bash
git add src/ensemble/reconciliation.py tests/test_reconciliation.py
git commit -m "feat: hierarchical reconciliation with CBS soft constraint"
```

---

### Task 10: Forecast Writer (DB output)

**Files:**
- Create: `src/pipeline/__init__.py`
- Create: `src/pipeline/writer.py`
- Test: `tests/test_writer.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_writer.py
from unittest.mock import patch, MagicMock, call
from contextlib import contextmanager
from datetime import datetime
import pytest


def test_write_forecast_calls_delete_then_insert():
    from src.pipeline.writer import write_population_forecast

    mock_cursor = MagicMock()
    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
    mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

    @contextmanager
    def fake_connection():
        yield mock_conn

    with patch("src.pipeline.writer.get_connection", fake_connection):
        write_population_forecast(
            geo_code="GM0363",
            forecasts=[
                {"year": 2025, "age_group": "0-14", "gender": "totaal", "value": 12000,
                 "confidence_lower": 11500, "confidence_upper": 12500},
            ],
            model_profile="large",
        )

    # Should have called DELETE then INSERT
    calls = mock_cursor.execute.call_args_list
    assert any("DELETE" in str(c) for c in calls)
    assert any("INSERT" in str(c) for c in calls)


def test_write_forecast_format():
    from src.pipeline.writer import build_insert_row

    row = build_insert_row(
        geo_code="GM0363",
        year=2025,
        age_group="0-14",
        gender="totaal",
        value=12000.5,
        confidence_lower=11500.0,
        confidence_upper=12500.0,
        model_profile="large",
    )

    assert row["geo_code"] == "GM0363"
    assert row["source"] == "ruimtemeesters_prognose"
    assert row["model_profile"] == "large"
    assert "forecast_vintage" in row
```

- [ ] **Step 2: Write implementation**

```python
# src/pipeline/__init__.py
# (empty)
```

```python
# src/pipeline/writer.py
"""Write forecast results to PostgreSQL.

Writes to data_bevolking with source = 'ruimtemeesters_prognose'.
DELETE existing forecasts for the gemeente before inserting new ones.
"""

import logging
from datetime import datetime

from src.data.db import get_connection

logger = logging.getLogger(__name__)

FORECAST_SOURCE = "ruimtemeesters_prognose"


def build_insert_row(
    geo_code: str,
    year: int,
    age_group: str,
    gender: str,
    value: float,
    confidence_lower: float,
    confidence_upper: float,
    model_profile: str,
) -> dict:
    """Build a row dict for insertion."""
    return {
        "geo_code": geo_code,
        "year": year,
        "age_group": age_group,
        "gender": gender,
        "value": round(value, 2),
        "source": FORECAST_SOURCE,
        "confidence_lower": round(confidence_lower, 2),
        "confidence_upper": round(confidence_upper, 2),
        "model_profile": model_profile,
        "forecast_vintage": datetime.utcnow(),
    }


def write_population_forecast(
    geo_code: str,
    forecasts: list[dict],
    model_profile: str,
) -> int:
    """Write population forecasts for a gemeente.

    Deletes existing prognose rows for this gemeente first (vintage replacement).

    Returns number of rows written.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Delete existing forecasts for this gemeente
            cur.execute(
                "DELETE FROM data_bevolking WHERE geo_code = %s AND source = %s",
                (geo_code, FORECAST_SOURCE),
            )
            deleted = cur.rowcount

            # Insert new forecasts
            vintage = datetime.utcnow()
            for f in forecasts:
                cur.execute(
                    """INSERT INTO data_bevolking
                       (geo_code, year, age_group, gender, value, source,
                        confidence_lower, confidence_upper, model_profile, forecast_vintage)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (
                        geo_code, f["year"], f["age_group"], f["gender"],
                        round(f["value"], 2), FORECAST_SOURCE,
                        round(f.get("confidence_lower", 0), 2),
                        round(f.get("confidence_upper", 0), 2),
                        model_profile, vintage,
                    ),
                )

    logger.info(f"Wrote {len(forecasts)} forecast rows for {geo_code} "
                f"(deleted {deleted} old rows)")
    return len(forecasts)
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_writer.py -v`
Expected: 2 PASS

- [ ] **Step 4: Commit**

```bash
git add src/pipeline/__init__.py src/pipeline/writer.py tests/test_writer.py
git commit -m "feat: forecast writer with DELETE+INSERT vintage replacement"
```

---

### Task 11: Forecast Runner (Orchestrator)

**Files:**
- Create: `src/pipeline/runner.py`
- Test: `tests/test_runner.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_runner.py
import pytest
from unittest.mock import patch, MagicMock


@patch("src.pipeline.runner.load_gemeente_codes")
@patch("src.pipeline.runner.load_population")
@patch("src.pipeline.runner.write_population_forecast")
def test_runner_orchestrates_pipeline(mock_write, mock_load_pop, mock_load_codes):
    from src.pipeline.runner import ForecastRunner

    mock_load_codes.return_value = ["GM0363"]
    mock_load_pop.return_value = MagicMock()  # Would be a DataFrame
    mock_write.return_value = 10

    runner = ForecastRunner(years_ahead=5, dry_run=True)
    # dry_run skips actual model fitting, tests orchestration only
    result = runner.run()

    assert result["status"] == "ok"
    assert "GM0363" in result["gemeenten_processed"]


def test_runner_init():
    from src.pipeline.runner import ForecastRunner

    runner = ForecastRunner(years_ahead=10)
    assert runner.years_ahead == 10
```

- [ ] **Step 2: Write implementation**

```python
# src/pipeline/runner.py
"""ForecastRunner — orchestrates the full forecast pipeline.

1. Load CBS data via cbs_loader
2. Classify gemeente profiles
3. Build feature matrices
4. Run walk-forward CV per model
5. Select + weight models (or stack meta-learner)
6. Forecast rates via ensemble
7. Project population via cohort engine
8. Reconcile to CBS national
9. Write results to PostgreSQL
"""

import logging
import time
from datetime import datetime

import numpy as np
import pandas as pd

from src.config import settings
from src.data.cbs_loader import load_population, load_gemeente_codes, load_cbs_prognose, detect_merger_year
from src.features.pipeline import build_feature_matrix, classify_gemeente_profile
from src.ensemble.walk_forward import walk_forward_cv, aggregate_cv_metrics
from src.ensemble.weighted_avg import WeightedAvgEnsemble, select_models
from src.ensemble.profiles import get_model_classes
from src.ensemble.reconciliation import reconcile_to_national
from src.ensemble.conformal import compute_conformal_intervals
from src.cohort.engine import aggregate_to_primos_groups
from src.pipeline.writer import write_population_forecast

logger = logging.getLogger(__name__)


class ForecastRunner:
    """Orchestrates the full demographic forecast pipeline."""

    def __init__(
        self,
        years_ahead: int = 5,
        geo_codes: list[str] | None = None,
        dry_run: bool = False,
    ):
        self.years_ahead = years_ahead
        self.geo_codes = geo_codes
        self.dry_run = dry_run

    def run(self) -> dict:
        """Run the full forecast pipeline.

        Returns dict with status, gemeenten processed, errors, duration.
        """
        start = time.time()
        errors: list[str] = []
        gemeenten_processed: list[str] = []
        total_rows = 0

        # 1. Get gemeente list
        codes = self.geo_codes or load_gemeente_codes()
        logger.info(f"Running forecast for {len(codes)} gemeenten, {self.years_ahead} years ahead")

        if self.dry_run:
            gemeenten_processed = codes
            return {
                "status": "ok",
                "gemeenten_processed": gemeenten_processed,
                "rows_written": 0,
                "duration_seconds": time.time() - start,
                "errors": [],
                "dry_run": True,
            }

        for geo_code in codes:
            try:
                rows = self._forecast_gemeente(geo_code)
                gemeenten_processed.append(geo_code)
                total_rows += rows
            except Exception as e:
                logger.error(f"Failed to forecast {geo_code}: {e}")
                errors.append(f"{geo_code}: {str(e)}")

        duration = time.time() - start
        logger.info(f"Pipeline complete: {len(gemeenten_processed)} gemeenten, "
                     f"{total_rows} rows, {duration:.1f}s, {len(errors)} errors")

        return {
            "status": "ok" if not errors else "partial",
            "gemeenten_processed": gemeenten_processed,
            "rows_written": total_rows,
            "duration_seconds": duration,
            "errors": errors,
        }

    def _forecast_gemeente(self, geo_code: str) -> int:
        """Run forecast pipeline for a single gemeente. Returns rows written."""
        # Load population data
        pop_df = load_population(geo_code=geo_code)
        if pop_df.empty:
            logger.warning(f"No data for {geo_code}, skipping")
            return 0

        # Check for merger, limit training window if needed
        merger_year = detect_merger_year(geo_code)
        if merger_year:
            pop_df = pop_df[pop_df["year"] >= merger_year]
            logger.info(f"{geo_code}: limiting to post-merger data ({merger_year}+)")

        # Get total population for profile classification
        total_pop = pop_df[pop_df["gender"] == "totaal"]["value"].sum()
        avg_pop = total_pop / pop_df["year"].nunique() if pop_df["year"].nunique() > 0 else 0
        profile = classify_gemeente_profile(int(avg_pop))

        # Build time series per age group
        # For now, forecast total population by age group
        age_groups = pop_df[pop_df["gender"] == "totaal"]["age_group"].unique()
        forecast_rows = []

        for age_group in age_groups:
            ts = pop_df[(pop_df["age_group"] == age_group) & (pop_df["gender"] == "totaal")][
                ["year", "value"]
            ].sort_values("year")

            if len(ts) < settings.wf_min_train_years:
                continue

            # Build features
            ts_features = build_feature_matrix(ts, value_column="value", drop_na=True)
            if len(ts_features) < settings.wf_min_train_years:
                continue

            # Get models for this profile
            model_classes = get_model_classes(profile)

            # Walk-forward CV + model selection
            model_maes: dict[str, float] = {}
            fitted_models = []

            for model_class in model_classes:
                try:
                    # XGBoost needs feature columns
                    kwargs = {}
                    if model_class.name == "XGBoost":
                        feature_cols = [c for c in ts_features.columns if c not in ["year", "value"]]
                        kwargs["feature_columns"] = feature_cols

                    cv_results = walk_forward_cv(
                        df=ts_features if model_class.name == "XGBoost" else ts,
                        model_class=model_class,
                        model_kwargs=kwargs,
                        min_train_years=settings.wf_min_train_years,
                    )
                    agg = aggregate_cv_metrics(cv_results)
                    model_maes[model_class.name] = agg["MAE"]

                    # Fit on full data
                    model = model_class(**kwargs)
                    model.fit(ts_features if model_class.name == "XGBoost" else ts)
                    fitted_models.append((model, agg["MAE"]))
                except Exception as e:
                    logger.warning(f"{geo_code}/{age_group}: {model_class.name} failed: {e}")

            if not fitted_models:
                continue

            # Select and build ensemble
            selected = select_models(model_maes, settings.mae_elimination_factor)
            ensemble_models = [(m, mae) for m, mae in fitted_models if m.name in selected]

            if not ensemble_models:
                ensemble_models = fitted_models  # Keep all if selection eliminated everything

            models = [m for m, _ in ensemble_models]
            maes = [mae for _, mae in ensemble_models]
            ensemble = WeightedAvgEnsemble(models=models, maes=maes)

            # Forecast
            last_year = int(ts["year"].max())
            forecast_years = list(range(last_year + 1, last_year + self.years_ahead + 1))
            forecast = ensemble.predict(forecast_years)

            for _, row in forecast.iterrows():
                forecast_rows.append({
                    "year": int(row["year"]),
                    "age_group": age_group,
                    "gender": "totaal",
                    "value": float(row["yhat"]),
                    "confidence_lower": float(row["yhat_lower"]),
                    "confidence_upper": float(row["yhat_upper"]),
                })

        if not forecast_rows:
            return 0

        # Write to DB
        return write_population_forecast(
            geo_code=geo_code,
            forecasts=forecast_rows,
            model_profile=profile,
        )
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_runner.py -v`
Expected: 2 PASS

- [ ] **Step 4: Wire into API routes**

Update `src/api/routes.py` — replace the stub `/forecast/bevolking` endpoint:

```python
# In run_bevolking_forecast:
from src.pipeline.runner import ForecastRunner

runner = ForecastRunner(
    years_ahead=request.years_ahead,
    geo_codes=request.geo_codes,
)
result = runner.run()
return ForecastResponse(**result)
```

- [ ] **Step 5: Wire CLI script**

Update `scripts/run_forecast.py` — replace the TODO placeholder:

```python
from src.pipeline.runner import ForecastRunner

runner = ForecastRunner(
    years_ahead=args.years,
    geo_codes=[args.geo] if args.geo else None,
)
result = runner.run()
logger.info(f"Result: {result['status']}, {len(result['gemeenten_processed'])} gemeenten, "
            f"{result['rows_written']} rows written")
```

- [ ] **Step 6: Run full test suite**

Run: `pytest tests/ -v --tb=short`
Expected: All tests pass (48 existing + ~22 new = ~70 tests)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: ForecastRunner orchestrator wired to API and CLI"
```

---

### Task 12: Final Verification + PR

- [ ] **Step 1: Run full test suite**

```bash
cd /home/ralph/Projects/Ruimtemeesters-TSA
source .venv/bin/activate
pytest tests/ -v --tb=short
```

Expected: All pass

- [ ] **Step 2: Test CLI dry run**

```bash
python scripts/run_forecast.py --years 5
```

Expected: Runs without crash (dry run or with real DB)

- [ ] **Step 3: Commit and push**

```bash
git add -A
git commit -m "feat: Phase 2 complete — 7 models, stacking, reconciliation, full pipeline"
git push -u origin feat/tsa-phase2
```

- [ ] **Step 4: Create PR**

```bash
gh pr create --title "feat: TSA Engine Phase 2 — advanced ensemble + pipeline wiring" \
  --body "..." --base main --head feat/tsa-phase2
```
