# Time Series Analysis Engine — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Goal:** Build a demographic forecasting engine that can compete with Primos's proprietary model, using cohort-component modeling as structural backbone and ML ensemble for component forecasting.

---

## 1. Cohort-Component Model (Structural Backbone)

The cohort-component method is the standard for demographic projection (used by CBS, UN, Eurostat). It models population change structurally:

```
P(t+1, age+1, sex, geo) = P(t, age, sex, geo)
                          - Deaths(t, age, sex, geo)
                          + NetMigration(t, age, sex, geo)

Births(t, geo) = sum over age 15-49: P(t, age, female, geo) * ASFR(t, age, geo)
```

### Components

| Component | Source | Method |
|-----------|--------|--------|
| Age-specific fertility rates (ASFR) | CBS 37422ned | ML ensemble forecast |
| Age-specific survival rates | CBS 37422ned | ML ensemble forecast |
| Net migration by age/sex | CBS 60048ned | ML ensemble forecast (hardest component) |

### How It Works

1. Start with known population pyramid (2024 CBS actuals)
2. For each forecast year t+1:
   - Age everyone by 1 year (cohort aging)
   - Apply survival rates (remove deaths)
   - Apply fertility rates (add births to age-0 cohort)
   - Apply net migration (add/subtract by age group)
3. Aggregate to Primos age groups (0-14, 15-29, 30-44, 45-64, 65-74, 75+)

### Scope

- **Geographic:** All gemeenten, provinces (COROP optional later), national
- **Time horizon:** Short (1-5yr), medium (5-15yr), long (15-40yr)
- **Variables:** Population + households + housing demand + migration/fertility/mortality

Households and housing demand are derived from population forecasts using headship rates and persons-per-household ratios (also forecast via ensemble). Headship rates require their own sub-spec — flagged as future work after the population pipeline is proven.

### Gemeente Boundary Changes (Herindelingen)

Dutch gemeenten merge frequently. A merger creates an artificial population jump that models would misinterpret as growth. Strategy:
- Use CBS "adjusted figures" (aangepaste cijfers) that retroactively apply current (2024) boundaries where available
- For years where adjusted figures are unavailable, detect mergers via >15% YoY population jumps and limit training history to post-merger for affected gemeenten
- The `geo_areas` table uses current (2024) gemeente codes; historical data is mapped to current codes during CBS sync

---

## 2. ML Ensemble for Component Forecasting

Each demographic component (fertility, mortality, migration, headship rates) is forecast using a three-stage ML ensemble.

### 2.1 Ensemble-to-Cohort Interface

The ML ensemble forecasts **rates**, not absolute counts. The cohort engine consumes these rates and applies them to known population counts.

| Component | Target variable | Granularity | Pipelines |
|-----------|----------------|-------------|-----------|
| Fertility | ASFR (births per 1,000 women) | 5-year age bands (15-19, 20-24, ..., 45-49), per gemeente | ~340 gemeenten x 1 pipeline (multi-output: 7 age bands) |
| Mortality | Age-specific survival rate (1 - death rate) | 5-year age bands (0-4, 5-9, ..., 85+), per sex | National level, applied uniformly (too sparse per gemeente). **Known simplification:** ignores regional mortality variation (urban/rural, socioeconomic). Future improvement: province-level mortality differentiation once data depth allows. |
| Migration | Net migration count by age band | 5-year age bands, per gemeente | ~340 gemeenten x 1 pipeline (multi-output) |

**Rate derivation from CBS:** CBS table 37422ned provides absolute birth and death counts. Rates are computed as:
- `ASFR(age, geo, year) = births(age, geo, year) / women(age, geo, year)` — using population from 03759ned
- `survival(age, sex, year) = 1 - deaths(age, sex, year) / population(age, sex, year)`

**Granularity bridging:** The ensemble forecasts at 5-year age band resolution. The cohort engine needs single-year-of-age. Rates are interpolated from 5-year bands to single years using cubic spline (standard demographic practice). Primos age group aggregation (0-14, 15-29, etc.) happens *after* the cohort engine runs, not during.

**Total pipelines:** ~340 gemeenten for fertility and migration (multi-output per gemeente), plus 1 national pipeline for mortality. Roughly 680 independent ensemble runs per forecast vintage.

### Base Models (7 candidates)

