-- Run this in your Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Telegram Users & Broadcasts (001)
CREATE TABLE IF NOT EXISTS telegram_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    sent_by TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Settings (002)
CREATE TABLE IF NOT EXISTS office_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations (008) - created first because employees depends on it ideally, though not strictly constrained above
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    admin_password TEXT NOT NULL,
    settings JSONB DEFAULT '{}', -- { geofence_lat, geofence_lng, radius, qr_secret, payroll_currency, ... }
    attendance_methods JSONB DEFAULT '{"telegram": true, "gps": true, "qr": true, "face": true, "fingerprint": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO organizations (id, slug, name, admin_password)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'default', 'Default Org', 'admin123')
ON CONFLICT (slug) DO NOTHING;

-- Employees (004, 008, 009)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT DEFAULT 'default',
    employee_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    telegram_id TEXT,
    active BOOLEAN DEFAULT true,
    face_descriptor TEXT, -- (003)
    payroll_type TEXT DEFAULT 'monthly',
    base_salary NUMERIC DEFAULT 0,
    hourly_rate NUMERIC DEFAULT 0,
    nfc_serial TEXT, -- (009)
    photo_url TEXT, -- (009)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Face and QR (003) -> face is in employees or separate, we did face_enrollments as separate table in 003 but in previous schema.sql it was in employees.
-- Wait, let's keep face_enrollments separate as per 003, but in old schema: "face_descriptor TEXT, -- Store JSON string of Float32Array" was inside employees! Let's just keep both or just what old schema had. The user didn't complain about old schema. Let's make sure face_enrollments table is here as we added it in 003.

CREATE TABLE IF NOT EXISTS face_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT NOT NULL,
    face_descriptor TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT NOT NULL,
    qr_token TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance (004, 006, 008)
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT DEFAULT 'default',
    employee_code TEXT REFERENCES employees(employee_code),
    method TEXT,
    check_type TEXT, -- 'in' or 'out'
    substitute_for TEXT REFERENCES employees(employee_code),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll (005, 008)
CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT DEFAULT 'default',
    employee_code TEXT REFERENCES employees(employee_code),
    payroll_type TEXT DEFAULT 'monthly', -- 'monthly' | 'hourly'
    base_salary NUMERIC DEFAULT 0,
    hourly_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT DEFAULT 'default',
    employee_code TEXT REFERENCES employees(employee_code),
    month TEXT NOT NULL, -- e.g. '2026-06'
    amount NUMERIC NOT NULL,
    adj_type TEXT NOT NULL, -- 'addition' | 'deduction'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timesheets (006, 008)
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT DEFAULT 'default',
    employee_code TEXT REFERENCES employees(employee_code),
    work_date DATE NOT NULL,
    hours_worked NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Schedule (007, 008)
CREATE TABLE IF NOT EXISTS weekly_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT DEFAULT 'default',
    employee_code TEXT REFERENCES employees(employee_code),
    day_of_week INTEGER, -- 1=Monday...7=Sunday or 0=Sunday
    start_time TEXT,
    end_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
