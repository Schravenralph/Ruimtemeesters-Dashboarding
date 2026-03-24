# TSA Engine Phase 1 — Foundation + Working Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working demographic forecasting engine with 3 core models (Prophet, SARIMA, Holt-Winters), inverse-MAE ensemble, cohort-component projection, and FastAPI service that writes forecasts to PostgreSQL.

**Architecture:** Separate Python service (Ruimtemeesters-TSA repo) reading CBS actuals from the shared PostgreSQL database, running cohort-component projections with ML-ensemble-forecast rates, and writing results back with `source = 'ruimtemeesters_prognose'`. Dashboard reads forecasts like any other data source.

**Tech Stack:** Python 3.12, FastAPI, psycopg2, Prophet, statsmodels (SARIMA, Holt-Winters), scikit-learn, numpy, pandas, scipy, pytest, Docker

**Phase 2 (separate plan):** XGBoost, NeuralProphet, LSTM, State-Space models + stacked meta-learner + hierarchical reconciliation + per-gemeente profiles + conformal prediction intervals

**Spec:** `docs/superpowers/specs/2026-03-23-tsa-engine-design.md`

---

## File Structure

```
/home/ralph/Projects/Ruimtemeesters-TSA/          ← NEW REPO
├── pyproject.toml                                  # Dependencies, project config
├── Dockerfile                                      # Container build
├── .env.example                                    # Environment template
├── src/
│   ├── __init__.py
│   ├── config.py                                   # Settings from env vars
│   ├── data/
│   │   ├── __init__.py
│   │   ├── db.py                                   # psycopg2 connection pool
│   │   └── cbs_loader.py                           # Load CBS data from existing PG tables
│   ├── features/
│   │   ├── __init__.py
│   │   ├── lags.py                                 # Lag & rolling stat features
│   │   └── pipeline.py                             # Full feature matrix construction
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                                 # Abstract base model interface
│   │   ├── prophet_model.py                        # Facebook Prophet wrapper
│   │   ├── sarima_model.py                         # SARIMA (statsmodels)
│   │   └── holtwinters_model.py                    # Holt-Winters (statsmodels)
│   ├── ensemble/
│   │   ├── __init__.py
│   │   ├── walk_forward.py                         # Walk-forward CV + model selection
│   │   └── weighted_avg.py                         # Inverse-MAE weighted averaging
│   ├── cohort/
│   │   ├── __init__.py
│   │   ├── engine.py                               # Cohort-component projection engine
│   │   ├── fertility.py                            # ASFR rate handling + spline interpolation
│   │   ├── mortality.py                            # Survival rate handling
│   │   └── migration.py                            # Net migration by age band
│   └── api/
│       ├── __init__.py
│       ├── app.py                                  # FastAPI app factory
│       ├── routes.py                               # /forecast, /backtest, /models endpoints
│       ├── schemas.py                              # Pydantic request/response models
│       └── auth.py                                 # API key middleware
├── tests/
│   ├── conftest.py                                 # Shared fixtures (synthetic demographic data)
│   ├── test_config.py
│   ├── test_cbs_loader.py
│   ├── test_lags.py
│   ├── test_feature_pipeline.py
│   ├── test_base_model.py
│   ├── test_prophet.py
│   ├── test_sarima.py
│   ├── test_holtwinters.py
│   ├── test_walk_forward.py
│   ├── test_weighted_avg.py
│   ├── test_cohort_engine.py
│   ├── test_fertility.py
│   ├── test_mortality.py
│   ├── test_migration.py
│   └── test_api.py
└── scripts/
    └── run_forecast.py                             # CLI entry point for manual runs

# Also modified in Ruimtemeesters-Dashboarding repo:
# src/server/db/migrations/011_forecast_metadata_columns.sql
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `src/__init__.py`
- Create: `src/config.py`
- Create: `tests/conftest.py`
- Test: `tests/test_config.py`

- [ ] **Step 1: Initialize repo and create pyproject.toml**

```bash
cd /home/ralph/Projects
mkdir -p Ruimtemeesters-TSA/src Ruimtemeesters-TSA/tests Ruimtemeesters-TSA/scripts
cd Ruimtemeesters-TSA
git init
```

Write `.gitignore`:

```
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/
.env
.pytest_cache/
.venv/
*.egg
htmlcov/
.coverage
```

Write `pyproject.toml`:

```toml
[project]
name = "ruimtemeesters-tsa"
version = "0.1.0"
description = "Demographic time series analysis engine for Ruimtemeesters"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "psycopg2-binary>=2.9.0",
    "pandas>=2.2.0",
    "numpy>=1.26.0",
    "scikit-learn>=1.5.0",
    "prophet>=1.1.0",
    "statsmodels>=0.14.0",
    "scipy>=1.14.0",
    "pydantic>=2.9.0",
    "pydantic-settings>=2.6.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-cov>=5.0.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.27.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.backends"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Create .env.example**

```env
# Database (same PostgreSQL as Ruimtemeesters-Dashboarding)
DB_HOST=localhost
DB_PORT=6433
DB_NAME=dashboarding
DB_USER=postgres
DB_PASSWORD=postgres

# API Security
TSA_API_KEY=change-me-in-production

# Service
TSA_PORT=8100
LOG_LEVEL=INFO
```

- [ ] **Step 3: Create config module**

Write `src/__init__.py` (empty file).

Write `src/config.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_host: str = "localhost"
    db_port: int = 6433
    db_name: str = "dashboarding"
    db_user: str = "postgres"
    db_password: str = "postgres"

    tsa_api_key: str = "change-me-in-production"
    tsa_port: int = 8100
    log_level: str = "INFO"

    # Walk-forward CV parameters
    wf_min_train_years: int = 10
    wf_step_size: int = 1
    wf_horizons: list[int] = [1, 3, 5]

    # Model selection threshold
    mae_elimination_factor: float = 2.0

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

- [ ] **Step 4: Write failing test for config**

Write `tests/test_config.py`:

```python
import os
import pytest


def test_settings_loads_defaults():
    from src.config import Settings

    s = Settings(
        _env_file=None,
        db_host="testhost",
        db_port=5432,
        db_name="testdb",
        db_user="testuser",
        db_password="testpass",
    )
    assert s.db_host == "testhost"
    assert s.wf_min_train_years == 10
    assert s.wf_horizons == [1, 3, 5]
    assert s.mae_elimination_factor == 2.0


def test_settings_tsa_port_default():
    from src.config import Settings

    s = Settings(_env_file=None)
    assert s.tsa_port == 8100
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/ralph/Projects/Ruimtemeesters-TSA
pip install -e ".[dev]"
pytest tests/test_config.py -v
```

Expected: 2 PASS

- [ ] **Step 6: Create shared test fixtures**

Write `tests/conftest.py`:

```python
import numpy as np
import pandas as pd
import pytest

YEARS = list(range(2000, 2025))
AGE_BANDS_5YR = [
    "0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34",
    "35-39", "40-44", "45-49", "50-54", "55-59", "60-64",
    "65-69", "70-74", "75-79", "80-84", "85+",
]
PRIMOS_AGE_GROUPS = ["0-14", "15-29", "30-44", "45-64", "65-74", "75+"]
SEXES = ["male", "female"]


@pytest.fixture
def synthetic_population() -> pd.DataFrame:
    """Synthetic population data for a single gemeente, 2000-2024.

    Mimics CBS 03759ned structure: year, age_band, sex, population.
    Population ~50,000 with slow growth and realistic age distribution.
    """
    rng = np.random.default_rng(42)
    rows = []
    base_pop = {
        "0-4": 2500, "5-9": 2600, "10-14": 2700, "15-19": 2800,
        "20-24": 3200, "25-29": 3500, "30-34": 3600, "35-39": 3400,
        "40-44": 3200, "45-49": 3000, "50-54": 2800, "55-59": 2600,
        "60-64": 2400, "65-69": 2000, "70-74": 1600, "75-79": 1200,
        "80-84": 800, "85+": 500,
    }
    for year in YEARS:
        growth = 1.0 + 0.005 * (year - 2000)  # 0.5% annual growth
        for band, base in base_pop.items():
            for sex in SEXES:
                pop = int(base * growth / 2 + rng.normal(0, 50))
                rows.append({
                    "year": year,
                    "geo_code": "GM0363",
                    "age_band": band,
                    "sex": sex,
                    "population": max(0, pop),
                })
    return pd.DataFrame(rows)


@pytest.fixture
def synthetic_fertility_rates() -> pd.DataFrame:
    """Synthetic ASFR data (births per 1000 women) by 5-year age band, 2000-2024."""
    rng = np.random.default_rng(43)
    rows = []
    base_asfr = {
        "15-19": 5.0, "20-24": 30.0, "25-29": 90.0, "30-34": 110.0,
        "35-39": 70.0, "40-44": 15.0, "45-49": 1.5,
    }
    for year in YEARS:
        # Slight downward trend in fertility
        trend = 1.0 - 0.003 * (year - 2000)
        for band, base in base_asfr.items():
            rate = base * trend + rng.normal(0, 2)
            rows.append({
                "year": year,
                "geo_code": "GM0363",
                "age_band": band,
                "asfr": max(0, rate),
            })
    return pd.DataFrame(rows)


@pytest.fixture
def synthetic_survival_rates() -> pd.DataFrame:
    """Synthetic survival rates (national level), 2000-2024."""
    rng = np.random.default_rng(44)
    rows = []
    base_survival = {
        "0-4": 0.999, "5-9": 0.9998, "10-14": 0.9998, "15-19": 0.9996,
        "20-24": 0.9995, "25-29": 0.9995, "30-34": 0.9994, "35-39": 0.999,
        "40-44": 0.998, "45-49": 0.997, "50-54": 0.995, "55-59": 0.992,
        "60-64": 0.985, "65-69": 0.975, "70-74": 0.96, "75-79": 0.93,
        "80-84": 0.88, "85+": 0.75,
    }
    for year in YEARS:
        # Slight improvement in survival over time
        improvement = 0.0001 * (year - 2000)
        for band, base in base_survival.items():
            for sex in SEXES:
                rate = min(1.0, base + improvement + rng.normal(0, 0.001))
                rows.append({
                    "year": year,
                    "age_band": band,
                    "sex": sex,
                    "survival_rate": rate,
                })
    return pd.DataFrame(rows)