| Model | Strength | Best for |
|-------|----------|----------|
| **Prophet** (Facebook/Meta) | Trend changepoints, external regressors, robust to missing data | Gemeenten with structural breaks (new housing developments) |
| **SARIMA** | Stable autoregressive patterns, interpretable | Provinces/national with smooth trends |
| **Holt-Winters** | Triple exponential smoothing | Short-term (1-5yr) with clear patterns |
| **XGBoost** | Feature-rich, non-linear interactions | When external features matter (permits, migration policy) |
| **NeuralProphet** | Prophet API + neural residual learning | Medium-term with non-linear trend |
| **LSTM** | Long-range non-linear temporal dependencies | National long-horizon (20+ year) |
| **State-Space (ETS)** | Optimal univariate exponential smoothing | Baseline, small gemeenten with limited data |

### Prophet (Detail)

Facebook's Prophet is the anchor model. It decomposes time series into trend (piecewise linear with automatic changepoint detection), seasonality, and external regressors. We feed in housing permits, net migration rate, and policy changes as regressors. The stacked meta-learner upweights Prophet specifically around detected changepoints.

### XGBoost (Detail)

XGBoost is the feature-rich model. Unlike Prophet/SARIMA which primarily look at the time series itself, XGBoost ingests a full feature matrix: lagged values, rolling statistics, external features (housing permits, migration flows, fertility rates), and geographic features (urbanization level, province, COROP). Inspired by Sales-Predictor's `enrichment.py` pattern. XGBoost captures non-linear interactions — e.g., "when housing permits spike AND migration is positive, population grows faster than either signal alone."

### Three-Stage Ensemble

**Stage 1 — Walk-Forward Validation & Model Selection**

Expanding-window walk-forward CV with concrete parameters:
- **Minimum training window:** 10 years (first fold trains on 2000-2009, predicts 2010-2014)
- **Step size:** 1 year (slide forward by 1 year each fold)
- **Forecast horizons evaluated:** 1, 3, and 5 years ahead
- **Expected folds:** With data 2000-2024, minimum 10yr training, 5yr horizon → ~10 folds (2010-2019 as first prediction years). Sufficient for model selection; marginal for meta-learner (see Stage 2).

Calculate per-model MAE, RMSE, MAPE across all folds. Eliminate models where MAE > 2x best model — no point weighting poor performers.

**Stage 2 — Stacked Meta-Learner**

Goes beyond the Sales-Predictor's inverse-MAE weighted averaging. Surviving base models produce forecasts for validation windows. These forecasts become features for a lightweight meta-learner (Ridge regression or XGBoost). The meta-learner learns *when* each model is right — e.g., "Prophet is better after trend breaks, SARIMA is better for stable municipalities." Captures model complementarity that simple averaging misses.

**Meta-learner data scarcity:** With ~10 walk-forward folds and up to 7 base model features, per-gemeente meta-learner training is borderline. Mitigation:
- **Pool training across similar gemeenten** — group by province + population size bucket, train one meta-learner per group (~20 groups of ~17 gemeenten each, giving ~170 training samples per meta-learner)
- **Fallback:** If a group has fewer than 50 pooled samples, fall back to inverse-MAE weighted averaging (Sales-Predictor style)
- Ridge regression preferred over XGBoost for the meta-learner due to built-in regularization handling small sample sizes

**Stage 3 — Hierarchical Reconciliation**

After meta-learner produces gemeente-level forecasts:
- Bottom-up aggregation: ~340 gemeenten -> ~12 provinces -> national
- MinT (Minimum Trace) reconciliation with **shrunk covariance estimator** (standard for demographic data with limited time series length)
- **Soft constraint mechanism:** Run MinT reconciliation first (bottom-up + top-down consistency). Then apply a shrinkage step toward CBS national prognose: `national_final = alpha * MinT_national + (1-alpha) * CBS_national`, where alpha starts at 0.7 (trust our model more) and is calibrated via backtest. Province and gemeente totals are then proportionally adjusted to match the nudged national total.
- COROP level excluded from initial reconciliation hierarchy (optional future addition)

### Confidence Intervals

- **Conformal prediction intervals** from walk-forward residuals (distribution-free, calibrated coverage)
- Ensemble disagreement (model spread) as additional uncertainty signal
- Wider intervals for small gemeenten with less data
- Target: 93-97% coverage at 95% nominal level

### Per-Gemeente Model Profiles

