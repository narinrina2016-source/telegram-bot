CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    telegram_id TEXT,
    active BOOLEAN DEFAULT true,
    face_descriptor TEXT, 
    payroll_type TEXT DEFAULT 'monthly',
    base_salary NUMERIC DEFAULT 0,
    hourly_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT REFERENCES employees(employee_code),
    method TEXT,
    check_type TEXT, -- 'in' or 'out'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