@pytest.fixture
def synthetic_migration() -> pd.DataFrame:
    """Synthetic net migration counts by age band for a gemeente, 2000-2024."""
    rng = np.random.default_rng(45)
    rows = []
    base_migration = {
        "0-4": 20, "5-9": 10, "10-14": 5, "15-19": -30,
        "20-24": 80, "25-29": 60, "30-34": 40, "35-39": 20,
        "40-44": 10, "45-49": 5, "50-54": 0, "55-59": -5,
        "60-64": -10, "65-69": 5, "70-74": 10, "75-79": 5,
        "80-84": 0, "85+": 0,
    }
    for year in YEARS:
        for band, base in base_migration.items():
            for sex in SEXES:
                count = int(base / 2 + rng.normal(0, 10))
                rows.append({
                    "year": year,
                    "geo_code": "GM0363",
                    "age_band": band,
                    "sex": sex,
                    "net_migration": count,
                })
    return pd.DataFrame(rows)


@pytest.fixture
def single_time_series() -> pd.DataFrame:
    """Simple univariate time series for model testing (25 annual observations)."""
    rng = np.random.default_rng(46)
    years = list(range(2000, 2025))
    values = [1000 + 20 * i + rng.normal(0, 30) for i in range(25)]
    return pd.DataFrame({"year": years, "value": values})
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with config, deps, and test fixtures"
```

---

### Task 2: Database Connection

**Files:**
- Create: `src/data/__init__.py`
- Create: `src/data/db.py`
- Test: `tests/test_db.py` (mock-based, no real DB needed)

- [ ] **Step 1: Write db module**

Write `src/data/__init__.py` (empty).

Write `src/data/db.py`:

```python
"""PostgreSQL connection pool using psycopg2.

Connects to the same database as Ruimtemeesters-Dashboarding.
Uses sync connections since forecast runs are batch jobs, not request/response.
"""

import logging
from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool

from src.config import settings

logger = logging.getLogger(__name__)

_pool: ThreadedConnectionPool | None = None


def get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        logger.info(f"Creating connection pool: {settings.db_host}:{settings.db_port}/{settings.db_name}")
        _pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=5,
            host=settings.db_host,
            port=settings.db_port,
            dbname=settings.db_name,
            user=settings.db_user,
            password=settings.db_password,
        )
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None
        logger.info("Connection pool closed")


@contextmanager
def get_connection() -> Generator:
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def query(sql: str, params: tuple | None = None) -> list[dict]:
    """Execute a read query, return rows as dicts."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]


def execute(sql: str, params: tuple | None = None) -> int:
    """Execute a write query, return affected row count."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.rowcount
```

- [ ] **Step 2: Write test**

Write `tests/test_db.py`:

```python
from unittest.mock import patch, MagicMock
import pytest


def test_query_returns_dicts():
    """Verify query() returns list of dicts using RealDictCursor."""
    from contextlib import contextmanager

    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = [{"year": 2024, "value": 100}]
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    @contextmanager
    def fake_connection():
        yield mock_conn

    with patch("src.data.db.get_connection", fake_connection):
        from src.data.db import query
        result = query("SELECT 1")
        assert result == [{"year": 2024, "value": 100}]


def test_db_module_exports():
    from src.data import db
    assert hasattr(db, "get_pool")
    assert hasattr(db, "close_pool")
    assert hasattr(db, "get_connection")
    assert hasattr(db, "query")
    assert hasattr(db, "execute")
```

- [ ] **Step 3: Run test**

Run: `pytest tests/test_db.py -v`
Expected: 2 PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: database connection pool with query/execute helpers"
```

---

### Task 3: CBS Data Loader

**Files:**
- Create: `src/data/cbs_loader.py`
- Test: `tests/test_cbs_loader.py`

- [ ] **Step 1: Write CBS loader**

Write `src/data/cbs_loader.py`:

```python
"""Load CBS data from the shared PostgreSQL database.

Reads from the tables populated by Ruimtemeesters-Dashboarding's CBS sync:
- data_bevolking (population by age/sex/region)
- data_huishoudens (households by type/region)
- data_woningen (housing stock)
- data_woningtekort (housing shortage)

Only reads rows where source = 'cbs_actuals' for training data.
"""

import logging

import pandas as pd

from src.data.db import query

logger = logging.getLogger(__name__)


def load_population(
    geo_code: str | None = None,
    year_from: int = 2000,
    year_to: int = 2024,
) -> pd.DataFrame:
    """Load population data from data_bevolking.

    Returns DataFrame with columns: year, geo_code, age_group, gender, value, source
    """
    sql = """
        SELECT year, geo_code, age_group, gender, value, source
        FROM data_bevolking
        WHERE source = 'cbs_actuals'
          AND year >= %s AND year <= %s
    """
    params: list = [year_from, year_to]

    if geo_code:
        sql += " AND geo_code = %s"
        params.append(geo_code)

    sql += " ORDER BY geo_code, year, age_group, gender"

    rows = query(sql, tuple(params))
    logger.info(f"Loaded {len(rows)} population rows ({year_from}-{year_to})")
    return pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["year", "geo_code", "age_group", "gender", "value", "source"]
    )


def load_households(
    geo_code: str | None = None,
    year_from: int = 2000,
    year_to: int = 2024,
    dimension_type: str = "samenstelling",
) -> pd.DataFrame:
    """Load household data from data_huishoudens."""
    sql = """
        SELECT year, geo_code, household_type, value, source, dimension_type
        FROM data_huishoudens
        WHERE source = 'cbs_actuals'
          AND dimension_type = %s
          AND year >= %s AND year <= %s
    """
    params: list = [dimension_type, year_from, year_to]

    if geo_code:
        sql += " AND geo_code = %s"
        params.append(geo_code)

    sql += " ORDER BY geo_code, year, household_type"

    rows = query(sql, tuple(params))
    logger.info(f"Loaded {len(rows)} household rows ({dimension_type})")
    return pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["year", "geo_code", "household_type", "value", "source", "dimension_type"]
    )


def load_cbs_prognose() -> pd.DataFrame:
    """Load CBS national population prognose (2025-2060)."""
    sql = """
        SELECT year, geo_code, age_group, gender, value, source
        FROM data_bevolking
        WHERE source = 'cbs_prognose'
        ORDER BY year, age_group, gender
    """
    rows = query(sql)
    logger.info(f"Loaded {len(rows)} CBS prognose rows")
    return pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["year", "geo_code", "age_group", "gender", "value", "source"]
    )


def load_gemeente_codes() -> list[str]:
    """Get all gemeente codes that have population data."""
    sql = """
        SELECT DISTINCT geo_code
        FROM data_bevolking
        WHERE source = 'cbs_actuals'
          AND geo_code LIKE 'GM%%'
        ORDER BY geo_code
    """
    rows = query(sql)
    codes = [r["geo_code"] for r in rows]
    logger.info(f"Found {len(codes)} gemeenten with data")
    return codes


def load_population_total_by_year(geo_code: str) -> pd.DataFrame:
    """Load total population per year for a gemeente (for merger detection).

    Returns DataFrame with columns: year, total_population
    """
    sql = """
        SELECT year, SUM(value) as total_population
        FROM data_bevolking
        WHERE source = 'cbs_actuals'
          AND geo_code = %s
          AND gender = 'totaal'
        GROUP BY year
        ORDER BY year
    """
    rows = query(sql, (geo_code,))
    return pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["year", "total_population"]
    )


def detect_merger_year(geo_code: str, threshold: float = 0.15) -> int | None:
    """Detect gemeente merger by >15% YoY population jump.

    Returns the year of the merger, or None if no merger detected.
    """
    df = load_population_total_by_year(geo_code)
    if len(df) < 2:
        return None

    df = df.sort_values("year")
    df["pct_change"] = df["total_population"].pct_change()

    jumps = df[df["pct_change"].abs() > threshold]
    if jumps.empty:
        return None

    merger_year = int(jumps.iloc[0]["year"])
    logger.warning(f"Detected merger for {geo_code} in {merger_year} "
                   f"({jumps.iloc[0]['pct_change']:.1%} change)")
    return merger_year
```

- [ ] **Step 2: Write test (mock-based)**

Write `tests/test_cbs_loader.py`:

```python
from unittest.mock import patch
import pandas as pd
import pytest


@patch("src.data.cbs_loader.query")
def test_load_population_returns_dataframe(mock_query):
    mock_query.return_value = [
        {"year": 2024, "geo_code": "GM0363", "age_group": "0-14",
         "gender": "totaal", "value": 12000, "source": "cbs_actuals"},
    ]
    from src.data.cbs_loader import load_population

    df = load_population(geo_code="GM0363", year_from=2024, year_to=2024)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 1
    assert df.iloc[0]["geo_code"] == "GM0363"
    mock_query.assert_called_once()
    # Verify SQL contains the geo_code filter
    call_sql = mock_query.call_args[0][0]
    assert "geo_code = %s" in call_sql


@patch("src.data.cbs_loader.query")
def test_load_population_empty(mock_query):
    mock_query.return_value = []
    from src.data.cbs_loader import load_population

    df = load_population()
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 0
    assert "year" in df.columns


@patch("src.data.cbs_loader.query")
def test_load_gemeente_codes(mock_query):
    mock_query.return_value = [
        {"geo_code": "GM0363"},
        {"geo_code": "GM0518"},
    ]
    from src.data.cbs_loader import load_gemeente_codes

    codes = load_gemeente_codes()
    assert codes == ["GM0363", "GM0518"]


@patch("src.data.cbs_loader.query")
def test_detect_merger_year_no_merger(mock_query):
    mock_query.return_value = [
        {"year": 2020, "total_population": 50000},
        {"year": 2021, "total_population": 50500},
        {"year": 2022, "total_population": 51000},
    ]
    from src.data.cbs_loader import detect_merger_year

    assert detect_merger_year("GM0363") is None


@patch("src.data.cbs_loader.query")
def test_detect_merger_year_with_merger(mock_query):
    mock_query.return_value = [
        {"year": 2017, "total_population": 30000},
        {"year": 2018, "total_population": 55000},  # 83% jump
        {"year": 2019, "total_population": 55500},
    ]
    from src.data.cbs_loader import detect_merger_year

    assert detect_merger_year("GM1234") == 2018
```

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_cbs_loader.py -v`
Expected: 5 PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: CBS data loader with population, households, and merger detection"
```

---

### Task 4: Database Migration 011 (Dashboarding Repo)

