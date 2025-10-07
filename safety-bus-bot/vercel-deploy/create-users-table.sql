-- สร้างตาราง users สำหรับ foreign key constraint
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- เพิ่มข้อมูล dummy users
INSERT INTO users (id, email, created_at, updated_at) VALUES 
('00000000-0000-0000-0000-000000000001', 'somchai001@example.com', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 'malee002@example.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- แสดงผลลัพธ์
SELECT * FROM users;