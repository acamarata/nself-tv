-- Migration: 010_content_approval_requests
-- Description: Content approval queue for parental controls
-- Author: AI Execution Agent
-- Date: 2026-02-15

-- Content Approval Requests Table
CREATE TABLE IF NOT EXISTS content_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  -- Request metadata
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_message TEXT,

  -- Approval status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_message TEXT,

  -- Auto-approval tracking
  auto_approved BOOLEAN DEFAULT FALSE,
  auto_approval_rule VARCHAR(100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_approval_family ON content_approval_requests(family_id);
CREATE INDEX idx_content_approval_profile ON content_approval_requests(profile_id);
CREATE INDEX idx_content_approval_media ON content_approval_requests(media_item_id);
CREATE INDEX idx_content_approval_status ON content_approval_requests(status);
CREATE INDEX idx_content_approval_requested ON content_approval_requests(requested_at DESC);
CREATE INDEX idx_content_approval_pending ON content_approval_requests(status, requested_at DESC)
  WHERE status = 'pending';

-- Unique constraint: one pending request per profile+media combination
CREATE UNIQUE INDEX idx_content_approval_unique_pending
  ON content_approval_requests(profile_id, media_item_id)
  WHERE status = 'pending';

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_content_approval_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_approval_requests_updated_at
  BEFORE UPDATE ON content_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_content_approval_requests_updated_at();

-- Auto-set reviewed_at on status change
CREATE OR REPLACE FUNCTION set_content_approval_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'denied') THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_approval_set_reviewed_at
  BEFORE UPDATE ON content_approval_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status IN ('approved', 'denied'))
  EXECUTE FUNCTION set_content_approval_reviewed_at();

-- Auto-Approval Rules Table
CREATE TABLE IF NOT EXISTS content_approval_auto_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- Rule definition
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('rating_threshold', 'genre_whitelist', 'time_of_day', 'content_type')),

  -- Rule parameters (JSON)
  rule_config JSONB NOT NULL,

  -- Enabled/disabled
  enabled BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auto_rules_family ON content_approval_auto_rules(family_id);
CREATE INDEX idx_auto_rules_enabled ON content_approval_auto_rules(family_id, enabled, priority DESC)
  WHERE enabled = TRUE;

-- Updated At Trigger
CREATE TRIGGER trg_auto_rules_updated_at
  BEFORE UPDATE ON content_approval_auto_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_content_approval_requests_updated_at();

-- Views

-- Pending Approvals with Details
CREATE OR REPLACE VIEW pending_approval_requests AS
SELECT
  car.id,
  car.family_id,
  car.profile_id,
  car.media_item_id,
  car.requested_at,
  car.request_message,
  car.status,
  -- Requester profile
  up.display_name AS requester_name,
  up.avatar_url AS requester_avatar,
  up.content_rating_limit AS requester_rating_limit,
  -- Media item
  mi.title AS media_title,
  mi.type AS media_type,
  mi.content_rating AS media_rating,
  mi.poster_url AS media_poster,
  mi.overview AS media_overview
FROM content_approval_requests car
JOIN user_profiles up ON car.profile_id = up.id
JOIN media_items mi ON car.media_item_id = mi.id
WHERE car.status = 'pending'
ORDER BY car.requested_at ASC;

-- Approval History
CREATE OR REPLACE VIEW approval_history AS
SELECT
  car.*,
  up.display_name AS requester_name,
  reviewer.display_name AS reviewer_name,
  mi.title AS media_title,
  mi.type AS media_type,
  mi.content_rating AS media_rating
FROM content_approval_requests car
JOIN user_profiles up ON car.profile_id = up.id
LEFT JOIN user_profiles reviewer ON car.reviewed_by = reviewer.id
JOIN media_items mi ON car.media_item_id = mi.id
WHERE car.status IN ('approved', 'denied')
ORDER BY car.reviewed_at DESC;

-- Comments
COMMENT ON TABLE content_approval_requests IS 'Content approval requests for parental controls';
COMMENT ON COLUMN content_approval_requests.status IS 'pending, approved, or denied';
COMMENT ON COLUMN content_approval_requests.auto_approved IS 'TRUE if approved by auto-approval rule';
COMMENT ON TABLE content_approval_auto_rules IS 'Auto-approval rules for content requests';
COMMENT ON COLUMN content_approval_auto_rules.rule_config IS 'JSON config for rule (e.g., {"max_rating": "PG-13"})';

-- Rollback Script
-- DROP TRIGGER IF EXISTS trg_content_approval_requests_updated_at ON content_approval_requests;
-- DROP TRIGGER IF EXISTS trg_content_approval_set_reviewed_at ON content_approval_requests;
-- DROP TRIGGER IF EXISTS trg_auto_rules_updated_at ON content_approval_auto_rules;
-- DROP FUNCTION IF EXISTS update_content_approval_requests_updated_at();
-- DROP FUNCTION IF EXISTS set_content_approval_reviewed_at();
-- DROP VIEW IF EXISTS pending_approval_requests;
-- DROP VIEW IF EXISTS approval_history;
-- DROP TABLE IF EXISTS content_approval_auto_rules;
-- DROP TABLE IF EXISTS content_approval_requests;
