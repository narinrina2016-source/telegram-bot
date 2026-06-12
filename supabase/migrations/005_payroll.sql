CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT REFERENCES employees(employee_code),
    payroll_type TEXT DEFAULT 'monthly', -- 'monthly' | 'hourly'
    base_salary NUMERIC DEFAULT 0,
    hourly_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT REFERENCES employees(employee_code),
    month TEXT NOT NULL, -- e.g. '2026-06'
    amount NUMERIC NOT NULL,
    adj_type TEXT NOT NULL, -- 'addition' | 'deduction'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
