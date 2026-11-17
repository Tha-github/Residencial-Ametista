CREATE TABLE IF NOT EXISTS admin_rate_limits (
  bucket_key TEXT PRIMARY KEY CHECK (bucket_key IN ('owner:content-write', 'owner:upload')),
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL
);
