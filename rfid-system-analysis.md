# การวิเคราะห์และออกแบบระบบ RFID แบบครบถ้วน

## 1. การวิเคราะห์ฐานข้อมูลปัจจุบัน

### ตารางที่เกี่ยวข้อง:
- `rfid_cards` - ข้อมูลบัตร RFID
- `rfid_card_assignments` - เชื่อมโยงบัตรกับนักเรียน  
- `students` - ข้อมูลนักเรียน
- `student_line_links` - เชื่อมโยง LINE ID กับนักเรียน
- `pickup_dropoff` - บันทึกการรับส่งนักเรียน (ใช้ตารางนี้)

### การปรับปรุงฐานข้อมูล:
```sql
-- เพิ่มฟิลด์ในตาราง pickup_dropoff
ALTER TABLE pickup_dropoff 
ADD COLUMN rfid_code VARCHAR,
ADD COLUMN scan_method VARCHAR DEFAULT 'manual' CHECK (scan_method IN ('rfid', 'manual'));
```

## 2. API Endpoints ที่ต้องสร้าง

### 2.1 API สำหรับ ESP32 ส่งข้อมูลการสแกน
```
POST /api/rfid/scan
Body: {
  "rfid_code": "A1B2C3D4",
  "driver_id": 1,
  "latitude": 13.7563,
  "longitude": 100.5018,
  "location_type": "go" // หรือ "return"
}
```

### 2.2 API สำหรับแอปคนขับดูสถานะนักเรียน
```
GET /api/students/status/{route_id}
Response: [
  {
    "student_id": 1,
    "student_name": "นักเรียน A",
    "is_on_bus": true,
    "scan_time": "2024-01-15T07:30:00Z",
    "location_type": "go"
  }
]
```

## 3. ระบบแจ้งเตือน LINE

### 3.1 Logic การส่งแจ้งเตือน:
1. เมื่อ ESP32 ส่งข้อมูลการสแกนมา
2. ค้นหา student_id จาก rfid_card_assignments
3. ค้นหา line_user_id จาก student_line_links  
4. ส่งข้อความแจ้งเตือนไป LINE

### 3.2 ข้อความแจ้งเตือน:
```
🚌 แจ้งเตือนการขึ้นรถ
นักเรียน: [ชื่อนักเรียน]
เวลา: [เวลาที่สแกน]
สถานะ: ขึ้นรถแล้ว ✅
คนขับ: [ชื่อคนขับ]
```

## 4. การปรับปรุงโค้ด ESP32

### 4.1 เพิ่มฟังก์ชันส่งข้อมูลไป API:
```cpp
bool sendScanToAPI(const String& uid, int driverId, float lat, float lng, const String& locationType) {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String url = String(SUPABASE_URL) + "/rest/v1/rpc/record_rfid_scan";
  
  if (!https.begin(client, url)) return false;

  https.setTimeout(10000);
  https.addHeader("Content-Type", "application/json");
  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  String payload = "{";
  payload += "\"p_rfid_code\":\"" + uid + "\",";
  payload += "\"p_driver_id\":" + String(driverId) + ",";
  payload += "\"p_latitude\":" + String(lat, 6) + ",";
  payload += "\"p_longitude\":" + String(lng, 6) + ",";
  payload += "\"p_location_type\":\"" + locationType + "\"";
  payload += "}";

  int code = https.POST(payload);
  String response = https.getString();
  https.end();

  Serial.printf("[API] HTTP %d: %s\n", code, response.c_str());
  return (code == 200);
}
```

## 5. Supabase Function สำหรับบันทึกการสแกน

