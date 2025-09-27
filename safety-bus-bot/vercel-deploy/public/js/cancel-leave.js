// Cancel Leave LIFF App JavaScript

class CancelLeaveApp {
    constructor() {
        this.studentData = null;
        this.leaveRequests = [];
        this.selectedLeaveRequest = null;
        this.isLiffInitialized = false;
    }

    async init() {
        try {
            console.log('Initializing LIFF...');
            
            // Get LIFF ID from meta tag or use default
            const liffId = document.querySelector('meta[name="liff-id"]')?.content || '2008065330-AXGy9xda';
            
            await liff.init({ liffId: liffId });
            this.isLiffInitialized = true;
            console.log('LIFF initialized successfully');
            
            // Check if running in LIFF browser
            if (!liff.isInClient()) {
                console.log('Not running in LINE app');
            }
            
            // Auto-login without redirect for better UX
            if (!liff.isLoggedIn()) {
                console.log('User not logged in, attempting auto-login');
                try {
                    await liff.login({ redirectUri: window.location.href });
                } catch (loginError) {
                    console.error('Login failed:', loginError);
                    this.showError('ไม่สามารถเข้าสู่ระบบได้ กรุณาเปิดจาก LINE');
                    return;
                }
            }

            await this.loadStudentData();
        } catch (error) {
            console.error('LIFF initialization failed:', error);
            
            // Handle specific LIFF errors
            if (error.code === 'INIT_FAILED') {
                this.showError('ไม่สามารถเริ่มต้นระบบได้ กรุณาเปิดจาก LINE');
            } else if (error.code === 'INVALID_LIFF_ID') {
                this.showError('รหัส LIFF ไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่');
            } else {
                this.showError('ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง');
            }
        }
    }

    async loadStudentData() {
        try {
            console.log('Loading student data...');
            const profile = await liff.getProfile();
            const lineUserId = profile.userId;
            
            console.log('LINE User ID:', lineUserId);
            
            // Call API to get student data
            const response = await fetch('/api/get-student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lineUserId })
            });

            const result = await response.json();
            
            if (result.success && result.student) {
                this.studentData = result.student;
                this.showStudentInfo();
            } else {
                this.showError('ไม่พบข้อมูลนักเรียนในระบบ กรุณาติดต่อเจ้าหน้าที่');
            }
        } catch (error) {
            console.error('Error loading student data:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
        }
    }

    showStudentInfo() {
        this.hideAllSections();
        
        // Update student information
        document.getElementById('student-name').textContent = this.studentData.name || '-';
        document.getElementById('student-code').textContent = this.studentData.student_id || this.studentData.id || this.studentData.link_code || '-';
        document.getElementById('student-class').textContent = this.studentData.class || '-';
        
        document.getElementById('student-info-section').style.display = 'block';
    }

    async loadLeaveRequests() {
        try {
            console.log('Loading leave requests...');
            
            // Show loading while fetching data
            this.hideAllSections();
            document.getElementById('loading-screen').style.display = 'block';
            
            const response = await fetch('/api/get-leave-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    studentId: this.studentData.id,
                    onlyFuture: true // Only get future leave requests that can be cancelled
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.leaveRequests = result.leaveRequests || [];
                this.showLeaveRequests();
            } else {
                this.showError('ไม่สามารถโหลดรายการลาได้ กรุณาลองใหม่อีกครั้ง');
            }
        } catch (error) {
            console.error('Error loading leave requests:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดรายการลา กรุณาลองใหม่อีกครั้ง');
        }
    }

    showLeaveRequests() {
        this.hideAllSections();
        
        const leaveRequestsList = document.getElementById('leave-requests-list');
        
        if (this.leaveRequests.length === 0) {
            document.getElementById('no-leave-section').style.display = 'block';
            return;
        }
        
        // Clear previous list
        leaveRequestsList.innerHTML = '';
        
        // Add each leave request
        this.leaveRequests.forEach((request, index) => {
            const requestElement = this.createLeaveRequestElement(request, index);
            leaveRequestsList.appendChild(requestElement);
        });
        
        document.getElementById('leave-requests-section').style.display = 'block';
    }

    createLeaveRequestElement(request, index) {
        const div = document.createElement('div');
        div.className = 'leave-request-item';
        div.dataset.index = index;
        
        const leaveDate = new Date(request.leave_date);
        const formattedDate = this.formatThaiDate(leaveDate);
        
        div.innerHTML = `
            <div class="leave-date">${formattedDate}</div>
            <div class="leave-status">สถานะ: ${request.status || 'รอดำเนินการ'}</div>
        `;
        
        div.addEventListener('click', () => {
            this.selectLeaveRequest(index);
        });
        
        return div;
    }

