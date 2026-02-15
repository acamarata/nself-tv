-- Push Notifications Migration
-- Adds support for Web Push Notifications

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_releases BOOLEAN NOT NULL DEFAULT TRUE,
  new_episodes BOOLEAN NOT NULL DEFAULT TRUE,
  watch_party_invites BOOLEAN NOT NULL DEFAULT TRUE,
  download_complete BOOLEAN NOT NULL DEFAULT TRUE,
  recommendations BOOLEAN NOT NULL DEFAULT TRUE,
  content_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Notification queue table (for sending push notifications)
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'new_release', 'watch_party', 'download', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  image TEXT,
  data JSONB,
  actions JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  send_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notification queue
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_send_after ON notification_queue(send_after);

-- Notification history (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  clicked BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Indexes for notification history
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);

-- Updated_at trigger for push_subscriptions
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to send push notification (queues notification)
CREATE OR REPLACE FUNCTION queue_push_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title TEXT,
  p_body TEXT,
  p_icon TEXT DEFAULT NULL,
  p_image TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL,
  p_actions JSONB DEFAULT NULL,
  p_send_after TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_enabled BOOLEAN;
BEGIN
  -- Check if user has this notification type enabled
  SELECT CASE
    WHEN p_type = 'new_release' THEN new_releases
    WHEN p_type = 'new_episode' THEN new_episodes
    WHEN p_type = 'watch_party' THEN watch_party_invites
    WHEN p_type = 'download' THEN download_complete
    WHEN p_type = 'recommendation' THEN recommendations
    WHEN p_type = 'content_available' THEN content_available
    ELSE TRUE
  END INTO v_enabled
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences row exists, create one with defaults
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id);
    v_enabled := TRUE;
  END IF;

  -- Only queue if enabled
  IF v_enabled THEN
    INSERT INTO notification_queue (
      user_id, type, title, body, icon, image, data, actions, send_after
    ) VALUES (
      p_user_id, p_type, p_title, p_body, p_icon, p_image, p_data, p_actions, p_send_after
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending notifications (for worker to process)
CREATE OR REPLACE FUNCTION get_pending_notifications(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type VARCHAR(50),
  title TEXT,
  body TEXT,
  icon TEXT,
  image TEXT,
  data JSONB,
  actions JSONB,
  subscriptions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nq.id,
    nq.user_id,
    nq.type,
    nq.title,
    nq.body,
    nq.icon,
    nq.image,
    nq.data,
    nq.actions,
    jsonb_agg(
      jsonb_build_object(
        'endpoint', ps.endpoint,
        'keys', jsonb_build_object(
          'p256dh', ps.p256dh_key,
          'auth', ps.auth_key
        )
      )
    ) AS subscriptions
  FROM notification_queue nq
  JOIN push_subscriptions ps ON ps.user_id = nq.user_id
  WHERE nq.status = 'pending'
    AND nq.send_after <= NOW()
    AND nq.attempts < nq.max_attempts
  GROUP BY nq.id, nq.user_id, nq.type, nq.title, nq.body, nq.icon, nq.image, nq.data, nq.actions
  ORDER BY nq.send_after ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_queue
  SET status = 'sent', sent_at = NOW()
  WHERE id = p_notification_id;

  -- Copy to history
  INSERT INTO notification_history (user_id, type, title, body, data, sent_at)
  SELECT user_id, type, title, body, data, NOW()
  FROM notification_queue
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as failed
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_notification_id UUID,
  p_error TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_queue
  SET
    status = CASE
      WHEN attempts + 1 >= max_attempts THEN 'failed'
      ELSE 'pending'
    END,
    error = p_error,
    attempts = attempts + 1,
    send_after = NOW() + INTERVAL '5 minutes' * POWER(2, attempts) -- Exponential backoff
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old notifications (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  -- Delete sent/failed notifications older than 30 days
  DELETE FROM notification_queue
  WHERE status IN ('sent', 'failed')
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Delete notification history older than 90 days
  DELETE FROM notification_history
  WHERE sent_at < NOW() - INTERVAL '90 days';

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO hasura;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO hasura;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_queue TO hasura;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_history TO hasura;

GRANT EXECUTE ON FUNCTION queue_push_notification TO hasura;
GRANT EXECUTE ON FUNCTION get_pending_notifications TO hasura;
GRANT EXECUTE ON FUNCTION mark_notification_sent TO hasura;
GRANT EXECUTE ON FUNCTION mark_notification_failed TO hasura;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO hasura;

-- Example usage:
-- SELECT queue_push_notification(
--   'user-uuid',
--   'new_release',
--   'New Movie Available',
--   'The Matrix Resurrections is now available in your library',
--   '/icons/icon-192x192.png',
--   '/posters/matrix-4.jpg',
--   '{"contentId": "movie-123", "url": "/content/movie-123"}',
--   '[{"action": "watch", "title": "Watch Now"}, {"action": "dismiss", "title": "Later"}]'
-- );