```sql
CREATE OR REPLACE FUNCTION record_rfid_scan(
  p_rfid_code VARCHAR,
  p_driver_id INTEGER,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_location_type VARCHAR
) RETURNS JSON AS $$
DECLARE
  v_student_id INTEGER;
  v_line_user_id TEXT;
  v_student_name VARCHAR;
  v_driver_name VARCHAR;
  v_record_id INTEGER;
BEGIN
  -- ค้นหา student_id จาก RFID code
  SELECT s.student_id, s.student_name
  INTO v_student_id, v_student_name
  FROM students s
  JOIN rfid_card_assignments rca ON s.student_id = rca.student_id
  JOIN rfid_cards rc ON rca.card_id = rc.card_id
  WHERE rc.rfid_code = p_rfid_code
    AND rca.is_active = true
    AND rc.is_active = true
    AND (rca.valid_to IS NULL OR rca.valid_to > NOW());

  IF v_student_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Student not found');
  END IF;

  -- ค้นหาชื่อคนขับ
  SELECT driver_name INTO v_driver_name
  FROM driver_bus WHERE driver_id = p_driver_id;

  -- บันทึกการสแกน
  INSERT INTO pickup_dropoff (
    student_id, driver_id, event_type, gps_latitude, gps_longitude,
    location_type, rfid_code, scan_method
  ) VALUES (
    v_student_id, p_driver_id, 'pickup', p_latitude, p_longitude,
    p_location_type, p_rfid_code, 'rfid'
  ) RETURNING record_id INTO v_record_id;

  -- ค้นหา LINE user ID
  SELECT line_user_id INTO v_line_user_id
  FROM student_line_links
  WHERE student_id = v_student_id AND active = true;

  -- ส่งแจ้งเตือน LINE (ถ้ามี)
  IF v_line_user_id IS NOT NULL THEN
    INSERT INTO notification_logs (
      student_id, driver_id, notification_type, message, line_user_id,
      student_latitude, student_longitude, bus_latitude, bus_longitude
    ) VALUES (
      v_student_id, p_driver_id, 'rfid_scan',
      '🚌 ' || v_student_name || ' ขึ้นรถแล้ว เวลา ' || TO_CHAR(NOW(), 'HH24:MI') || ' คนขับ: ' || v_driver_name,
      v_line_user_id, p_latitude, p_longitude, p_latitude, p_longitude
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'student_id', v_student_id,
    'student_name', v_student_name,
    'record_id', v_record_id,
    'line_notified', v_line_user_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;
```

## 6. การปรับปรุงแอปคนขับ

### 6.1 API สำหรับดูสถานะนักเรียน:
```typescript
// services/studentStatusService.ts
export const getStudentStatus = async (routeId: number) => {
  const { data, error } = await supabase
    .from('route_students')
    .select(`
      student_id,
      students!inner(student_name),
      pickup_dropoff!left(
        event_time,
        location_type,
        event_local_date
      )
    `)
    .eq('route_id', routeId)
    .eq('pickup_dropoff.event_local_date', new Date().toISOString().split('T')[0])
    .order('pickup_dropoff.event_time', { ascending: false });

  return data?.map(item => ({
    student_id: item.student_id,
    student_name: item.students.student_name,
    is_on_bus: item.pickup_dropoff?.length > 0,
    last_scan: item.pickup_dropoff?.[0]?.event_time
  }));
};
```

### 6.2 หน้าแสดงรายชื่อนักเรียน:
```tsx
// components/StudentStatusList.tsx
const StudentStatusList = ({ routeId }: { routeId: number }) => {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchStatus = async () => {
      const status = await getStudentStatus(routeId);
      setStudents(status);
    };
    fetchStatus();
    
    // Refresh ทุก 30 วินาที
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [routeId]);

  return (
    <View>
      {students.map(student => (
        <View key={student.student_id} style={styles.studentItem}>
          <Text>{student.student_name}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: student.is_on_bus ? '#4CAF50' : '#FF9800' }
          ]}>
            <Text style={styles.statusText}>
              {student.is_on_bus ? '✅ ขึ้นรถแล้ว' : '⏳ รอขึ้นรถ'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};
```

## 7. การทดสอบระบบ

### 7.1 ขั้นตอนการทดสอบ:
1. ทดสอบการสแกน RFID บน ESP32
2. ตรวจสอบการส่งข้อมูลไป API
3. ทดสอบการแจ้งเตือน LINE
4. ทดสอบการแสดงผลในแอปคนขับ

### 7.2 Test Cases:
- สแกนบัตรที่มีในระบบ
- สแกนบัตรที่ไม่มีในระบบ  
- ทดสอบเมื่อไม่มี LINE ID
- ทดสอบเมื่อไม่มีอินเทอร์เน็ต