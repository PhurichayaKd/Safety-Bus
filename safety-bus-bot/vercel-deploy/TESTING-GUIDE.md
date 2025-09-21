# คำแนะนำการทดสอบ LIFF App อย่างละเอียด

## การทดสอบ Safety Bus LIFF App

### 1. การทดสอบเบื้องต้น

#### 1.1 ทดสอบ URL ใน Browser
1. เปิดเบราว์เซอร์ (Chrome, Safari, Firefox)
2. ไปที่ URL ที่ได้จาก Vercel
3. ตรวจสอบ:
   - ✅ หน้าเว็บโหลดได้
   - ✅ มี HTTPS (🔒) ในแถบที่อยู่
   - ✅ CSS โหลดถูกต้อง (สีและรูปแบบ)
   - ✅ ไม่มี error ใน Console (กด F12)

#### 1.2 ทดสอบ Responsive Design
1. กด F12 เพื่อเปิด Developer Tools
2. คลิกไอคอน 📱 (Toggle device toolbar)
3. ทดสอบในขนาดหน้าจอต่างๆ:
   - iPhone SE (375x667)
   - iPhone 12 Pro (390x844)
   - iPad (768x1024)
   - Desktop (1920x1080)

### 2. การทดสอบ LIFF Functionality

#### 2.1 ทดสอบผ่าน LINE Developers Console
1. ไปที่ https://developers.line.biz/
2. เลือก Provider → Channel → LIFF
3. คลิก LIFF app ที่สร้าง
4. คลิก **"Share target picker"**
5. เลือกแชทที่ต้องการทดสอบ
6. ส่งลิงก์ LIFF

#### 2.2 ทดสอบใน LINE App (มือถือ)
1. เปิด LINE app
2. ไปที่แชทที่ส่งลิงก์ไว้
3. คลิกลิงก์ LIFF
4. ตรวจสอบ:
   - ✅ หน้าเว็บเปิดใน LINE app
   - ✅ ไม่มี error popup
   - ✅ UI แสดงผลถูกต้อง

### 3. การทดสอบ Date Picker

#### 3.1 ทดสอบการเลือกวันที่
1. คลิกที่ input field วันที่
2. ทดสอบ:
   - ✅ Date picker เปิดได้
   - ✅ ไม่สามารถเลือกวันที่ในอดีตได้
   - ✅ สามารถเลือกวันที่ในอนาคตได้
   - ✅ วันที่ที่เลือกแสดงในรูปแบบภาษาไทย

#### 3.2 ทดสอบ Validation
1. **ทดสอบวันที่ว่าง:**
   - ไม่เลือกวันที่
   - คลิกปุ่ม "ยืนยันวันที่"
   - ✅ ปุ่มควรถูก disable

2. **ทดสอบวันที่ในอดีต:**
   - พยายามเลือกวันที่เมื่อวาน
   - ✅ ควรไม่สามารถเลือกได้

3. **ทดสอบวันที่ถูกต้อง:**
   - เลือกวันที่พรุ่งนี้
   - ✅ ปุ่ม "ยืนยันวันที่" ควร enable
   - ✅ แสดงวันที่ที่เลือกในกล่องสีเขียว

### 4. การทดสอบการส่งข้อความ

#### 4.1 ทดสอบการยืนยันวันที่
1. เลือกวันที่ที่ต้องการ
2. คลิกปุ่ม "✅ ยืนยันวันที่"
3. ตรวจสอบ:
   - ✅ ปุ่มแสดง loading ("กำลังส่ง...")
   - ✅ LIFF window ปิดอัตโนมัติ
   - ✅ ข้อความส่งกลับไปยังแชท
   - ✅ ข้อความมีรูปแบบ: "วันที่แจ้งลา: [วันที่ภาษาไทย]"

#### 4.2 ทดสอบการยกเลิก
1. เลือกวันที่ใดๆ
2. คลิกปุ่ม "❌ ยกเลิก"
3. ตรวจสอบ:
   - ✅ LIFF window ปิดทันที
   - ✅ ไม่มีข้อความส่งไปยังแชท

### 5. การทดสอบ Error Handling

#### 5.1 ทดสอบ Network Error
1. ปิด WiFi/Mobile Data ชั่วคราว
2. พยายามส่งข้อความ
3. ตรวจสอบ:
   - ✅ แสดง error message
   - ✅ ปุ่มกลับมาเป็นสถานะปกติ

