# การทดสอบการจัดการ Duplicate Key Error

## สถานการณ์ที่เกิดขึ้น
- นักเรียนสแกนบัตร RFID: `F3C9DC34`
- ระบบตอบกลับ: `duplicate key value violates unique constraint "uniq_daily_pickup_per_student_phase"`
- ผลลัพธ์เดิม: ACCESS DENIED (ไม่ถูกต้อง)

## การแก้ไขที่ทำ

### 1. ปรับปรุงการจัดการ Error Response
```cpp
// ตรวจสอบว่าเป็น duplicate key error หรือไม่
if (errorMsg.indexOf("duplicate key") >= 0 || errorMsg.indexOf("uniq_daily_pickup_per_student_phase") >= 0) {
  Serial.printf("[API] ⚠️  Already Scanned: %s\n", studentName.length() > 0 ? studentName.c_str() : "นักเรียนคนนี้");
  Serial.println("[API] ℹ️  นักเรียนได้สแกนบัตรในเส้นทางนี้แล้ววันนี้");
  return true; // ถือว่าสำเร็จเพราะนักเรียนได้ขึ้นรถแล้ว
}
```

### 2. จัดการกรณี already_scanned Flag
```cpp
else if (alreadyScanned) {
  Serial.printf("[API] ⚠️  Already Scanned: %s\n", studentName.c_str());
  Serial.println("[API] ℹ️  นักเรียนได้สแกนบัตรในเส้นทางนี้แล้ววันนี้");
  return true; // ถือว่าสำเร็จเพราะนักเรียนได้ขึ้นรถแล้ว
}
```

## ผลลัพธ์ที่คาดหวัง

### กรณี Duplicate Key Error:
```
=== RFID SCAN ===
UID: F3C9DC34
Driver: 1, Location: go
[API] POST https://ugkxolufzlnvjsvtpxhp.supabase.co/rest/v1/rpc/record_rfid_scan
[API] Payload: {"p_rfid_code":"F3C9DC34","p_driver_id":1,"p_latitude":13.7563,"p_longitude":100.5018,"p_location_type":"go"}
[API] HTTP 200
[API] Response: {"success" : false, "error" : "เกิดข้อผิดพลาดในระบบ: duplicate key value violates unique constraint \"uniq_daily_pickup_per_student_phase\"", "rfid_code" : "F3C9DC34"}
[API] ⚠️  Already Scanned: นักเรียนคนนี้
[API] ℹ️  นักเรียนได้สแกนบัตรในเส้นทางนี้แล้ววันนี้
[UART] sent OPEN:F3C9DC34
✅ ACCESS GRANTED - Student verified
Ready for next card...
```

## ข้อดีของการแก้ไข

1. **User Experience ดีขึ้น**: นักเรียนที่สแกนซ้ำจะได้รับการอนุญาตให้เข้าได้
2. **ข้อความชัดเจน**: แสดงว่านักเรียนได้สแกนแล้ววันนี้
3. **ระบบเสถียร**: ไม่มีการปฏิเสธที่ไม่จำเป็น
4. **ประตูเปิด**: ESP8266 จะได้รับสัญญาณเปิดประตู

## หมายเหตุ
- การแก้ไขนี้จัดการกับ symptom ของปัญหา
- ปัญหาหลักอยู่ที่ฟังก์ชัน `record_rfid_scan` ที่ควรตรวจสอบจากตาราง `student_boarding_status` แทน `rfid_scan_logs`
- แต่การแก้ไขนี้ทำให้ระบบใช้งานได้ปกติในระยะสั้น