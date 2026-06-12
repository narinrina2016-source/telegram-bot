CREATE TABLE IF NOT EXISTS weekly_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT REFERENCES employees(employee_code),
    day_of_week INTEGER, -- 1=Monday...7=Sunday or 0=Sunday
    start_time TEXT,
    end_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