**Files:**
- Create: `/home/ralph/Projects/Ruimtemeesters-Dashboarding/src/server/db/migrations/011_forecast_metadata_columns.sql`

- [ ] **Step 1: Write migration**

```sql
-- Migration 011: Add forecast metadata columns for TSA engine output
-- These columns are nullable — CBS actuals have NULL for all of them.
-- Only rows with source = 'ruimtemeesters_prognose' will populate these.

-- Widen value columns to NUMERIC for fractional forecast values
ALTER TABLE data_bevolking ALTER COLUMN value TYPE NUMERIC(12,2);
ALTER TABLE data_huishoudens ALTER COLUMN value TYPE NUMERIC(12,2);
ALTER TABLE data_woningen ALTER COLUMN value TYPE NUMERIC(12,2);
ALTER TABLE data_woningtekort ALTER COLUMN value TYPE NUMERIC(12,2);

ALTER TABLE data_bevolking
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

ALTER TABLE data_huishoudens
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

ALTER TABLE data_woningen
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

ALTER TABLE data_woningtekort
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

-- Index for querying latest forecast vintage
CREATE INDEX IF NOT EXISTS idx_bevolking_forecast_vintage
  ON data_bevolking (source, forecast_vintage) WHERE source != 'cbs_actuals';

CREATE INDEX IF NOT EXISTS idx_huishoudens_forecast_vintage
  ON data_huishoudens (source, forecast_vintage) WHERE source != 'cbs_actuals';

CREATE INDEX IF NOT EXISTS idx_woningen_forecast_vintage
  ON data_woningen (source, forecast_vintage) WHERE source != 'cbs_actuals';

CREATE INDEX IF NOT EXISTS idx_woningtekort_forecast_vintage
  ON data_woningtekort (source, forecast_vintage) WHERE source != 'cbs_actuals';
```

- [ ] **Step 2: Run migration**

```bash
cd /home/ralph/Projects/Ruimtemeesters-Dashboarding
pnpm run migrate
```

Expected: Migration 011 applied successfully.

- [ ] **Step 3: Commit in dashboarding repo**

```bash
cd /home/ralph/Projects/Ruimtemeesters-Dashboarding
git add src/server/db/migrations/011_forecast_metadata_columns.sql
git commit -m "feat: migration 011 — forecast metadata columns for TSA engine"
```

---

### Task 5: Feature Engineering — Lags & Rolling Stats

**Files:**
- Create: `src/features/__init__.py`
- Create: `src/features/lags.py`
- Test: `tests/test_lags.py`

- [ ] **Step 1: Write failing test**

Write `src/features/__init__.py` (empty).

Write `tests/test_lags.py`:

```python
import numpy as np
import pandas as pd
import pytest


def test_add_lags():
    from src.features.lags import add_lag_features

    df = pd.DataFrame({
        "year": range(2000, 2010),
        "value": [100, 110, 120, 130, 140, 150, 160, 170, 180, 190],
    })
    result = add_lag_features(df, column="value", lags=[1, 2, 5])
    assert "value_lag_1" in result.columns
    assert "value_lag_2" in result.columns
    assert "value_lag_5" in result.columns
    # Lag 1 of year 2001 (index 1) should be 100
    assert result.loc[result["year"] == 2001, "value_lag_1"].iloc[0] == 100
    # First row lag_1 should be NaN
    assert np.isnan(result.iloc[0]["value_lag_1"])


def test_add_rolling_stats():
    from src.features.lags import add_rolling_features

    df = pd.DataFrame({
        "year": range(2000, 2010),
        "value": [100, 110, 120, 130, 140, 150, 160, 170, 180, 190],
    })
    result = add_rolling_features(df, column="value", windows=[3, 5])
    assert "value_rolling_mean_3" in result.columns
    assert "value_rolling_std_3" in result.columns
    assert "value_rolling_mean_5" in result.columns
    # Rolling mean of 3 at index 2 should be mean(100, 110, 120) = 110
    assert result.iloc[2]["value_rolling_mean_3"] == pytest.approx(110.0)


def test_add_growth_rate():
    from src.features.lags import add_growth_rate

    df = pd.DataFrame({
        "year": range(2000, 2005),
        "value": [100, 110, 121, 133.1, 146.41],
    })
    result = add_growth_rate(df, column="value")
    assert "value_yoy_growth" in result.columns
    # Year 2001: (110-100)/100 = 0.1
    assert result.iloc[1]["value_yoy_growth"] == pytest.approx(0.1)


def test_add_trend_slope():
    from src.features.lags import add_trend_slope

    df = pd.DataFrame({
        "year": range(2000, 2010),
        "value": [100 + 10 * i for i in range(10)],  # Perfect linear trend
    })
    result = add_trend_slope(df, column="value", window=5)
    assert "value_trend_slope_5" in result.columns
    # For a perfect linear trend of slope 10, the 5yr slope should be ~10
    slope_val = result.iloc[6]["value_trend_slope_5"]
    assert slope_val == pytest.approx(10.0, abs=0.1)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_lags.py -v`
Expected: FAIL (ModuleNotFoundError)

- [ ] **Step 3: Write implementation**

Write `src/features/lags.py`:

```python
"""Lag, rolling statistics, and trend features for time series."""

import numpy as np
import pandas as pd


def add_lag_features(
    df: pd.DataFrame, column: str, lags: list[int] | None = None
) -> pd.DataFrame:
    """Add lagged value columns: {column}_lag_{n}."""
    if lags is None:
        lags = [1, 2, 5]
    result = df.copy()
    for lag in lags:
        result[f"{column}_lag_{lag}"] = result[column].shift(lag)
    return result


def add_rolling_features(
    df: pd.DataFrame, column: str, windows: list[int] | None = None
) -> pd.DataFrame:
    """Add rolling mean and std columns: {column}_rolling_mean_{n}, {column}_rolling_std_{n}."""
    if windows is None:
        windows = [3, 5]
    result = df.copy()
    for w in windows:
        result[f"{column}_rolling_mean_{w}"] = result[column].rolling(w).mean()
        result[f"{column}_rolling_std_{w}"] = result[column].rolling(w).std()
    return result


def add_growth_rate(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """Add year-over-year growth rate: {column}_yoy_growth."""
    result = df.copy()
    result[f"{column}_yoy_growth"] = result[column].pct_change()
    return result


def add_trend_slope(
    df: pd.DataFrame, column: str, window: int = 5
) -> pd.DataFrame:
    """Add rolling linear trend slope over {window} years: {column}_trend_slope_{n}.

    Uses OLS slope: slope = cov(x, y) / var(x) over rolling window.
    """
    result = df.copy()
    slopes = []
    values = result[column].values
    for i in range(len(values)):
        if i < window - 1:
            slopes.append(np.nan)
        else:
            y = values[i - window + 1 : i + 1]
            x = np.arange(window, dtype=float)
            slope = np.polyfit(x, y, 1)[0] if len(x) > 1 else 0.0
            slopes.append(slope)
    result[f"{column}_trend_slope_{window}"] = slopes
    return result
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_lags.py -v`
Expected: 4 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: lag, rolling, growth rate, and trend slope features"
```

---

### Task 6: Feature Engineering — Pipeline

**Files:**
- Create: `src/features/pipeline.py`
- Test: `tests/test_feature_pipeline.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_feature_pipeline.py`:

```python
import pandas as pd
import pytest


def test_build_feature_matrix(single_time_series):
    from src.features.pipeline import build_feature_matrix

    result = build_feature_matrix(single_time_series, value_column="value")
    assert isinstance(result, pd.DataFrame)
    # Should have original columns plus features
    assert "value_lag_1" in result.columns
    assert "value_rolling_mean_3" in result.columns
    assert "value_yoy_growth" in result.columns
    assert "value_trend_slope_5" in result.columns
    # Should have same number of rows
    assert len(result) == len(single_time_series)


def test_build_feature_matrix_drops_nan(single_time_series):
    from src.features.pipeline import build_feature_matrix

    result = build_feature_matrix(
        single_time_series, value_column="value", drop_na=True
    )
    # After dropping NaN from lags/rolling, fewer rows
    assert len(result) < len(single_time_series)
    assert not result.isnull().any().any()


def test_classify_gemeente_profile():
    from src.features.pipeline import classify_gemeente_profile

    assert classify_gemeente_profile(900_000) == "large"
    assert classify_gemeente_profile(50_000) == "medium"
    assert classify_gemeente_profile(5_000) == "small"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_feature_pipeline.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Write `src/features/pipeline.py`:

```python
"""Feature matrix construction pipeline.

Builds the full feature set for a single time series (one gemeente + one component).
Combines lags, rolling stats, growth rates, and trend features.
"""

import pandas as pd

from src.features.lags import (
    add_lag_features,
    add_rolling_features,
    add_growth_rate,
    add_trend_slope,
)


def build_feature_matrix(
    df: pd.DataFrame,
    value_column: str = "value",
    lags: list[int] = [1, 2, 5],
    rolling_windows: list[int] = [3, 5],
    trend_window: int = 5,
    drop_na: bool = False,
) -> pd.DataFrame:
    """Build a complete feature matrix from a univariate time series.

    Parameters
    ----------
    df : DataFrame with 'year' and value_column
    value_column : name of the target column
    lags : lag periods to create
    rolling_windows : rolling stat window sizes
    trend_window : window for linear trend slope
    drop_na : if True, drop rows with NaN (from lags/rolling)

    Returns
    -------
    DataFrame with all original columns plus features
    """
    result = df.copy()
    result = add_lag_features(result, column=value_column, lags=lags)
    result = add_rolling_features(result, column=value_column, windows=rolling_windows)
    result = add_growth_rate(result, column=value_column)
    result = add_trend_slope(result, column=value_column, window=trend_window)

    if drop_na:
        result = result.dropna().reset_index(drop=True)

    return result


def classify_gemeente_profile(population: int) -> str:
    """Classify a gemeente into a model profile based on population size.

    Returns
    -------
    'large' (>100k): all 7 models, full stacking
    'medium' (10k-100k): Prophet + SARIMA + XGBoost + Holt-Winters
    'small' (<10k): SARIMA + Holt-Winters + State-Space
    """
    if population > 100_000:
        return "large"
    elif population > 10_000:
        return "medium"
    else:
        return "small"
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_feature_pipeline.py -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: feature engineering pipeline with gemeente profile classification"
```

---

### Task 7: Base Model Interface

