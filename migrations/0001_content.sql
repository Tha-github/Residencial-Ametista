CREATE TABLE IF NOT EXISTS property_content (
  property_id TEXT PRIMARY KEY CHECK (property_id = 'residencial-ametista'),
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL CHECK (property_id = 'residencial-ametista'),
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('content.update', 'media.upload')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_created_at ON admin_audit(created_at);