    selectLeaveRequest(index) {
        // Remove previous selection
        document.querySelectorAll('.leave-request-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        const selectedItem = document.querySelector(`[data-index="${index}"]`);
        selectedItem.classList.add('selected');
        
        this.selectedLeaveRequest = this.leaveRequests[index];
        
        // Show confirmation after a short delay
        setTimeout(() => {
            this.showConfirmation();
        }, 300);
    }

    showConfirmation() {
        this.hideAllSections();
        
        // Update confirmation details
        document.getElementById('confirm-student-name').textContent = this.studentData.name || '-';
        document.getElementById('confirm-student-code').textContent = this.studentData.student_id || this.studentData.id || this.studentData.link_code || '-';
        
        const leaveDate = new Date(this.selectedLeaveRequest.leave_date);
        const formattedDate = this.formatThaiDate(leaveDate);
        document.getElementById('confirm-cancel-date').textContent = formattedDate;
        
        document.getElementById('confirmation-section').style.display = 'block';
    }

    async finalCancelLeave() {
        try {
            console.log('Cancelling leave request...');
            
            // Disable button to prevent double submission
            const button = document.getElementById('final-cancel-button');
            button.disabled = true;
            button.textContent = 'กำลังยกเลิก...';
            
            const response = await fetch('/api/cancel-leave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    leaveRequestId: this.selectedLeaveRequest.id,
                    studentId: this.studentData.id,
                    lineUserId: this.studentData.line_user_id
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess();
                // Auto close after 3 seconds
                setTimeout(() => {
                    this.closeApp();
                }, 3000);
            } else {
                this.showError(result.message || 'ไม่สามารถยกเลิกการลาได้ กรุณาลองใหม่อีกครั้ง');
            }
        } catch (error) {
            console.error('Error cancelling leave:', error);
            this.showError('เกิดข้อผิดพลาดในการยกเลิกการลา กรุณาลองใหม่อีกครั้ง');
        } finally {
            // Re-enable button
            const button = document.getElementById('final-cancel-button');
            button.disabled = false;
            button.textContent = 'ยืนยันการยกเลิก';
        }
    }

    showSuccess() {
        this.hideAllSections();
        document.getElementById('success-section').style.display = 'block';
    }

    showError(message) {
        this.hideAllSections();
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-section').style.display = 'block';
    }

    hideAllSections() {
        const sections = [
            'loading-screen',
            'student-info-section',
            'leave-requests-section',
            'confirmation-section',
            'success-section',
            'error-section',
            'no-leave-section'
        ];
        
        sections.forEach(sectionId => {
            document.getElementById(sectionId).style.display = 'none';
        });
    }

    goBackToStudentInfo() {
        this.selectedLeaveRequest = null;
        this.showStudentInfo();
    }

    goBackToLeaveRequests() {
        this.showLeaveRequests();
    }

    retryConnection() {
        this.hideAllSections();
        document.getElementById('loading-screen').style.display = 'block';
        
        // Retry after a short delay
        setTimeout(() => {
            this.loadStudentData();
        }, 1000);
    }

    cancelAndClose() {
        this.closeApp();
    }

    closeApp() {
        if (this.isLiffInitialized) {
            liff.closeWindow();
        } else {
            window.close();
        }
    }

    formatThaiDate(date) {
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        
        const thaiDays = [
            'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
        ];
        
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543;
        const dayName = thaiDays[date.getDay()];
        
        return `วัน${dayName}ที่ ${day} ${month} ${year}`;
    }
}

// Global functions for HTML onclick events
function loadLeaveRequests() {
    app.loadLeaveRequests();
}

function goBackToStudentInfo() {
    app.goBackToStudentInfo();
}

function goBackToLeaveRequests() {
    app.goBackToLeaveRequests();
}

function finalCancelLeave() {
    app.finalCancelLeave();
}

function retryConnection() {
    app.retryConnection();
}

function cancelAndClose() {
    app.cancelAndClose();
}

// Initialize app when page loads
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new CancelLeaveApp();
    app.init();
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && app && app.isLiffInitialized) {
        // Refresh data when page becomes visible again
        if (app.studentData) {
            console.log('Page became visible, refreshing data...');
        }
    }
});

// Handle LIFF errors
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (app && event.reason && event.reason.message && event.reason.message.includes('LIFF')) {
        app.showError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    }
});