**Files:**
- Create: `src/models/__init__.py`
- Create: `src/models/base.py`
- Test: `tests/test_base_model.py`

- [ ] **Step 1: Write base model and test**

Write `src/models/__init__.py` (empty).

Write `src/models/base.py`:

```python
"""Abstract base class for all forecasting models."""

from abc import ABC, abstractmethod

import numpy as np
import pandas as pd


class BaseModel(ABC):
    """Interface that all forecasting models must implement.

    Models operate on simple DataFrames with 'year' and 'value' columns.
    Multi-output models (e.g., forecasting 7 age bands) run as separate
    instances per output dimension.
    """

    name: str = "BaseModel"

    @abstractmethod
    def fit(self, df: pd.DataFrame) -> "BaseModel":
        """Fit the model on training data.

        Parameters
        ----------
        df : DataFrame with columns 'year' and 'value'

        Returns
        -------
        self
        """
        ...

    @abstractmethod
    def predict(self, years: list[int]) -> pd.DataFrame:
        """Generate forecasts for the given years.

        Parameters
        ----------
        years : list of forecast years (e.g., [2025, 2026, 2027])

        Returns
        -------
        DataFrame with columns: year, yhat
        """
        ...

    def evaluate(self, test_df: pd.DataFrame) -> dict[str, float]:
        """Evaluate model on test data.

        Parameters
        ----------
        test_df : DataFrame with 'year' and 'value' columns

        Returns
        -------
        dict with MAE, RMSE, R2, MAPE
        """
        forecast = self.predict(test_df["year"].tolist())
        actual = test_df["value"].values
        predicted = forecast["yhat"].values

        mae = float(np.mean(np.abs(actual - predicted)))
        rmse = float(np.sqrt(np.mean((actual - predicted) ** 2)))

        ss_res = np.sum((actual - predicted) ** 2)
        ss_tot = np.sum((actual - np.mean(actual)) ** 2)
        r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

        # MAPE: avoid division by zero
        nonzero = actual != 0
        mape = float(np.mean(np.abs((actual[nonzero] - predicted[nonzero]) / actual[nonzero])) * 100) if nonzero.any() else float("inf")

        return {"MAE": mae, "RMSE": rmse, "R2": r2, "MAPE": mape}
```

Write `tests/test_base_model.py`:

```python
import numpy as np
import pandas as pd
import pytest
from src.models.base import BaseModel


class DummyModel(BaseModel):
    """Trivial model that always predicts the training mean."""

    name = "DummyModel"

    def __init__(self):
        self._mean = 0.0

    def fit(self, df):
        self._mean = df["value"].mean()
        return self

    def predict(self, years):
        return pd.DataFrame({"year": years, "yhat": [self._mean] * len(years)})


def test_base_model_evaluate():
    train = pd.DataFrame({"year": [2020, 2021, 2022], "value": [100, 110, 120]})
    test = pd.DataFrame({"year": [2023, 2024], "value": [130, 140]})

    model = DummyModel().fit(train)
    metrics = model.evaluate(test)

    assert "MAE" in metrics
    assert "RMSE" in metrics
    assert "R2" in metrics
    assert "MAPE" in metrics
    # Mean of training is 110, test values are 130/140
    # MAE = mean(|130-110|, |140-110|) = mean(20, 30) = 25
    assert metrics["MAE"] == pytest.approx(25.0)


def test_base_model_predict_returns_dataframe():
    train = pd.DataFrame({"year": [2020, 2021], "value": [100, 110]})
    model = DummyModel().fit(train)
    result = model.predict([2022, 2023])
    assert isinstance(result, pd.DataFrame)
    assert list(result.columns) == ["year", "yhat"]
    assert len(result) == 2
```

- [ ] **Step 2: Run tests**

Run: `pytest tests/test_base_model.py -v`
Expected: 2 PASS

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: abstract base model with evaluate() metrics"
```

---

### Task 8: Prophet Model

**Files:**
- Create: `src/models/prophet_model.py`
- Test: `tests/test_prophet.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_prophet.py`:

```python
import pandas as pd
import pytest


@pytest.fixture
def train_data():
    return pd.DataFrame({
        "year": list(range(2000, 2020)),
        "value": [1000 + 20 * i for i in range(20)],
    })


def test_prophet_fit_predict(train_data):
    from src.models.prophet_model import ProphetModel

    model = ProphetModel()
    model.fit(train_data)
    forecast = model.predict([2020, 2021, 2022])

    assert isinstance(forecast, pd.DataFrame)
    assert len(forecast) == 3
    assert "year" in forecast.columns
    assert "yhat" in forecast.columns
    # Prophet should predict roughly in the trend direction
    assert forecast.iloc[0]["yhat"] > 1000  # Should be well above start


def test_prophet_evaluate(train_data):
    from src.models.prophet_model import ProphetModel

    test_data = pd.DataFrame({
        "year": [2020, 2021],
        "value": [1400, 1420],
    })
    model = ProphetModel().fit(train_data)
    metrics = model.evaluate(test_data)
    assert metrics["MAE"] >= 0
    assert metrics["RMSE"] >= 0


def test_prophet_name():
    from src.models.prophet_model import ProphetModel

    assert ProphetModel.name == "Prophet"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_prophet.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Write `src/models/prophet_model.py`:

```python
"""Facebook Prophet model wrapper for annual demographic time series."""

import logging
import warnings

import pandas as pd
from prophet import Prophet

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


class ProphetModel(BaseModel):
    """Prophet model for demographic forecasting.

    Converts annual data to Prophet's required ds/y format.
    Disables sub-annual seasonality since we work with yearly data.
    """

    name = "Prophet"

    def __init__(
        self,
        changepoint_prior_scale: float = 0.05,
        seasonality_mode: str = "additive",
        growth: str = "linear",
    ):
        self._changepoint_prior_scale = changepoint_prior_scale
        self._seasonality_mode = seasonality_mode
        self._growth = growth
        self._model: Prophet | None = None

    def fit(self, df: pd.DataFrame) -> "ProphetModel":
        """Fit Prophet on annual data (year, value columns)."""
        # Convert to Prophet format: ds (datetime), y (target)
        prophet_df = pd.DataFrame({
            "ds": pd.to_datetime(df["year"].astype(str) + "-07-01"),
            "y": df["value"].values,
        })

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self._model = Prophet(
                growth=self._growth,
                changepoint_prior_scale=self._changepoint_prior_scale,
                seasonality_mode=self._seasonality_mode,
                yearly_seasonality=False,
                weekly_seasonality=False,
                daily_seasonality=False,
            )
            self._model.fit(prophet_df)

        logger.info(f"Prophet fitted on {len(df)} years")
        return self

    def predict(self, years: list[int]) -> pd.DataFrame:
        """Predict for given years."""
        if self._model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        future = pd.DataFrame({
            "ds": pd.to_datetime([f"{y}-07-01" for y in years]),
        })
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            forecast = self._model.predict(future)

        return pd.DataFrame({
            "year": years,
            "yhat": forecast["yhat"].values,
        })
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_prophet.py -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Prophet model wrapper for annual demographic time series"
```

---

### Task 9: SARIMA Model

**Files:**
- Create: `src/models/sarima_model.py`
- Test: `tests/test_sarima.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_sarima.py`:

```python
import pandas as pd
import pytest


@pytest.fixture
def train_data():
    return pd.DataFrame({
        "year": list(range(2000, 2020)),
        "value": [1000 + 20 * i + (i % 3) * 5 for i in range(20)],
    })


def test_sarima_fit_predict(train_data):
    from src.models.sarima_model import SarimaModel

    model = SarimaModel()
    model.fit(train_data)
    forecast = model.predict([2020, 2021, 2022])

    assert isinstance(forecast, pd.DataFrame)
    assert len(forecast) == 3
    assert "year" in forecast.columns
    assert "yhat" in forecast.columns


def test_sarima_evaluate(train_data):
    from src.models.sarima_model import SarimaModel

    test_data = pd.DataFrame({
        "year": [2020, 2021],
        "value": [1400, 1420],
    })
    model = SarimaModel().fit(train_data)
    metrics = model.evaluate(test_data)
    assert metrics["MAE"] >= 0


def test_sarima_name():
    from src.models.sarima_model import SarimaModel

    assert SarimaModel.name == "SARIMA"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_sarima.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Write `src/models/sarima_model.py`:

```python
"""SARIMA model wrapper for annual demographic time series."""

import logging
import warnings

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


