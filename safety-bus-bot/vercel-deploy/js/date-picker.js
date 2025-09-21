// Enhanced LIFF App JavaScript
let liff;
let selectedDates = [];
let studentInfo = null;
let currentSection = 'loading'; // loading, student-info, date-selection, confirmation, success, error

// Initialize LIFF
function initializeLIFF() {
    // Get LIFF ID from environment or use default
    const liffId = window.LIFF_ID || '2006508893-Ej5Aw6Vy';
    
    liff.init({
        liffId: liffId // Replace with your actual LIFF ID
    }).then(() => {
        console.log('LIFF initialized successfully');
        
        // Check if running in LIFF browser
        if (!liff.isInClient()) {
            console.log('Not running in LINE app');
        }
        
        if (!liff.isLoggedIn()) {
            console.log('User not logged in, attempting login');
            liff.login({ redirectUri: window.location.href });
        } else {
            console.log('User is logged in');
            getStudentInfo();
        }
    }).catch((err) => {
        console.error('LIFF initialization failed', err);
        
        // Handle specific LIFF errors
        if (err.code === 'INIT_FAILED') {
            showErrorSection('ไม่สามารถเริ่มต้นระบบได้ กรุณาเปิดจาก LINE');
        } else if (err.code === 'INVALID_LIFF_ID') {
            showErrorSection('รหัส LIFF ไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่');
        } else {
            showErrorSection('ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาลองใหม่อีกครั้ง');
        }
    });
}

// Get student information from LINE ID
function getStudentInfo() {
    liff.getProfile().then((profile) => {
        console.log('User profile:', profile);
        
        // Call API to get student info
        return fetch('/api/submit-leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getStudentInfo',
                userId: profile.userId
            })
        });
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }).then(data => {
        if (data.success && data.student) {
            studentInfo = data.student;
            showStudentInfoSection();
        } else {
            throw new Error(data.message || 'ไม่พบข้อมูลนักเรียนในระบบ');
        }
    }).catch((error) => {
        console.error('Error getting student info:', error);
        showErrorSection(error.message || 'ไม่สามารถดึงข้อมูลนักเรียนได้ กรุณาติดต่อเจ้าหน้าที่');
    });
}

// Show different sections
function showSection(sectionName) {
    // Hide all sections
    const sections = ['loading-screen', 'student-info-section', 'date-selection-section', 'confirmation-section', 'success-section', 'error-section'];
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    currentSection = sectionName.replace('-section', '').replace('-screen', '');
}

function showStudentInfoSection() {
    if (studentInfo) {
        document.getElementById('student-name').textContent = studentInfo.student_name;
        document.getElementById('student-code').textContent = studentInfo.link_code;
        document.getElementById('student-class').textContent = studentInfo.class || 'ไม่ระบุ';
    }
    showSection('student-info-section');
}

function showDateSelectionSection() {
    showSection('date-selection-section');
    setupDatePicker();
}

function showConfirmationSection() {
    // Update confirmation details
    document.getElementById('confirm-student-name').textContent = studentInfo.student_name;
    document.getElementById('confirm-student-code').textContent = studentInfo.link_code;
    
    // Update selected dates list
    const confirmDatesList = document.getElementById('confirm-dates-list');
    confirmDatesList.innerHTML = '';
    
    selectedDates.forEach(date => {
        const dateItem = document.createElement('div');
        dateItem.className = 'confirm-date-item';
        dateItem.textContent = formatDateThai(date);
        confirmDatesList.appendChild(dateItem);
    });
    
    showSection('confirmation-section');
}

function showSuccessSection() {
    showSection('success-section');
    // Auto close after 3 seconds
    setTimeout(() => {
        if (liff) {
            liff.closeWindow();
        }
    }, 3000);
}

function showErrorSection(message) {
    document.getElementById('error-message').textContent = message;
    showSection('error-section');
}

// Date picker functionality
function setupDatePicker() {
    const dateInput = document.getElementById('leaveDate');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Set minimum date to tomorrow
    dateInput.min = tomorrow.toISOString().split('T')[0];
    
    // Set maximum date to 30 days from today
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    dateInput.max = maxDate.toISOString().split('T')[0];
    
    updateSelectedDatesList();
    updateAddButton();
}