Not every gemeente gets the same ensemble:
- **Large cities** (>100k): All 7 models, full stacking
- **Medium gemeenten** (10k-100k): Prophet + SARIMA + XGBoost + Holt-Winters
- **Small gemeenten** (<10k): SARIMA + Holt-Winters + State-Space
- Classification based on population size and historical volatility

### Metrics & Evaluation

- **MAE, RMSE, R2, MAPE** — per model and ensemble
- **Coverage** — % of actuals within 95% prediction interval
- **Skill score** — improvement over naive baseline (last-value-carried-forward)
- Walk-forward backtest on 2015-2024 data before production use

---

## 3. Data Pipeline & Feature Engineering

### Input Data Sources

| Source | CBS Table | What it provides |
|--------|-----------|-----------------|
| Population by age/sex/region | 03759ned | Historical population (2000-2024) |
| Households by type/region | 71486ned | Household composition history |
| Housing stock | 82550NED | Dwellings by type/ownership |
| Housing mutations | 81955NED | Nieuwbouw, sloop, onttrekking |
| National prognose | 84646NED | CBS forecast 2025-2060 (soft constraint) |
| Migration flows | 60048ned | Inter-municipal + international migration |
| Fertility/mortality | 37422ned | Birth/death rates by age/region |

### Feature Engineering Pipeline

```
CBS raw data
  -> Clean & validate (Zod schemas on Express side, Pydantic on TSA side)
  -> Align to Primos age groups (0-14, 15-29, 30-44, 45-64, 65-74, 75+)
  -> Construct feature matrix per gemeente:

    Time-series features:
    - Lagged values: y(t-1), y(t-2), y(t-5)
    - Rolling stats: 3yr mean, 5yr mean, 3yr std
    - YoY growth rate, 5yr trend slope

    Demographic features:
    - Age distribution ratios (dependency ratio, aging index)
    - Fertility rate (births / women 15-49)
    - Mortality rate by age group
    - Net migration rate (internal + international)

    Housing features:
    - Housing permits issued (leading indicator, ~2yr lag)
    - Nieuwbouw/sloop ratio
    - Woningtekort as % of stock

    Geographic features:
    - Urbanization level (stedelijkheidsklasse)
    - Province, COROP membership
    - Population size bucket (for model profile selection)

  -> Store in PostgreSQL (source = 'feature_matrix')
  -> Feed to base models
```

### Forecast Output

Forecasts are written to existing `data_bevolking`, `data_huishoudens`, `data_woningen` tables with `source = 'ruimtemeesters_prognose'`. The dashboard's LineChart solid/dashed split works automatically via the existing `source` column.

Each forecast row includes:
- `confidence_lower`, `confidence_upper` (95% conformal interval)
- `model_profile` (which ensemble profile was used)
- `forecast_vintage` (when the forecast was generated)

### Database Migration (011)

Add forecast metadata columns to existing data tables:

```sql
ALTER TABLE data_bevolking
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

-- Same for data_huishoudens, data_woningen
```

All new columns are nullable — CBS actuals rows have NULL for these fields. Same ALTER for `data_huishoudens`, `data_woningen`, and `data_woningtekort`. Indexes on `(source, forecast_vintage)` for querying latest forecast vintage.

**Forecast vintage data lifecycle:** New forecast runs DELETE existing rows where `source = 'ruimtemeesters_prognose'` for the affected gemeente before inserting new rows. This avoids unique constraint violations and keeps only the latest vintage. The `forecast_vintage` column serves as an audit trail (when was this row written), not as a multi-version store.

---

## 4. Architecture & API

### Separate Python Service (FastAPI)

```
Ruimtemeesters-TSA/           (new repo)
├── src/
│   ├── api/                  FastAPI endpoints
│   │   ├── routes.py         /forecast, /backtest, /models
│   │   └── schemas.py        Pydantic request/response models
│   ├── models/
│   │   ├── base.py           Abstract base model interface
│   │   ├── prophet_model.py  Prophet wrapper
│   │   ├── sarima_model.py   SARIMA (statsmodels)
│   │   ├── holtwinters.py    Holt-Winters (statsmodels)
│   │   ├── xgboost_model.py  XGBoost with feature matrix
│   │   ├── neuralprophet.py  NeuralProphet wrapper
│   │   ├── lstm_model.py     PyTorch LSTM
│   │   └── statespace.py     State-space / ETS
│   ├── ensemble/
│   │   ├── walk_forward.py   Walk-forward CV + model selection
│   │   ├── stacking.py       Meta-learner (Ridge/XGBoost)
│   │   ├── reconciliation.py MinT hierarchical reconciliation
│   │   └── profiles.py       Per-gemeente model profile selection
│   ├── features/
│   │   ├── pipeline.py       CBS -> feature matrix construction
│   │   ├── lags.py           Lag & rolling features
│   │   └── external.py       Migration, fertility, housing features
│   ├── cohort/
│   │   ├── engine.py         Cohort-component model
│   │   ├── fertility.py      Age-specific fertility rates
│   │   ├── mortality.py      Age-specific survival rates
│   │   └── migration.py      Net migration by age group
│   └── data/
│       ├── db.py             PostgreSQL connection (same DB)
│       └── cbs_loader.py     Read CBS data from existing tables
├── tests/
├── pyproject.toml
└── Dockerfile
```

