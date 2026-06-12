CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    admin_password TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    attendance_methods JSONB DEFAULT '{"telegram": true, "gps": true, "qr": true, "face": true, "fingerprint": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO organizations (id, slug, name, admin_password)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'default', 'Default Org', 'admin123')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS org_id TEXT DEFAULT 'default';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS org_id TEXT DEFAULT 'default';
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS org_id TEXT DEFAULT 'default';
ALTER TABLE payroll_adjustments ADD COLUMN IF NOT EXISTS org_id TEXT DEFAULT 'default';
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS org_id TEXT DEFAULT 'default';
ALTER TABLE weekly_schedules ADD COLUMN IF NOT EXISTS org_id TEXT DEFAULT 'default';