// Add selected date
function addDate() {
    const dateInput = document.getElementById('leaveDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        alert('กรุณาเลือกวันที่');
        return;
    }
    
    if (selectedDates.includes(selectedDate)) {
        alert('วันที่นี้ถูกเลือกแล้ว');
        return;
    }
    
    if (selectedDates.length >= 3) {
        alert('สามารถเลือกได้สูงสุด 3 วัน');
        return;
    }
    
    selectedDates.push(selectedDate);
    selectedDates.sort(); // Sort dates chronologically
    
    dateInput.value = ''; // Clear input
    updateSelectedDatesList();
    updateAddButton();
    updateConfirmButton();
}

// Remove date from selection
function removeDate(date) {
    const index = selectedDates.indexOf(date);
    if (index > -1) {
        selectedDates.splice(index, 1);
        updateSelectedDatesList();
        updateAddButton();
        updateConfirmButton();
    }
}

// Update selected dates list display
function updateSelectedDatesList() {
    const container = document.getElementById('dates-container');
    
    if (selectedDates.length === 0) {
        container.innerHTML = '<p class="no-dates">ยังไม่ได้เลือกวันที่</p>';
    } else {
        container.innerHTML = '';
        selectedDates.forEach(date => {
            const dateItem = document.createElement('div');
            dateItem.className = 'date-item';
            dateItem.innerHTML = `
                <span class="date-text">${formatDateThai(date)}</span>
                <button class="remove-date" onclick="removeDate('${date}')" title="ลบวันที่นี้">×</button>
            `;
            container.appendChild(dateItem);
        });
    }
}

// Update add button state
function updateAddButton() {
    const addButton = document.getElementById('add-date-button');
    addButton.disabled = selectedDates.length >= 3;
    
    if (selectedDates.length >= 3) {
        addButton.textContent = 'เลือกครบ 3 วันแล้ว';
    } else {
        addButton.textContent = `เพิ่มวันที่ (${selectedDates.length}/3)`;
    }
}

// Update confirm button state
function updateConfirmButton() {
    const confirmButton = document.getElementById('confirm-dates-button');
    confirmButton.disabled = selectedDates.length === 0;
}

// Format date to Thai
function formatDateThai(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return date.toLocaleDateString('th-TH', options);
}

// Confirm leave request
function confirmLeave() {
    if (selectedDates.length === 0) {
        alert('กรุณาเลือกวันที่ต้องการลา');
        return;
    }
    
    showConfirmationSection();
}

// Final submit leave request
function finalSubmitLeave() {
    if (!liff.isLoggedIn()) {
        showErrorSection('กรุณาเข้าสู่ระบบ LINE ก่อน');
        return;
    }
    
    const finalConfirmButton = document.getElementById('final-confirm-button');
    finalConfirmButton.disabled = true;
    finalConfirmButton.innerHTML = '<span class="loading"></span>กำลังส่งข้อมูล...';
    
    // Get user profile and submit leave request
    liff.getProfile().then((profile) => {
        const leaveData = {
            action: 'submitLeave',
            userId: profile.userId,
            displayName: profile.displayName,
            studentInfo: studentInfo,
            leaveDates: selectedDates,
            reason: 'ไม่ประสงค์ขึ้นรถบัสรับ-ส่งในวันดังกล่าว'
        };
        
        return submitLeaveRequest(leaveData);
    }).then((response) => {
        if (response.success) {
            showSuccessSection();
        } else {
            throw new Error(response.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
        }
    }).catch((error) => {
        console.error('Error submitting leave:', error);
        showErrorSection(error.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    }).finally(() => {
        finalConfirmButton.disabled = false;
        finalConfirmButton.innerHTML = 'ยืนยันการส่งข้อมูล';
    });
}

// Submit leave request to API
function submitLeaveRequest(data) {
    return fetch('/api/submit-leave', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
}

// Navigation functions
function goToDateSelection() {
    showDateSelectionSection();
}

function goBackToDateSelection() {
    showDateSelectionSection();
}

function retryConnection() {
    showSection('loading-screen');
    setTimeout(() => {
        initializeLIFF();
    }, 1000);
}

// Cancel and close LIFF
function cancelLeave() {
    if (liff) {
        liff.closeWindow();
    }
}

// Initialize app when page loads
window.addEventListener('load', function() {
    // Show loading screen initially
    showSection('loading-screen');
    
    // Check if LIFF is available
    if (typeof liff !== 'undefined') {
        initializeLIFF();
    } else {
        console.error('LIFF SDK not loaded');
        showErrorSection('ไม่สามารถโหลด LINE SDK ได้ กรุณาลองใหม่อีกครั้ง');
    }
});

// Handle LIFF errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});