ALTER TABLE attendance ADD COLUMN IF NOT EXISTS substitute_for TEXT REFERENCES employees(employee_code);

CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT REFERENCES employees(employee_code),
    work_date DATE NOT NULL,
    hours_worked NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