### Communication Pattern

```
Dashboard (React)
  -> Express API (/api/data?source=ruimtemeesters_prognose)
    -> PostgreSQL (reads pre-computed forecast rows)

Admin trigger or cron
  -> TSA Service (FastAPI)
    -> Reads CBS actuals from PostgreSQL
    -> Runs cohort-component + ensemble pipeline
    -> Writes forecasts to PostgreSQL (source = 'ruimtemeesters_prognose')
```

Forecasts are pre-computed and stored. The dashboard reads them like any other data source. No real-time model inference at request time.

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/forecast/{component}` | POST | Run forecast for one component |
| `/forecast/all` | POST | Full pipeline, all components |
| `/backtest/{component}` | POST | Walk-forward backtest with accuracy metrics |
| `/models/status` | GET | Trained models, last run, accuracy |
| `/models/{gemeente_code}/profile` | GET | Ensemble profile for a gemeente |

### Deployment

- Docker container alongside Express + PostgreSQL
- Shares same PostgreSQL database
- GPU optional (LSTM benefits, CPU works for <400 gemeenten)
- Forecast run: manual trigger or weekly cron
- **Runtime estimate:** Inference-only (pre-trained models) ~10-30 min for all gemeenten. Full retraining (walk-forward + meta-learner) ~2-4 hours (7 models x 340 gemeenten x 10 folds = ~24k model fits). Retraining runs quarterly or when new CBS annual data arrives.

### Security

- FastAPI endpoints protected by API key shared between Express backend and TSA service (env var `TSA_API_KEY`)
- Only admin users can trigger forecast runs via the Express API (existing RBAC role check)
- TSA service not exposed publicly — only accessible from Express backend on internal network

### Failure Modes

| Failure | Handling |
|---------|----------|
| Base model fails to converge (e.g., SARIMA) | Skip failed model, use remaining models. Log warning. |
| CBS data missing for years/age groups | Fill short gaps (1-2 years) with linear interpolation. Flag longer gaps, exclude gemeente from that component. |
| Forecast produces negative population | Clamp to zero. If >5% of forecasts are clamped, flag gemeente for manual review. |
| Forecast run interrupted mid-write | Transactional writes per gemeente — all-or-nothing. Partial runs leave previous vintage intact. |
| All models eliminated in Stage 1 | Fall back to naive baseline (last-value-carried-forward) with wide confidence intervals. |

### LSTM Architecture

- 2-layer LSTM, hidden dimension 64
- Sequence length: 10 years (matching minimum training window)
- Direct multi-step output (predict all 5 horizons simultaneously, not recursive)
- Loss: MSE with L2 regularization
- Training: Adam optimizer, early stopping on validation fold, max 200 epochs
- Input: univariate time series + 3 external features (lagged population growth, migration rate, urbanization level)

---

## 5. Decisions & Trade-offs

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Separate Python service | Yes | Python ML ecosystem (Prophet, XGBoost, PyTorch) is far richer than JS |
| Cohort-component as backbone | Yes | Industry standard, interpretable, encodes demographic structure |
| Stacked meta-learner over weighted avg | Yes | Learns model complementarity, validated by Sales-Predictor patterns |
| Pre-computed forecasts | Yes | Dashboard stays fast, forecasts updated weekly/on-demand |
| CBS national prognose as soft constraint | Yes | Leverage official forecast without being locked to it |
| Per-gemeente model profiles | Yes | Small gemeenten don't have enough data for 7-model ensemble |
| Conformal prediction intervals | Yes | Distribution-free, calibrated, better than naive model spread |
