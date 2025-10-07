// Leave Form JavaScript
// This file handles the leave request form functionality

let supabase;
let studentData = null;

// Initialize the application
async function initializeApp() {
    try {
        // Show loading screen
        document.getElementById('loading-screen').style.display = 'flex';
        document.getElementById('main-form').style.display = 'none';

        // Initialize LIFF
        await window.liff.init({ liffId: '2008065330-AXGy9xda' });
        
        if (!window.liff.isLoggedIn()) {
            window.liff.login();
            return;
        }

        // Note: Using API endpoints instead of direct Supabase connection

        // Get user profile
        const profile = await window.liff.getProfile();
        const userId = profile.userId;

        // Load student data
        await loadStudentData(userId);

        // Initialize form
        initializeForm();

        // Hide loading screen
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-form').style.display = 'block';

    } catch (error) {
        console.error('Initialization error:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    }
}

// Load student data from API
async function loadStudentData(userId) {
    try {
        const response = await fetch(`/api/get-student?line_user_id=${userId}`);
        
        if (!response.ok) {
            throw new Error('ไม่สามารถดึงข้อมูลนักเรียนได้');
        }

        const result = await response.json();
        
        if (!result.success || !result.student) {
            throw new Error('ไม่พบข้อมูลนักเรียน กรุณาติดต่อผู้ดูแลระบบ');
        }

        studentData = result.student;
        
        // Update UI with student data
        document.getElementById('student-name').textContent = studentData.name || '-';
        document.getElementById('student-code').textContent = studentData.id || '-';
        document.getElementById('student-class').textContent = studentData.class || '-';

    } catch (error) {
        console.error('Error loading student data:', error);
        throw error;
    }
}

// Initialize form elements
function initializeForm() {
    // Add event listeners
    document.getElementById('add-date-btn').addEventListener('click', handleAddDate);
    document.getElementById('confirm-btn').addEventListener('click', handleSubmit);
    document.getElementById('final-confirm-btn').addEventListener('click', handleConfirm);
    document.getElementById('back-btn').addEventListener('click', handleBack);
    document.getElementById('retry-btn').addEventListener('click', handleRetry);
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('leave-date').min = today;
}

// Handle adding a date
function handleAddDate() {
    const dateInput = document.getElementById('leave-date');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showError('กรุณาเลือกวันที่');
        return;
    }
    
    // Check if date already selected
    if (selectedDates.includes(selectedDate)) {
        showError('วันที่นี้ถูกเลือกแล้ว');
        return;
    }
    
    // Check maximum dates
    if (selectedDates.length >= 3) {
        showError('สามารถเลือกได้สูงสุด 3 วัน');
        return;
    }
    
    // Add date
    selectedDates.push(selectedDate);
    updateDatesList();
    updateSubmitButton();
    
    // Clear input
    dateInput.value = '';
}

// Update dates list display
function updateDatesList() {
    const datesContainer = document.getElementById('dates-container');
    
    if (selectedDates.length === 0) {
        datesContainer.innerHTML = '<p class="no-dates">ยังไม่ได้เลือกวันที่</p>';
        return;
    }
    
    // Sort dates
    const sortedDates = [...selectedDates].sort();
    
    datesContainer.innerHTML = sortedDates.map(date => {
        const dateObj = new Date(date);
        const formattedDate = formatThaiDate(dateObj);
        
        return `
            <div class="selected-date-item">
                <span>${formattedDate}</span>
                <button class="remove-date-btn" onclick="removeDate('${date}')">×</button>
            </div>
        `;
    }).join('');
}

// Remove a selected date
function removeDate(date) {
    selectedDates = selectedDates.filter(d => d !== date);
    updateDatesList();
    updateSubmitButton();
}

// Update submit button state
function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = selectedDates.length === 0;
}

// Handle form submission
function handleSubmit() {
    if (selectedDates.length === 0) {
        showError('กรุณาเลือกวันที่ต้องการลา');
        return;
    }
    
    // Show confirmation
    showConfirmation();
}

// Show confirmation screen
function showConfirmation() {
    // Update confirmation details
    document.getElementById('confirm-student-name').textContent = studentData.name || '-';
    document.getElementById('confirm-student-code').textContent = studentData.student_id || '-';
    document.getElementById('confirm-student-class').textContent = studentData.class || '-';
    
    // Update dates summary
    const datesSummary = document.getElementById('confirm-dates-list');
    if (datesSummary) {
        datesSummary.innerHTML = '';
        selectedDates.sort().forEach(date => {
            const dateObj = new Date(date);
            const formattedDate = formatThaiDate(dateObj);
            
            const li = document.createElement('li');
            li.textContent = formattedDate;
            datesSummary.appendChild(li);
        });
    }
    
    // Show confirmation section
    document.getElementById('confirmation-section').style.display = 'block';
    document.getElementById('main-form').style.display = 'none';
}

// Handle confirmation
async function handleConfirm() {
    try {
        document.getElementById('confirm-btn').disabled = true;
        document.getElementById('confirm-btn').textContent = 'กำลังส่ง...';
        
        await submitLeaveRequest();
        
    } catch (error) {
        console.error('Submit error:', error);
        showError('เกิดข้อผิดพลาด: ' + error.message);
        
        document.getElementById('confirm-btn').disabled = false;
        document.getElementById('confirm-btn').textContent = 'ยืนยันการลา';
    }
}

// Submit leave request
async function submitLeaveRequest() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/submit-leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                studentId: studentData.student_id,
                dates: selectedDates,
                reason: document.getElementById('leave-reason').value || 'ลาป่วย'
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showSuccess();
        } else {
            throw new Error(result.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Handle back button
function handleBack() {
    document.getElementById('confirmation').style.display = 'none';
    document.getElementById('form-section').style.display = 'block';
}

// Show success message
function showSuccess() {
    document.getElementById('confirmation-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'block';
}

// Show error message
function showError(message) {
    document.getElementById('confirmation-section').style.display = 'none';
    document.getElementById('error-section').style.display = 'block';
    
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

// Go back to form
function goBackToForm() {
    document.getElementById('confirmation-section').style.display = 'none';
    document.getElementById('main-form').style.display = 'block';
}

// Retry submission
function retrySubmission() {
    document.getElementById('error-section').style.display = 'none';
    document.getElementById('confirmation-section').style.display = 'block';
}

// Show/hide loading
function showLoading(show) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = show ? 'flex' : 'none';
    }
}

// Format date to Thai format
function formatThaiDate(date) {
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    
    return `${day} ${month} ${year}`;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);