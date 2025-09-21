// LIFF App สำหรับ Date Picker
class LiffDatePicker {
    constructor() {
        this.liffId = null; // จะต้องตั้งค่าใน LINE Developers Console
        this.init();
    }

    async init() {
        try {
            // รอให้ LIFF SDK โหลดเสร็จ
            await this.initializeLiff();
            this.setupEventListeners();
            this.setMinDate();
        } catch (error) {
            console.error('Error initializing LIFF:', error);
            this.showError('ไม่สามารถเชื่อมต่อกับ LINE ได้');
        }
    }

    async initializeLiff() {
        // ตรวจสอบว่า LIFF SDK โหลดแล้วหรือไม่
        if (typeof liff === 'undefined') {
            throw new Error('LIFF SDK not loaded');
        }

        // รอให้ LIFF พร้อมใช้งาน
        await liff.ready;
        
        // ตรวจสอบว่าเปิดใน LINE หรือไม่
        if (!liff.isInClient()) {
            console.warn('Not running in LINE client');
        }

        console.log('LIFF initialized successfully');
    }

    setupEventListeners() {
        const confirmBtn = document.getElementById('confirmBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const dateInput = document.getElementById('leaveDate');

        // ปุ่มยืนยัน
        confirmBtn.addEventListener('click', () => {
            this.handleConfirm();
        });

        // ปุ่มยกเลิก
        cancelBtn.addEventListener('click', () => {
            this.handleCancel();
        });

        // เมื่อเลือกวันที่
        dateInput.addEventListener('change', () => {
            this.validateDate();
        });
    }

    setMinDate() {
        // ตั้งค่าวันที่ขั้นต่ำเป็นวันนี้
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dateInput = document.getElementById('leaveDate');
        dateInput.min = tomorrow.toISOString().split('T')[0];
        
        // ตั้งค่าวันที่สูงสุดเป็น 1 ปีข้างหน้า
        const maxDate = new Date(today);
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        dateInput.max = maxDate.toISOString().split('T')[0];
    }

    validateDate() {
        const dateInput = document.getElementById('leaveDate');
        const confirmBtn = document.getElementById('confirmBtn');
        
        if (dateInput.value) {
            const selectedDate = new Date(dateInput.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate <= today) {
                this.showError('กรุณาเลือกวันที่ในอนาคต');
                confirmBtn.disabled = true;
                return false;
            } else {
                this.hideError();
                confirmBtn.disabled = false;
                return true;
            }
        } else {
            confirmBtn.disabled = true;
            return false;
        }
    }

    async handleConfirm() {
        const dateInput = document.getElementById('leaveDate');
        const confirmBtn = document.getElementById('confirmBtn');
        
        if (!this.validateDate()) {
            return;
        }

        const selectedDate = dateInput.value;
        if (!selectedDate) {
            this.showError('กรุณาเลือกวันที่');
            return;
        }

        try {
            // แสดง loading
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '⏳ กำลังส่งข้อมูล...';
            
            // แปลงวันที่เป็นรูปแบบที่อ่านง่าย
            const formattedDate = this.formatDateThai(selectedDate);
            
            // ส่งข้อมูลกลับไปยัง chat
            const message = `วันที่แจ้งลา: ${formattedDate}`;
            
            if (liff.isInClient()) {
                // ส่งข้อความกลับไปยัง chat
                await liff.sendMessages([
                    {
                        type: 'text',
                        text: message
                    }
                ]);
                
                // ปิด LIFF
                liff.closeWindow();
            } else {
                // สำหรับการทดสอบนอก LINE
                alert(`ข้อมูลที่เลือก: ${message}`);
                console.log('Selected date:', selectedDate);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('เกิดข้อผิดพลาดในการส่งข้อมูล');
            
            // รีเซ็ตปุ่ม
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '✅ ยืนยันวันที่';
        }
    }

    handleCancel() {
        if (liff.isInClient()) {
            liff.closeWindow();
        } else {
            // สำหรับการทดสอบนอก LINE
            alert('ยกเลิกการเลือกวันที่');
        }
    }

    formatDateThai(dateString) {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            locale: 'th-TH'
        };
        
        return date.toLocaleDateString('th-TH', options);
    }

    showError(message) {
        // ลบ error message เก่า
        this.hideError();
        
        const container = document.querySelector('.form-container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: #ffe6e6;
            border: 1px solid #ff9999;
            border-radius: 8px;
            padding: 10px;
            margin: 10px 0;
            color: #cc0000;
            font-size: 14px;
            text-align: center;
        `;
        errorDiv.textContent = message;
        
        container.appendChild(errorDiv);
    }

    hideError() {
        const errorMessage = document.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
}

// เริ่มต้น LIFF App เมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    new LiffDatePicker();
});

// สำหรับการ debug
window.liffDatePicker = LiffDatePicker;