#### 5.2 ทดสอบ LIFF Error
1. แก้ไข LIFF ID ให้ผิด (ชั่วคราว)
2. เปิด LIFF app
3. ตรวจสอบ:
   - ✅ แสดง error message ที่เหมาะสม
   - ✅ ไม่ crash

### 6. การทดสอบ Cross-Platform

#### 6.1 ทดสอบใน iOS
- iPhone (Safari)
- LINE app บน iOS
- ตรวจสอบ UI และ functionality

#### 6.2 ทดสอบใน Android
- Android phone (Chrome)
- LINE app บน Android
- ตรวจสอบ UI และ functionality

#### 6.3 ทดสอบใน Desktop
- Chrome, Firefox, Safari, Edge
- ตรวจสอบ responsive design

### 7. การทดสอบ Performance

#### 7.1 ทดสอบ Loading Speed
1. เปิด Developer Tools
2. ไปที่แท็บ Network
3. Reload หน้าเว็บ
4. ตรวจสอบ:
   - ✅ Total loading time < 3 วินาที
   - ✅ ไฟล์ CSS และ JS โหลดได้
   - ✅ ไม่มี 404 errors

#### 7.2 ทดสอบ Memory Usage
1. เปิด Developer Tools
2. ไปที่แท็บ Performance
3. Record การใช้งาน 30 วินาที
4. ตรวจสอบ memory leaks

### 8. การทดสอบ Security

#### 8.1 ทดสอบ HTTPS
1. ตรวจสอบ SSL Certificate
2. ตรวจสอบ Security Headers
3. ใช้เครื่องมือ: https://securityheaders.com/

#### 8.2 ทดสอบ XSS Protection
1. พยายามใส่ script tags ใน input
2. ตรวจสอบว่าถูก sanitize

### 9. Checklist การทดสอบ

#### 9.1 Basic Functionality
- [ ] หน้าเว็บโหลดได้ใน browser
- [ ] HTTPS ทำงานถูกต้อง
- [ ] CSS และ JavaScript โหลดได้
- [ ] Responsive design ทำงานได้

#### 9.2 LIFF Integration
- [ ] เปิดได้ใน LINE app
- [ ] LIFF initialization สำเร็จ
- [ ] ไม่มี LIFF errors

#### 9.3 Date Picker
- [ ] เลือกวันที่ได้
- [ ] Validation ทำงานถูกต้อง
- [ ] แสดงวันที่เป็นภาษาไทย
- [ ] ไม่สามารถเลือกวันที่ในอดีตได้

#### 9.4 Message Sending
- [ ] ส่งข้อความกลับไปยังแชทได้
- [ ] รูปแบบข้อความถูกต้อง
- [ ] LIFF window ปิดหลังส่งข้อความ

#### 9.5 Error Handling
- [ ] แสดง error messages ที่เหมาะสม
- [ ] Handle network errors
- [ ] Handle LIFF errors

#### 9.6 Cross-Platform
- [ ] ทำงานได้บน iOS
- [ ] ทำงานได้บน Android
- [ ] ทำงานได้บน Desktop browsers

### 10. การแก้ไขปัญหาที่พบ

#### 10.1 ปัญหา UI
- ตรวจสอบ CSS paths
- ตรวจสอบ responsive breakpoints
- ตรวจสอบ font loading

#### 10.2 ปัญหา JavaScript
- ตรวจสอบ Console errors
- ตรวจสอบ LIFF SDK loading
- ตรวจสอบ async/await handling

#### 10.3 ปัญหา LIFF
- ตรวจสอบ LIFF ID
- ตรวจสอบ Endpoint URL
- ตรวจสอบ Scope settings

---

## สรุป

การทดสอบ LIFF app ต้องครอบคลุมทั้ง:
1. **Functionality Testing** - การทำงานของฟีเจอร์
2. **UI/UX Testing** - การแสดงผลและประสบการณ์ผู้ใช้
3. **Integration Testing** - การเชื่อมต่อกับ LINE
4. **Performance Testing** - ความเร็วและประสิทธิภาพ
5. **Security Testing** - ความปลอดภัย
6. **Cross-Platform Testing** - การทำงานข้ามแพลตฟอร์ม

**หมายเหตุ**: ทดสอบอย่างละเอียดก่อนนำไปใช้งานจริงเพื่อให้แน่ใจว่าระบบทำงานได้อย่างสมบูรณ์