CREATE TABLE IF NOT EXISTS face_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT NOT NULL,
    face_descriptor TEXT NOT NULL, -- JSON string of Float32Array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT NOT NULL,
    qr_token TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
