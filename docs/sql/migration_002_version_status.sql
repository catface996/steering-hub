-- ============================================================
-- Migration 002: Version Status & Optimistic Lock
-- Feature: 002-version-history-search
-- ============================================================

-- 1. Add optimistic lock to steering table
ALTER TABLE steering ADD COLUMN IF NOT EXISTS lock_version INT NOT NULL DEFAULT 0;

-- 2. Add status and updated_at columns to steering_version table
ALTER TABLE steering_version ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';
ALTER TABLE steering_version ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Update CHECK constraints
ALTER TABLE steering DROP CONSTRAINT IF EXISTS steering_status_check;
ALTER TABLE steering ADD CONSTRAINT steering_status_check
    CHECK (status IN ('draft','pending_review','approved','rejected','active','superseded','deprecated'));

ALTER TABLE steering_review DROP CONSTRAINT IF EXISTS steering_review_action_check;
ALTER TABLE steering_review ADD CONSTRAINT steering_review_action_check
    CHECK (action IN ('submit','approve','reject','activate','deprecate','rollback','withdraw'));

-- 4. Backfill version history for existing records (insert missing v1 rows)
INSERT INTO steering_version (steering_id, version, title, content, keywords, tags, status, change_log, created_at, updated_at)
SELECT id, 1, title, content, keywords, tags, status, '初始版本', created_at, updated_at
FROM steering
WHERE deleted = FALSE
ON CONFLICT (steering_id, version) DO NOTHING;

-- 5. Create composite index for version status queries
CREATE INDEX IF NOT EXISTS idx_sv_steering_status ON steering_version(steering_id, status);
