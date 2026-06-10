-- Multi-tenant Schema for SecureAttend

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Institutions (Tenants)
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('school', 'company', 'other')),
    address TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Employees / Users
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    khmer_name NVARCHAR(200), -- For local language support
    role VARCHAR(50) DEFAULT 'employee',
    nfc_tag_id VARCHAR(100) UNIQUE,
    face_encoding JSONB, -- Stored facial recognition points
    telegram_chat_id VARCHAR(100),
    base_salary DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Attendance Logs
CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    check_type VARCHAR(10) CHECK (check_type IN ('in', 'out')),
    method VARCHAR(20) CHECK (method IN ('gps', 'face', 'qr', 'nfc', 'manual')),
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(10, 8),
    device_info TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payroll Records
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- e.g., '2026-06-01'
    total_hours_worked DECIMAL(5, 2),
    gross_salary DECIMAL(10, 2),
    net_salary DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Row Level Security (RLS) policies would go here to isolate tenants.
-- Example: CREATE POLICY tenant_isolation_policy ON employees FOR ALL USING (institution_id = current_setting('app.current_tenant')::uuid);