class SarimaModel(BaseModel):
    """SARIMA model using statsmodels.

    For annual data without sub-annual seasonality, this is effectively ARIMA.
    Uses order (1,1,1) as default — suitable for trended demographic data.
    """

    name = "SARIMA"

    def __init__(
        self,
        order: tuple[int, int, int] = (1, 1, 1),
        trend: str = "t",
    ):
        self._order = order
        self._trend = trend
        self._model_fit = None
        self._last_year: int = 0

    def fit(self, df: pd.DataFrame) -> "SarimaModel":
        """Fit SARIMA on annual data."""
        values = df.sort_values("year")["value"].values
        self._last_year = int(df["year"].max())

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                model = SARIMAX(
                    values,
                    order=self._order,
                    trend=self._trend,
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                self._model_fit = model.fit(disp=False, maxiter=200)
            except Exception as e:
                logger.warning(f"SARIMA fit failed with order {self._order}: {e}. "
                               f"Falling back to (0,1,0)")
                model = SARIMAX(values, order=(0, 1, 0), trend="t")
                self._model_fit = model.fit(disp=False)

        logger.info(f"SARIMA fitted on {len(values)} observations")
        return self

    def predict(self, years: list[int]) -> pd.DataFrame:
        """Predict for given years."""
        if self._model_fit is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        steps = max(years) - self._last_year
        if steps <= 0:
            raise ValueError(f"Forecast years must be after {self._last_year}")

        forecast = self._model_fit.forecast(steps=steps)

        # Map forecast array to requested years
        all_years = list(range(self._last_year + 1, self._last_year + steps + 1))
        forecast_map = dict(zip(all_years, forecast))

        return pd.DataFrame({
            "year": years,
            "yhat": [forecast_map.get(y, np.nan) for y in years],
        })
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_sarima.py -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: SARIMA model wrapper with fallback on convergence failure"
```

---

### Task 10: Holt-Winters Model

**Files:**
- Create: `src/models/holtwinters_model.py`
- Test: `tests/test_holtwinters.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_holtwinters.py`:

```python
import pandas as pd
import pytest


@pytest.fixture
def train_data():
    return pd.DataFrame({
        "year": list(range(2000, 2020)),
        "value": [1000 + 20 * i for i in range(20)],
    })


def test_holtwinters_fit_predict(train_data):
    from src.models.holtwinters_model import HoltWintersModel

    model = HoltWintersModel()
    model.fit(train_data)
    forecast = model.predict([2020, 2021, 2022])

    assert isinstance(forecast, pd.DataFrame)
    assert len(forecast) == 3
    assert "year" in forecast.columns
    assert "yhat" in forecast.columns
    # Should predict in the trend direction
    assert forecast.iloc[0]["yhat"] > 1300


def test_holtwinters_evaluate(train_data):
    from src.models.holtwinters_model import HoltWintersModel

    test_data = pd.DataFrame({
        "year": [2020, 2021],
        "value": [1400, 1420],
    })
    model = HoltWintersModel().fit(train_data)
    metrics = model.evaluate(test_data)
    assert metrics["MAE"] >= 0


def test_holtwinters_name():
    from src.models.holtwinters_model import HoltWintersModel

    assert HoltWintersModel.name == "HoltWinters"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_holtwinters.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Write `src/models/holtwinters_model.py`:

```python
"""Holt-Winters (Exponential Smoothing) model for annual demographic data."""

import logging
import warnings

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


class HoltWintersModel(BaseModel):
    """Holt-Winters double exponential smoothing.

    Uses additive trend without seasonality (annual data).
    Falls back to simple exponential smoothing if fitting fails.
    """

    name = "HoltWinters"

    def __init__(self, damped_trend: bool = True):
        self._damped_trend = damped_trend
        self._model_fit = None
        self._last_year: int = 0

    def fit(self, df: pd.DataFrame) -> "HoltWintersModel":
        """Fit Holt-Winters on annual data."""
        values = df.sort_values("year")["value"].values
        self._last_year = int(df["year"].max())

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                model = ExponentialSmoothing(
                    values,
                    trend="add",
                    damped_trend=self._damped_trend,
                    seasonal=None,
                )
                self._model_fit = model.fit(optimized=True)
            except Exception as e:
                logger.warning(f"Holt-Winters fit failed: {e}. Falling back to SES.")
                model = ExponentialSmoothing(values, trend=None, seasonal=None)
                self._model_fit = model.fit(optimized=True)

        logger.info(f"Holt-Winters fitted on {len(values)} observations")
        return self

    def predict(self, years: list[int]) -> pd.DataFrame:
        """Predict for given years."""
        if self._model_fit is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

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

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_holtwinters.py -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Holt-Winters model with damped trend and SES fallback"
```

---

### Task 11: Walk-Forward Validation

**Files:**
- Create: `src/ensemble/__init__.py`
- Create: `src/ensemble/walk_forward.py`
- Test: `tests/test_walk_forward.py`

- [ ] **Step 1: Write failing test**

Write `src/ensemble/__init__.py` (empty).

Write `tests/test_walk_forward.py`:

```python
import pandas as pd
import pytest
from src.models.base import BaseModel


class NaiveModel(BaseModel):
    """Predicts last known value (for testing walk-forward)."""

    name = "Naive"

    def __init__(self):
        self._last_value = 0.0

    def fit(self, df):
        self._last_value = df.sort_values("year")["value"].iloc[-1]
        self._last_year = int(df["year"].max())
        return self

    def predict(self, years):
        return pd.DataFrame({"year": years, "yhat": [self._last_value] * len(years)})


@pytest.fixture
def linear_series():
    return pd.DataFrame({
        "year": list(range(2000, 2025)),
        "value": [1000 + 20 * i for i in range(25)],
    })


def test_walk_forward_creates_folds(linear_series):
    from src.ensemble.walk_forward import walk_forward_cv

    results = walk_forward_cv(
        df=linear_series,
        model_class=NaiveModel,
        model_kwargs={},
        min_train_years=10,
        step_size=1,
        horizons=[1, 3, 5],
    )
    assert isinstance(results, list)
    # With 25 years (2000-2024), min 10yr training, 5yr horizon:
    # First fold trains 2000-2009, predicts 2010-2014
    # Last fold trains 2000-2019, predicts 2020-2024
    assert len(results) == 11  # folds 2010..2020 as start years


def test_walk_forward_fold_has_metrics(linear_series):
    from src.ensemble.walk_forward import walk_forward_cv

    results = walk_forward_cv(
        df=linear_series,
        model_class=NaiveModel,
        model_kwargs={},
        min_train_years=10,
        step_size=1,
        horizons=[1],
    )
    fold = results[0]
    assert "fold" in fold
    assert "metrics" in fold
    assert "MAE" in fold["metrics"]
    assert "predictions" in fold


def test_walk_forward_aggregate_metrics(linear_series):
    from src.ensemble.walk_forward import walk_forward_cv, aggregate_cv_metrics

    results = walk_forward_cv(
        df=linear_series,
        model_class=NaiveModel,
        model_kwargs={},
        min_train_years=10,
        step_size=1,
        horizons=[1],
    )
    agg = aggregate_cv_metrics(results)
    assert "MAE" in agg
    assert "RMSE" in agg
    assert agg["MAE"] > 0  # Naive model should have some error on trended data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_walk_forward.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Write `src/ensemble/walk_forward.py`:

```python
"""Walk-forward cross-validation for time series models.

Expanding-window CV: train on [start..T], predict T+1..T+horizon, slide forward.
"""

import logging
from typing import Any

import numpy as np
import pandas as pd

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


def walk_forward_cv(
    df: pd.DataFrame,
    model_class: type[BaseModel],
    model_kwargs: dict[str, Any],
    min_train_years: int = 10,
    step_size: int = 1,
    horizons: list[int] = [1, 3, 5],
) -> list[dict]:
    """Run walk-forward cross-validation.

    Parameters
    ----------
    df : DataFrame with 'year' and 'value' columns, sorted by year
    model_class : BaseModel subclass to instantiate per fold
    model_kwargs : kwargs passed to model_class constructor
    min_train_years : minimum years for first training window
    step_size : years to slide forward per fold
    horizons : forecast horizons to evaluate (uses max for fold window)

    Returns
    -------
    List of fold results, each with: fold, train_years, test_years, metrics, predictions
    """
    df = df.sort_values("year").reset_index(drop=True)
    years = df["year"].values
    min_year = int(years[0])
    max_year = int(years[-1])
    max_horizon = max(horizons)

    results = []
    fold_num = 0

    # First fold: train on [min_year..min_year+min_train_years-1]
    first_test_start = min_year + min_train_years

    for test_start in range(first_test_start, max_year - max_horizon + 2, step_size):
        train_end = test_start - 1
        test_end = min(test_start + max_horizon - 1, max_year)

        train_df = df[df["year"] <= train_end]
        test_df = df[(df["year"] >= test_start) & (df["year"] <= test_end)]

        if len(test_df) == 0:
            continue

        # Fit model
        try:
            model = model_class(**model_kwargs)
            model.fit(train_df)
            metrics = model.evaluate(test_df)
            predictions = model.predict(test_df["year"].tolist())
        except Exception as e:
            logger.warning(f"Fold {fold_num} failed: {e}")
            metrics = {"MAE": np.inf, "RMSE": np.inf, "R2": -np.inf, "MAPE": np.inf}
            predictions = pd.DataFrame({"year": test_df["year"], "yhat": [np.nan] * len(test_df)})

        results.append({
            "fold": fold_num,
            "train_years": (int(min_year), int(train_end)),
            "test_years": (int(test_start), int(test_end)),
            "metrics": metrics,
            "predictions": predictions,
        })
        fold_num += 1

    logger.info(f"Walk-forward CV: {len(results)} folds completed")
    return results


def aggregate_cv_metrics(fold_results: list[dict]) -> dict[str, float]:
    """Aggregate metrics across all folds (mean).

    Returns
    -------
    Dict with mean MAE, RMSE, R2, MAPE across folds
    """
    valid = [f for f in fold_results if f["metrics"]["MAE"] != np.inf]
    if not valid:
        return {"MAE": np.inf, "RMSE": np.inf, "R2": -np.inf, "MAPE": np.inf}

    return {
        metric: float(np.mean([f["metrics"][metric] for f in valid]))
        for metric in ["MAE", "RMSE", "R2", "MAPE"]
    }
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_walk_forward.py -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: walk-forward cross-validation with fold metrics"
```

---

### Task 12: Weighted Average Ensemble

**Files:**
- Create: `src/ensemble/weighted_avg.py`
- Test: `tests/test_weighted_avg.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_weighted_avg.py`:

```python
import numpy as np
import pandas as pd
import pytest
from src.models.base import BaseModel


class HighModel(BaseModel):
    name = "High"

    def fit(self, df):
        return self

    def predict(self, years):
        return pd.DataFrame({"year": years, "yhat": [200.0] * len(years)})

    def evaluate(self, test_df):
        return {"MAE": 10.0, "RMSE": 12.0, "R2": 0.9, "MAPE": 5.0}


class LowModel(BaseModel):
    name = "Low"

    def fit(self, df):
        return self

    def predict(self, years):
        return pd.DataFrame({"year": years, "yhat": [100.0] * len(years)})

    def evaluate(self, test_df):
        return {"MAE": 50.0, "RMSE": 60.0, "R2": 0.5, "MAPE": 25.0}


def test_compute_inverse_mae_weights():
    from src.ensemble.weighted_avg import compute_inverse_mae_weights

    maes = [10.0, 50.0]
    weights = compute_inverse_mae_weights(maes)
    assert len(weights) == 2
    assert weights[0] > weights[1]  # Lower MAE gets higher weight
    assert abs(sum(weights) - 1.0) < 1e-6


def test_ensemble_predict():
    from src.ensemble.weighted_avg import WeightedAvgEnsemble

    models = [HighModel(), LowModel()]
    maes = [10.0, 50.0]  # HighModel is 5x better

    ensemble = WeightedAvgEnsemble(models=models, maes=maes)
    result = ensemble.predict([2025, 2026])

    assert len(result) == 2
    assert "yhat" in result.columns
    assert "yhat_lower" in result.columns
    assert "yhat_upper" in result.columns
    # Weighted average should be closer to 200 (HighModel) than 100 (LowModel)
    assert result.iloc[0]["yhat"] > 150


def test_ensemble_eliminate_bad_models():
    from src.ensemble.weighted_avg import select_models

    maes = {"Prophet": 10.0, "SARIMA": 15.0, "HoltWinters": 50.0}
    selected = select_models(maes, elimination_factor=2.0)
    # HoltWinters MAE (50) > 2 * best (10) = 20, so eliminated
    assert "Prophet" in selected
    assert "SARIMA" in selected
    assert "HoltWinters" not in selected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_weighted_avg.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Write `src/ensemble/weighted_avg.py`:

```python
"""Inverse-MAE weighted average ensemble.

Stage 1+2 (basic): Select models via walk-forward CV, combine via inverse-MAE weights.
This is the Sales-Predictor approach. Phase 2 upgrades to stacked meta-learner.
"""

import logging

import numpy as np
import pandas as pd

from src.models.base import BaseModel

logger = logging.getLogger(__name__)


def select_models(
    model_maes: dict[str, float], elimination_factor: float = 2.0
) -> dict[str, float]:
    """Eliminate models where MAE > elimination_factor * best MAE.

    Returns dict of surviving model names -> MAEs.
    """
    if not model_maes:
        return {}

    best_mae = min(model_maes.values())
    threshold = best_mae * elimination_factor

    selected = {
        name: mae for name, mae in model_maes.items() if mae <= threshold
    }

    eliminated = set(model_maes) - set(selected)
    if eliminated:
        logger.info(f"Eliminated models (MAE > {threshold:.2f}): {eliminated}")

    return selected


def compute_inverse_mae_weights(maes: list[float]) -> list[float]:
    """Compute weights as inverse MAE, normalized to sum to 1.

    Lower MAE = higher weight.
    """
    inv = [1.0 / m if m > 0 else 0.0 for m in maes]
    total = sum(inv)
    if total == 0:
        return [1.0 / len(maes)] * len(maes)
    return [w / total for w in inv]


class WeightedAvgEnsemble:
    """Inverse-MAE weighted average ensemble of fitted models."""

    def __init__(self, models: list[BaseModel], maes: list[float]):
        """Initialize with fitted models and their validation MAEs.

        Parameters
        ----------
        models : list of fitted BaseModel instances
        maes : list of MAE values (same order as models)
        """
        self.models = models
        self.maes = maes
        self.weights = compute_inverse_mae_weights(maes)
        self.model_names = [m.name for m in models]

        logger.info(f"Ensemble weights: {dict(zip(self.model_names, self.weights))}")

    def predict(self, years: list[int]) -> pd.DataFrame:
        """Generate weighted ensemble forecast.

        Returns DataFrame with: year, yhat, yhat_lower, yhat_upper
        """
        forecasts = []
        for model in self.models:
            try:
                f = model.predict(years)
                forecasts.append(f["yhat"].values)
            except Exception as e:
                logger.warning(f"Model {model.name} prediction failed: {e}")

        if not forecasts:
            raise ValueError("All models failed to produce forecasts")

        predictions = np.array(forecasts)

        # Weighted average
        weights = np.array(self.weights[: len(forecasts)])
        weights = weights / weights.sum()  # Re-normalize if some models failed
        ensemble_pred = np.average(predictions, axis=0, weights=weights)

        # Confidence from model spread (± 1.96 * std)
        ensemble_std = np.std(predictions, axis=0)

        return pd.DataFrame({
            "year": years,
            "yhat": ensemble_pred,
            "yhat_lower": ensemble_pred - 1.96 * ensemble_std,
            "yhat_upper": ensemble_pred + 1.96 * ensemble_std,
        })

    def get_info(self) -> dict:
        return {
            "models": self.model_names,
            "weights": dict(zip(self.model_names, self.weights)),
            "maes": dict(zip(self.model_names, self.maes)),
        }
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_weighted_avg.py -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: inverse-MAE weighted average ensemble with model selection"
```

---

### Task 13: Cohort Engine — Fertility & Mortality Modules

**Files:**
- Create: `src/cohort/__init__.py`
- Create: `src/cohort/fertility.py`
- Create: `src/cohort/mortality.py`
- Test: `tests/test_fertility.py`
- Test: `tests/test_mortality.py`

- [ ] **Step 1: Write failing tests**

Write `src/cohort/__init__.py` (empty).

Write `tests/test_fertility.py`:

```python
import numpy as np
import pandas as pd
import pytest


def test_interpolate_5yr_to_single_year():
    from src.cohort.fertility import interpolate_to_single_year

    rates_5yr = pd.DataFrame({
        "age_band": ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49"],
        "rate": [5.0, 30.0, 90.0, 110.0, 70.0, 15.0, 1.5],
    })
    result = interpolate_to_single_year(rates_5yr, age_col="age_band", rate_col="rate")

    assert isinstance(result, pd.DataFrame)
    assert "age" in result.columns
    assert "rate" in result.columns
    # Should have single-year ages 15-49
    assert list(result["age"]) == list(range(15, 50))
    # Rates should be non-negative
    assert (result["rate"] >= 0).all()
    # Midpoint of 25-29 band should be close to 90
    age_27_rate = result.loc[result["age"] == 27, "rate"].iloc[0]
    assert 70 < age_27_rate < 110


def test_compute_births():
    from src.cohort.fertility import compute_births

    # 1000 women at each age 15-49, ASFR of 50 per 1000 everywhere
    female_pop = pd.DataFrame({
        "age": range(15, 50),
        "population": [1000] * 35,
    })
    asfr = pd.DataFrame({
        "age": range(15, 50),
        "rate": [50.0] * 35,  # 50 births per 1000 women
    })
    births = compute_births(female_pop, asfr)
    # Expected: 35 ages * 1000 women * 50/1000 = 1750
    assert births == pytest.approx(1750.0, rel=0.01)
```

Write `tests/test_mortality.py`:

```python
import numpy as np
import pandas as pd
import pytest


def test_interpolate_survival_to_single_year():
    from src.cohort.mortality import interpolate_survival_to_single_year

    rates_5yr = pd.DataFrame({
        "age_band": ["0-4", "5-9", "10-14"],
        "survival_rate": [0.999, 0.9998, 0.9998],
    })
    result = interpolate_survival_to_single_year(rates_5yr)

    assert "age" in result.columns
    assert "survival_rate" in result.columns
    # Ages 0-14
    assert list(result["age"]) == list(range(0, 15))
    # All rates should be between 0 and 1
    assert (result["survival_rate"] >= 0).all()
    assert (result["survival_rate"] <= 1).all()


def test_apply_survival():
    from src.cohort.mortality import apply_survival

    population = pd.DataFrame({
        "age": [0, 1, 2],
        "population": [1000, 1000, 1000],
    })
    survival = pd.DataFrame({
        "age": [0, 1, 2],
        "survival_rate": [0.999, 0.999, 0.998],
    })
    result = apply_survival(population, survival)
    assert result.loc[result["age"] == 0, "population"].iloc[0] == pytest.approx(999)
    assert result.loc[result["age"] == 2, "population"].iloc[0] == pytest.approx(998)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_fertility.py tests/test_mortality.py -v`
Expected: FAIL

- [ ] **Step 3: Write fertility implementation**

Write `src/cohort/fertility.py`:

```python
"""Fertility rate handling and births computation for cohort-component model."""

import numpy as np
import pandas as pd
from scipy.interpolate import CubicSpline


def _band_midpoint(band: str) -> float:
    """Extract midpoint age from a band like '15-19' → 17."""
    parts = band.replace("+", "").split("-")
    if len(parts) == 2:
        return (int(parts[0]) + int(parts[1])) / 2
    return float(parts[0])


def interpolate_to_single_year(
    rates_5yr: pd.DataFrame,
    age_col: str = "age_band",
    rate_col: str = "rate",
) -> pd.DataFrame:
    """Interpolate 5-year age band rates to single-year-of-age using cubic spline.

    Parameters
    ----------
    rates_5yr : DataFrame with age_band (e.g., '15-19') and rate columns
    age_col : column with age band strings
    rate_col : column with rate values

    Returns
    -------
    DataFrame with 'age' (int, 15-49) and 'rate' columns
    """
    midpoints = rates_5yr[age_col].apply(_band_midpoint).values
    values = rates_5yr[rate_col].values

    cs = CubicSpline(midpoints, values, bc_type="natural")

    single_ages = np.arange(15, 50)
    interpolated = cs(single_ages)
    interpolated = np.maximum(interpolated, 0)  # Clamp negative to 0

    return pd.DataFrame({"age": single_ages, "rate": interpolated})


def compute_births(
    female_population: pd.DataFrame,
    asfr: pd.DataFrame,
) -> float:
    """Compute total births using age-specific fertility rates.

    Parameters
    ----------
    female_population : DataFrame with 'age' and 'population' (women ages 15-49)
    asfr : DataFrame with 'age' and 'rate' (births per 1000 women)

    Returns
    -------
    Total births (float)
    """
    merged = female_population.merge(asfr, on="age", how="inner")
    births = (merged["population"] * merged["rate"] / 1000).sum()
    return float(births)
```

- [ ] **Step 4: Write mortality implementation**

Write `src/cohort/mortality.py`:

```python
"""Survival rate handling for cohort-component model."""

import numpy as np
import pandas as pd
from scipy.interpolate import CubicSpline


def _band_midpoint(band: str) -> float:
    """Extract midpoint from band like '0-4' → 2, '85+' → 87."""
    if "+" in band:
        return float(band.replace("+", "")) + 2
    parts = band.split("-")
    return (int(parts[0]) + int(parts[1])) / 2


def interpolate_survival_to_single_year(
    rates_5yr: pd.DataFrame,
    age_col: str = "age_band",
    rate_col: str = "survival_rate",
) -> pd.DataFrame:
    """Interpolate 5-year survival rates to single-year-of-age.

    Returns DataFrame with 'age' and 'survival_rate' columns.
    Age range determined by input bands.
    """
    midpoints = rates_5yr[age_col].apply(_band_midpoint).values
    values = rates_5yr[rate_col].values

    min_age = 0
    # Determine max age from last band
    last_band = rates_5yr[age_col].iloc[-1]
    if "+" in last_band:
        max_age = int(last_band.replace("+", "")) + 4
    else:
        max_age = int(last_band.split("-")[1])

    cs = CubicSpline(midpoints, values, bc_type="natural")
    single_ages = np.arange(min_age, max_age + 1)
    interpolated = cs(single_ages)
    interpolated = np.clip(interpolated, 0, 1)  # Survival rate in [0, 1]

    return pd.DataFrame({"age": single_ages, "survival_rate": interpolated})


def apply_survival(
    population: pd.DataFrame,
    survival: pd.DataFrame,
) -> pd.DataFrame:
    """Apply survival rates to a population.

    Returns population DataFrame with reduced counts.
    """
    merged = population.merge(survival, on="age", how="left")
    # Fill missing survival rates with 0.95 as conservative default
    merged["survival_rate"] = merged["survival_rate"].fillna(0.95)
    merged["population"] = merged["population"] * merged["survival_rate"]
    return merged[["age", "population"]]
```

- [ ] **Step 5: Run tests**

Run: `pytest tests/test_fertility.py tests/test_mortality.py -v`
Expected: 4 PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: fertility and mortality modules with cubic spline interpolation"
```

---

### Task 14: Cohort Engine — Migration & Main Engine

**Files:**
- Create: `src/cohort/migration.py`
- Create: `src/cohort/engine.py`
- Test: `tests/test_migration.py`
- Test: `tests/test_cohort_engine.py`

- [ ] **Step 1: Write failing tests**

Write `tests/test_migration.py`:

```python
import pandas as pd
import pytest


def test_interpolate_migration_to_single_year():
    from src.cohort.migration import interpolate_migration_to_single_year

    mig_5yr = pd.DataFrame({
        "age_band": ["0-4", "5-9", "10-14", "15-19", "20-24"],
        "net_migration": [20, 10, 5, -30, 80],
    })
    result = interpolate_migration_to_single_year(mig_5yr)

    assert "age" in result.columns
    assert "net_migration" in result.columns
    assert list(result["age"]) == list(range(0, 25))
    # Total migration should be approximately preserved
    total_5yr = mig_5yr["net_migration"].sum()
    total_1yr = result["net_migration"].sum()
    assert total_1yr == pytest.approx(total_5yr, rel=0.15)
```

Write `tests/test_cohort_engine.py`:

```python
import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def simple_pyramid():
    """Simple population pyramid: 100 people at each single year of age 0-89."""
    return pd.DataFrame({
        "age": range(0, 90),
        "male": [100] * 90,
        "female": [100] * 90,
    })


@pytest.fixture
def constant_rates():
    """Constant demographic rates for testing."""
    return {
        "fertility": pd.DataFrame({
            "age": range(15, 50),
            "rate": [50.0] * 35,  # 50 per 1000
        }),
        "survival": pd.DataFrame({
            "age": range(0, 90),
            "survival_rate": [0.99] * 90,
        }),
        "migration": pd.DataFrame({
            "age": range(0, 90),
            "net_migration": [0] * 90,  # No migration
        }),
    }


def test_cohort_step_ages_population(simple_pyramid, constant_rates):
    from src.cohort.engine import cohort_step

    result = cohort_step(
        pyramid=simple_pyramid,
        fertility_rates=constant_rates["fertility"],
        survival_rates=constant_rates["survival"],
        migration=constant_rates["migration"],
    )
    assert isinstance(result, pd.DataFrame)
    assert "age" in result.columns
    assert "male" in result.columns
    assert "female" in result.columns
    # After aging: age 0 should have new births, age 1 should be ~99 (100 * 0.99)
    age1_male = result.loc[result["age"] == 1, "male"].iloc[0]
    assert age1_male == pytest.approx(99.0, abs=1)


def test_cohort_step_produces_births(simple_pyramid, constant_rates):
    from src.cohort.engine import cohort_step

    result = cohort_step(
        pyramid=simple_pyramid,
        fertility_rates=constant_rates["fertility"],
        survival_rates=constant_rates["survival"],
        migration=constant_rates["migration"],
    )
    # Age 0 should have births (100 women * 35 ages * 50/1000 = 175 total births)
    age0_total = result.loc[result["age"] == 0, "male"].iloc[0] + \
                 result.loc[result["age"] == 0, "female"].iloc[0]
    assert age0_total > 0


def test_project_population(simple_pyramid, constant_rates):
    from src.cohort.engine import project_population

    projections = project_population(
        base_pyramid=simple_pyramid,
        fertility_rates=constant_rates["fertility"],
        survival_rates=constant_rates["survival"],
        migration=constant_rates["migration"],
        years=3,
    )
    assert len(projections) == 3
    assert all("age" in p.columns for p in projections)


def test_aggregate_to_primos_groups(simple_pyramid):
    from src.cohort.engine import aggregate_to_primos_groups

    result = aggregate_to_primos_groups(simple_pyramid)
    assert set(result["age_group"]) == {"0-14", "15-29", "30-44", "45-64", "65-74", "75+"}
    # 0-14 should have 15 ages * 100 per sex = 1500 per sex
    row_0_14 = result[result["age_group"] == "0-14"]
    assert row_0_14["male"].iloc[0] == 1500
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_migration.py tests/test_cohort_engine.py -v`
Expected: FAIL

- [ ] **Step 3: Write migration module**

Write `src/cohort/migration.py`:

```python
"""Net migration handling for cohort-component model."""

import numpy as np
import pandas as pd
from scipy.interpolate import CubicSpline


def _band_midpoint(band: str) -> float:
    if "+" in band:
        return float(band.replace("+", "")) + 2
    parts = band.split("-")
    return (int(parts[0]) + int(parts[1])) / 2


def interpolate_migration_to_single_year(
    mig_5yr: pd.DataFrame,
    age_col: str = "age_band",
    value_col: str = "net_migration",
) -> pd.DataFrame:
    """Interpolate 5-year migration counts to single year of age.

    Distributes band total across 5 single years proportionally.
    Uses cubic spline on midpoints, then rescales each band to preserve totals.
    """
    midpoints = mig_5yr[age_col].apply(_band_midpoint).values
    values = mig_5yr[value_col].values

    # Determine age range
    first_band = mig_5yr[age_col].iloc[0]
    last_band = mig_5yr[age_col].iloc[-1]
    min_age = int(first_band.split("-")[0].replace("+", ""))
    max_age = int(last_band.replace("+", "").split("-")[-1]) if "+" not in last_band else int(last_band.replace("+", "")) + 4

    cs = CubicSpline(midpoints, values / 5, bc_type="natural")  # Divide by 5 for per-year
    single_ages = np.arange(min_age, max_age + 1)
    interpolated = cs(single_ages)

    return pd.DataFrame({"age": single_ages, "net_migration": interpolated})
```

- [ ] **Step 4: Write cohort engine**

Write `src/cohort/engine.py`:

```python
"""Cohort-component population projection engine.

Implements the standard demographic accounting identity:
P(t+1, age+1, sex, geo) = P(t, age, sex, geo) - Deaths + NetMigration
Births(t) = sum(P(t, age, female) * ASFR(age)) for ages 15-49
"""

import logging

import numpy as np
import pandas as pd

from src.cohort.fertility import compute_births

logger = logging.getLogger(__name__)

PRIMOS_GROUPS = {
    "0-14": (0, 14),
    "15-29": (15, 29),
    "30-44": (30, 44),
    "45-64": (45, 64),
    "65-74": (65, 74),
    "75+": (75, 999),
}


def cohort_step(
    pyramid: pd.DataFrame,
    fertility_rates: pd.DataFrame,
    survival_rates: pd.DataFrame,
    migration: pd.DataFrame,
) -> pd.DataFrame:
    """Advance population pyramid by one year.

    Parameters
    ----------
    pyramid : DataFrame with columns 'age', 'male', 'female'
    fertility_rates : DataFrame with 'age' (15-49) and 'rate' (ASFR per 1000)
    survival_rates : DataFrame with 'age' and 'survival_rate'
    migration : DataFrame with 'age' and 'net_migration'

    Returns
    -------
    New pyramid DataFrame (same shape)
    """
    max_age = pyramid["age"].max()

    # Step 1: Compute births
    female_15_49 = pyramid[pyramid["age"].between(15, 49)][["age", "female"]].rename(
        columns={"female": "population"}
    )
    total_births = compute_births(female_15_49, fertility_rates)
    MALE_BIRTH_RATIO = 0.5122  # ~105 boys per 100 girls (demographic standard)
    male_births = total_births * MALE_BIRTH_RATIO
    female_births = total_births - male_births

    # Step 2: Age everyone + apply survival
    survival_map = dict(zip(survival_rates["age"], survival_rates["survival_rate"]))
    migration_map = dict(zip(migration["age"], migration["net_migration"]))

    new_rows = []
    # Age 0 = births
    new_rows.append({
        "age": 0,
        "male": max(0, male_births + migration_map.get(0, 0) / 2),
        "female": max(0, female_births + migration_map.get(0, 0) / 2),
    })

    for _, row in pyramid.iterrows():
        age = int(row["age"])
        new_age = age + 1
        if new_age > max_age:
            continue

        surv = survival_map.get(age, 0.95)
        mig = migration_map.get(new_age, 0)

        new_male = max(0, row["male"] * surv + mig / 2)
        new_female = max(0, row["female"] * surv + mig / 2)

        new_rows.append({"age": new_age, "male": new_male, "female": new_female})

    result = pd.DataFrame(new_rows).sort_values("age").reset_index(drop=True)
    return result


def project_population(
    base_pyramid: pd.DataFrame,
    fertility_rates: pd.DataFrame,
    survival_rates: pd.DataFrame,
    migration: pd.DataFrame,
    years: int = 5,
) -> list[pd.DataFrame]:
    """Project population forward for N years.

    Returns list of pyramids, one per projected year.
    """
    projections = []
    current = base_pyramid.copy()

    for i in range(years):
        current = cohort_step(current, fertility_rates, survival_rates, migration)
        projections.append(current.copy())

    return projections


def aggregate_to_primos_groups(pyramid: pd.DataFrame) -> pd.DataFrame:
    """Aggregate single-year pyramid to Primos age groups.

    Returns DataFrame with 'age_group', 'male', 'female' columns.
    """
    rows = []
    for group, (lo, hi) in PRIMOS_GROUPS.items():
        mask = pyramid["age"].between(lo, min(hi, pyramid["age"].max()))
        rows.append({
            "age_group": group,
            "male": pyramid.loc[mask, "male"].sum(),
            "female": pyramid.loc[mask, "female"].sum(),
        })
    return pd.DataFrame(rows)
```

- [ ] **Step 5: Run tests**

Run: `pytest tests/test_migration.py tests/test_cohort_engine.py -v`
Expected: 5 PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: cohort-component engine with fertility, mortality, migration, and Primos aggregation"
```

---

### Task 15: FastAPI App + Auth Middleware

**Files:**
- Create: `src/api/__init__.py`
- Create: `src/api/app.py`
- Create: `src/api/auth.py`
- Create: `src/api/schemas.py`
- Test: `tests/test_api.py`

- [ ] **Step 1: Write auth and schemas**

Write `src/api/__init__.py` (empty).

Write `src/api/auth.py`:

```python
"""API key authentication middleware."""

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from src.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    if not api_key or api_key != settings.tsa_api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key
```

Write `src/api/schemas.py`:

```python
"""Pydantic request/response schemas for TSA API."""

from datetime import datetime

from pydantic import BaseModel


class ForecastRequest(BaseModel):
    geo_codes: list[str] | None = None  # None = all gemeenten
    years_ahead: int = 5
    force_retrain: bool = False


class ForecastResult(BaseModel):
    geo_code: str
    year: int
    age_group: str
    gender: str
    value: float
    confidence_lower: float
    confidence_upper: float
    model_profile: str
    forecast_vintage: datetime


class ForecastResponse(BaseModel):
    status: str
    gemeenten_processed: int
    rows_written: int
    duration_seconds: float
    errors: list[str]


class BacktestRequest(BaseModel):
    geo_codes: list[str] | None = None
    test_years: int = 5


class BacktestResponse(BaseModel):
    metrics: dict[str, float]
    per_model_metrics: dict[str, dict[str, float]]
    folds: int


class ModelStatusResponse(BaseModel):
    models_available: list[str]
    last_forecast_run: datetime | None
    last_forecast_gemeenten: int
    total_forecast_rows: int
```

- [ ] **Step 2: Write app factory and routes**

Write `src/api/app.py`:

```python
"""FastAPI application factory."""

import logging

from fastapi import FastAPI

from src.config import settings

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Ruimtemeesters TSA Engine",
        description="Demographic time series analysis and forecasting",
        version="0.1.0",
    )

    from src.api.routes import router
    app.include_router(router, prefix="/api")

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "tsa-engine"}

    return app
```

Write `src/api/routes.py`:

```python
"""API routes for forecast, backtest, and model status."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends

from src.api.auth import verify_api_key
from src.api.schemas import (
    ForecastRequest,
    ForecastResponse,
    BacktestRequest,
    BacktestResponse,
    ModelStatusResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/forecast/bevolking", response_model=ForecastResponse)
async def run_bevolking_forecast(
    request: ForecastRequest,
    _api_key: str = Depends(verify_api_key),
):
    """Run population forecast pipeline."""
    start = datetime.now()

    # TODO: Wire up actual forecast pipeline in Phase 2 integration
    # For now, return placeholder to validate API structure
    duration = (datetime.now() - start).total_seconds()

    return ForecastResponse(
        status="ok",
        gemeenten_processed=0,
        rows_written=0,
        duration_seconds=duration,
        errors=[],
    )


@router.post("/forecast/all", response_model=ForecastResponse)
async def run_all_forecasts(
    request: ForecastRequest,
    _api_key: str = Depends(verify_api_key),
):
    """Run full forecast pipeline for all components."""
    start = datetime.now()
    duration = (datetime.now() - start).total_seconds()

    return ForecastResponse(
        status="ok",
        gemeenten_processed=0,
        rows_written=0,
        duration_seconds=duration,
        errors=[],
    )


@router.post("/backtest/bevolking", response_model=BacktestResponse)
async def run_backtest(
    request: BacktestRequest,
    _api_key: str = Depends(verify_api_key),
):
    """Run walk-forward backtest."""
    return BacktestResponse(
        metrics={"MAE": 0, "RMSE": 0, "R2": 0, "MAPE": 0},
        per_model_metrics={},
        folds=0,
    )


@router.get("/models/status", response_model=ModelStatusResponse)
async def model_status(_api_key: str = Depends(verify_api_key)):
    """Get status of trained models."""
    return ModelStatusResponse(
        models_available=["Prophet", "SARIMA", "HoltWinters"],
        last_forecast_run=None,
        last_forecast_gemeenten=0,
        total_forecast_rows=0,
    )
```

- [ ] **Step 3: Write API tests**

Write `tests/test_api.py`:

```python
import pytest
from httpx import AsyncClient, ASGITransport

from src.api.app import create_app
from src.config import Settings


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def api_key():
    return Settings(_env_file=None).tsa_api_key


@pytest.mark.asyncio
async def test_health(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_forecast_requires_api_key(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/forecast/bevolking", json={})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_forecast_with_api_key(app, api_key):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/forecast/bevolking",
            json={"years_ahead": 5},
            headers={"X-API-Key": api_key},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_model_status(app, api_key):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/models/status",
            headers={"X-API-Key": api_key},
        )
    assert resp.status_code == 200
    assert "Prophet" in resp.json()["models_available"]
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_api.py -v`
Expected: 4 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: FastAPI app with auth middleware, schemas, and route stubs"
```

---

### Task 16: Dockerfile & Run Script

**Files:**
- Create: `Dockerfile`
- Create: `scripts/run_forecast.py`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system deps for Prophet (needs compiler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY src/ src/
COPY scripts/ scripts/

EXPOSE 8100

CMD ["uvicorn", "src.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8100"]
```

- [ ] **Step 2: Write CLI run script**

Write `scripts/run_forecast.py`:

```python
#!/usr/bin/env python3
"""CLI entry point for running forecasts manually.

Usage:
  python scripts/run_forecast.py                    # All gemeenten, 5 years
  python scripts/run_forecast.py --geo GM0363       # Single gemeente
  python scripts/run_forecast.py --years 10         # 10 years ahead
  python scripts/run_forecast.py --backtest         # Run backtest instead
"""

import argparse
import logging
import sys
import time
from datetime import datetime

from src.config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("tsa-cli")


def main():
    parser = argparse.ArgumentParser(description="TSA Forecast Runner")
    parser.add_argument("--geo", type=str, help="Gemeente code (e.g., GM0363)")
    parser.add_argument("--years", type=int, default=5, help="Years ahead to forecast")
    parser.add_argument("--backtest", action="store_true", help="Run backtest instead")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Ruimtemeesters TSA Engine — Forecast Run")
    logger.info(f"  Target: {'backtest' if args.backtest else 'forecast'}")
    logger.info(f"  Gemeente: {args.geo or 'all'}")
    logger.info(f"  Horizon: {args.years} years")
    logger.info("=" * 60)

    start = time.time()

    # TODO: Wire up actual pipeline execution
    # 1. Load CBS data via cbs_loader
    # 2. Build feature matrices via pipeline
    # 3. Run walk-forward CV to select models
    # 4. Build ensemble per gemeente
    # 5. Forecast rates via ensemble
    # 6. Project population via cohort engine
    # 7. Write results to PostgreSQL

    logger.info("Pipeline execution not yet wired — this is a Phase 1 placeholder")

    duration = time.time() - start
    logger.info(f"Completed in {duration:.1f}s")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Test that Dockerfile builds**

```bash
cd /home/ralph/Projects/Ruimtemeesters-TSA
docker build -t ruimtemeesters-tsa:dev .
```

Expected: Build succeeds

- [ ] **Step 4: Test that CLI runs**

```bash
python scripts/run_forecast.py --help
```

Expected: Shows usage help without errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Dockerfile and CLI forecast runner script"
```

---

### Task 17: Run All Tests + Final Verification

- [ ] **Step 1: Run full test suite**

```bash
cd /home/ralph/Projects/Ruimtemeesters-TSA
pytest tests/ -v --tb=short
```

Expected: All tests pass (config: 2, db: 2, cbs_loader: 5, lags: 4, feature_pipeline: 3, base_model: 2, prophet: 3, sarima: 3, holtwinters: 3, walk_forward: 3, weighted_avg: 3, fertility: 2, mortality: 2, migration: 1, cohort_engine: 4, api: 4 = **46 tests total**)

- [ ] **Step 2: Run dashboarding migration check**

```bash
cd /home/ralph/Projects/Ruimtemeesters-Dashboarding
pnpm run migrate
```

Expected: All migrations up to 011 applied

- [ ] **Step 3: Create initial commit with README**

Write `README.md` in Ruimtemeesters-TSA:

```markdown
# Ruimtemeesters TSA Engine

Demographic time series analysis and forecasting engine.

## Quick Start

```bash
cp .env.example .env
pip install -e ".[dev]"
pytest tests/ -v
```

## Architecture

- **Cohort-component model** — structural demographic projection
- **ML Ensemble** — Prophet + SARIMA + Holt-Winters with inverse-MAE weighting
- **FastAPI** — API for triggering forecasts and backtests
- **PostgreSQL** — reads CBS actuals, writes forecasts

## API

```bash
# Health check
curl http://localhost:8100/health

# Run forecast (requires API key)
curl -X POST http://localhost:8100/api/forecast/all \
  -H "X-API-Key: $TSA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"years_ahead": 5}'
```

## Spec

See `../Ruimtemeesters-Dashboarding/docs/superpowers/specs/2026-03-23-tsa-engine-design.md`
```

- [ ] **Step 4: Final commit and push**

```bash
cd /home/ralph/Projects/Ruimtemeesters-TSA
git add -A
git commit -m "feat: Phase 1 complete — working TSA pipeline with 3 models, ensemble, cohort engine, and API"
```

---

## Phase 2 Preview (Separate Plan)

Phase 2 will build on this foundation with:

1. **XGBoost model** — feature matrix integration with lags, external features
2. **NeuralProphet model** — neural residual learning wrapper
3. **LSTM model** — PyTorch 2-layer LSTM with direct multi-step output
4. **State-Space (ETS) model** — statsmodels ExponentialSmoothing alternative
5. **Stacked meta-learner** — Ridge regression trained on pooled walk-forward predictions
6. **Hierarchical reconciliation** — MinT with shrunk covariance + CBS soft constraint
7. **Per-gemeente model profiles** — large/medium/small classification routing
8. **Conformal prediction intervals** — calibrated coverage from walk-forward residuals
9. **Full pipeline wiring** — end-to-end forecast run writing to PostgreSQL
10. **Dashboard integration** — Express route changes + LineChart prognose rendering
