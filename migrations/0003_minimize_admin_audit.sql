UPDATE property_content
SET updated_by = 'owner'
WHERE property_id = 'residencial-ametista';

UPDATE admin_audit
SET actor = 'owner'
WHERE property_id = 'residencial-ametista';

DELETE FROM admin_audit
WHERE julianday(created_at) < julianday('now', '-90 days');
