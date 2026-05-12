-- ADR-006 — per-source ceiling on the strictest cron the aggregator can
-- push the schedule to. The hard guardrail against most-strict-wins
-- runaway cost.
--
-- NULL = no cap (aggregator uses the system default at runtime).
-- Admin sets concrete values via the (future) admin UI per EPIC #108
-- child #105. Default ships NULL — opt-in capping rather than blanket.

ALTER TABLE data_sources
  ADD COLUMN IF NOT EXISTS max_frequency_cron VARCHAR(255);
