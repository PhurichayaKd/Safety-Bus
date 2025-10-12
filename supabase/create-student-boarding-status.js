require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_ANON_KEY ใน environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createStudentBoardingStatusTable() {
  console.log('🔄 กำลังสร้างตาราง student_boarding_status...');
  
  try {
    // ตรวจสอบว่าตารางมีอยู่แล้วหรือไม่
    console.log('📝 ตรวจสอบตาราง student_boarding_status...');
    const { data: existingTable, error: checkError } = await supabase
      .from('student_boarding_status')
      .select('*')
      .limit(1);

    if (!checkError) {
      console.log('✅ ตาราง student_boarding_status มีอยู่แล้ว');
      return;
    }

    console.log('📝 ตาราง student_boarding_status ไม่มีอยู่ กำลังสร้าง...');

    // ใช้ SQL ผ่าน REST API โดยตรง
    const createTableSQL = `
      -- สร้าง trigger function สำหรับ updated_at
      CREATE OR REPLACE FUNCTION update_student_boarding_status_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- สร้างตาราง student_boarding_status
      CREATE TABLE IF NOT EXISTS public.student_boarding_status (
        status_id bigserial NOT NULL,
        student_id text NOT NULL,
        driver_id integer NOT NULL,
        trip_date date NOT NULL,
        trip_phase character varying(10) NOT NULL DEFAULT 'go'::character varying,
        boarding_status character varying(20) NOT NULL,
        pickup_time timestamp with time zone NULL,
        dropoff_time timestamp with time zone NULL,
        last_scan_id bigint NULL,
        created_at timestamp with time zone NULL DEFAULT now(),
        updated_at timestamp with time zone NULL DEFAULT now(),
        route_id integer NULL,
        CONSTRAINT student_boarding_status_pkey PRIMARY KEY (status_id),
        CONSTRAINT student_boarding_unique_daily_phase UNIQUE (student_id, driver_id, trip_date, trip_phase),
        CONSTRAINT student_boarding_status_boarding_status_check CHECK (
          (boarding_status)::text = ANY (
            ARRAY[
              ('waiting'::character varying)::text,
              ('boarded'::character varying)::text,
              ('dropped'::character varying)::text,
              ('absent'::character varying)::text,
              ('picked_up'::character varying)::text,
              ('dropped_off'::character varying)::text
            ]
          )
        ),
        CONSTRAINT student_boarding_status_trip_phase_check CHECK (
          (trip_phase)::text = ANY (
            ARRAY['go'::text, 'return'::text, 'unknown'::text]
          )
        )
      ) TABLESPACE pg_default;

      -- สร้าง indexes
      CREATE INDEX IF NOT EXISTS idx_sbs_student_id ON public.student_boarding_status USING btree (student_id) TABLESPACE pg_default;
      CREATE INDEX IF NOT EXISTS idx_sbs_driver_id ON public.student_boarding_status USING btree (driver_id) TABLESPACE pg_default;
      CREATE INDEX IF NOT EXISTS idx_sbs_trip_date ON public.student_boarding_status USING btree (trip_date) TABLESPACE pg_default;
      CREATE INDEX IF NOT EXISTS idx_sbs_trip_phase ON public.student_boarding_status USING btree (trip_phase) TABLESPACE pg_default;
      CREATE INDEX IF NOT EXISTS idx_sbs_boarding_status ON public.student_boarding_status USING btree (boarding_status) TABLESPACE pg_default;

      -- สร้าง trigger
      CREATE TRIGGER trigger_update_student_boarding_status_updated_at
      BEFORE UPDATE ON student_boarding_status
      FOR EACH ROW
      EXECUTE FUNCTION update_student_boarding_status_updated_at();
    `;

    // เขียน SQL ลงไฟล์เพื่อรันด้วย psql หรือ Supabase CLI
    const fs = require('fs');
    fs.writeFileSync('student_boarding_status.sql', createTableSQL);
    
    console.log('✅ สร้างไฟล์ SQL: student_boarding_status.sql');
    console.log('📝 กรุณารันคำสั่งต่อไปนี้เพื่อสร้างตาราง:');
    console.log('   npx supabase db push --file student_boarding_status.sql');
    console.log('   หรือ copy SQL จากไฟล์ student_boarding_status.sql ไปรันใน Supabase Dashboard');

  } catch (error) {
    console.error('❌ ข้อผิดพลาดทั่วไป:', error);
  }
}

// เรียกใช้ฟังก์ชัน
createStudentBoardingStatusTable();