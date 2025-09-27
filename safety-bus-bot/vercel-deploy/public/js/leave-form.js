import liff from '@line/liff';

window.onload = async function() {
  await liff.init({ liffId: 'YOUR_LIFF_ID' });
  const userId = liff.getContext()?.userId || (await liff.getProfile()).userId;
  // อ่าน studentId, studentName จาก query string
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('studentId');
  const studentName = urlParams.get('studentName');
  // แสดงชื่อ/รหัสในฟอร์ม
  document.getElementById('studentName').innerText = studentName;
  document.getElementById('studentId').innerText = studentId;
  // ...สร้าง date picker ให้เลือกได้สูงสุด 3 วัน...
  // ...เมื่อกดยืนยันครั้งแรก แสดงรายละเอียดให้ตรวจสอบ...
  // ...เมื่อกดยืนยันรอบสอง ส่ง POST ไป API /api/submit-leave...
  // ...ถ้าสำเร็จ liff.closeWindow()...
};