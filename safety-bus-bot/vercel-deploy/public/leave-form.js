// Leave Form JavaScript
let selectedDates = [];
let studentData = null;

// Initialize the form when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeLIFF();
});

// Initialize LIFF
async function initializeLIFF() {
    try {
        await liff.init({ liffId: '2006583433-Ej7Aw8Vy' });
        
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            await loadStudentData(profile.userId);
        } else {
            liff.login();
        }
    } catch (error) {
        console.error('LIFF initialization failed:', error);
        showError('ไม่สามารถเชื่อมต่อกับ LINE ได้');
    }
}

// Load student data from API
async function loadStudentData(lineUserId) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/get-student?line_user_id=${lineUserId}`);
        const data = await response.json();
        
        if (data.success && data.student) {
            studentData = data.student;
            displayStudentInfo(studentData);
            enableForm();
        } else {
            showError('ไม่พบข้อมูลนักเรียน กรุณาติดต่อเจ้าหน้าที่');
        }
    } catch (error) {
        console.error('Error loading student data:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
        showLoading(false);
    }
}

// Display student information
function displayStudentInfo(student) {
    document.getElementById('studentName').textContent = student.name;
    document.getElementById('studentId').textContent = student.student_id;
    document.getElementById('studentClass').textContent = student.class;
}



// Add date selection
function addDate() {
    if (selectedDates.length >= 3) {
        showError('สามารถเลือกได้สูงสุด 3 วัน');
        return;
    }

    const dateContainer = document.getElementById('dateContainer');
    const dateIndex = selectedDates.length;
    
    const dateDiv = document.createElement('div');
    dateDiv.className = 'date-input-group';
    dateDiv.innerHTML = `
        <label for="date${dateIndex}">วันที่ ${dateIndex + 1}:</label>
        <input type="date" id="date${dateIndex}" name="date${dateIndex}" 
               min="${getTodayDate()}" onchange="updateSelectedDates(${dateIndex}, this.value)">
        <button type="button" onclick="removeDate(${dateIndex})" class="remove-btn">ลบ</button>
    `;
    
    dateContainer.appendChild(dateDiv);
    selectedDates.push('');
    
    // Hide add button if reached maximum
    if (selectedDates.length >= 3) {
        document.getElementById('addDateBtn').style.display = 'none';
    }
}

// Remove date selection
function removeDate(index) {
    const dateContainer = document.getElementById('dateContainer');
    const dateGroups = dateContainer.querySelectorAll('.date-input-group');
    
    if (dateGroups[index]) {
        dateGroups[index].remove();
    }
    
    selectedDates.splice(index, 1);
    
    // Re-render all date inputs to fix indices
    rerenderDateInputs();
    
    // Show add button if below maximum
    if (selectedDates.length < 3) {
        document.getElementById('addDateBtn').style.display = 'inline-block';
    }
}

// Re-render date inputs after removal
function rerenderDateInputs() {
    const dateContainer = document.getElementById('dateContainer');
    dateContainer.innerHTML = '';
    
    const tempDates = [...selectedDates];
    selectedDates = [];
    
    tempDates.forEach((date, index) => {
        addDate();
        if (date) {
            document.getElementById(`date${index}`).value = date;
            selectedDates[index] = date;
        }
    });
}

// Update selected dates array
function updateSelectedDates(index, value) {
    selectedDates[index] = value;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Submit leave request
async function submitLeaveRequest() {
    try {
        // Validate form
        const validDates = selectedDates.filter(date => date !== '');
        
        if (validDates.length === 0) {
            showError('กรุณาเลือกวันที่ลาอย่างน้อย 1 วัน');
            return;
        }

        // Check for duplicate dates
        const uniqueDates = [...new Set(validDates)];
        if (uniqueDates.length !== validDates.length) {
            showError('ไม่สามารถเลือกวันที่เดียวกันได้');
            return;
        }

        showLoading(true);

        const profile = await liff.getProfile();
        
        const requestData = {
            student_id: studentData.student_id,
            leave_dates: validDates,
            line_user_id: profile.userId
        };

        const response = await fetch('/api/submit-leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('ส่งคำขอลาเรียบร้อยแล้ว');
            resetForm();
        } else {
            showError(result.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
        }

    } catch (error) {
        console.error('Error submitting leave request:', error);
        showError('เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
        showLoading(false);
    }
}

// Reset form after successful submission
function resetForm() {
    selectedDates = [];
    document.getElementById('dateContainer').innerHTML = '';
    document.getElementById('addDateBtn').style.display = 'inline-block';
    
    // Add one date input by default
    addDate();
}

// Show loading state
function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    const formEl = document.getElementById('leaveForm');
    
    if (show) {
        loadingEl.style.display = 'block';
        formEl.style.opacity = '0.5';
        formEl.style.pointerEvents = 'none';
    } else {
        loadingEl.style.display = 'none';
        formEl.style.opacity = '1';
        formEl.style.pointerEvents = 'auto';
    }
}

// Show error message
function showError(message) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = 'message error';
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = 'message success';
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Enable form and add initial date input
function enableForm() {
    document.getElementById('leaveForm').style.display = 'block';
    document.getElementById('dateSection').style.display = 'block';
    document.getElementById('submitSection').style.display = 'block';
    
    // Add first date input
    addDate();
}