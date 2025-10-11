// Leave Form JavaScript Functions
console.log('🚀 Leave Form JS loaded');

// Global variables
let liffInitialized = false;
let studentData = {};

// Initialize LIFF
async function initializeLiff() {
    try {
        console.log('🔄 Initializing LIFF...');
        await liff.init({ liffId: '2008065330-AXGy9xda' });
        liffInitialized = true;
        console.log('✅ LIFF initialized successfully');
        
        // Check if user is logged in
        if (!liff.isLoggedIn()) {
            console.log('🔐 User not logged in, redirecting to login...');
            liff.login();
            return;
        }
        
        // Get user profile
        const profile = await liff.getProfile();
        console.log('👤 User profile:', profile);
        
        // Load student data from URL parameters
        loadStudentDataFromUrl();
        
    } catch (error) {
        console.error('❌ LIFF initialization failed:', error);
        showErrorMessage('ไม่สามารถเชื่อมต่อกับ LINE ได้');
    }
}

// Get URL parameters
function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        studentId: urlParams.get('studentId'),
        studentName: urlParams.get('studentName'),
        studentClass: urlParams.get('class')
    };
}

// Load student data from URL
function loadStudentDataFromUrl() {
    const params = getUrlParams();
    console.log('📋 URL Parameters:', params);
    
    if (params.studentId && params.studentName) {
        studentData = {
            studentId: params.studentId,
            studentName: decodeURIComponent(params.studentName),
            studentClass: params.studentClass ? decodeURIComponent(params.studentClass) : 'ไม่ระบุ'
        };
        
        console.log('👤 Student data loaded:', studentData);
    } else {
        console.warn('⚠️ No student data in URL parameters, using default data');
        // Use default data for testing
        studentData = {
            studentId: '100011',
            studentName: 'ด.ญ กุรุษญา ญา',
            studentClass: 'ป.4/5'
        };
    }
    
    updateStudentInfo();
    showMainForm();
}

// Update student information in UI
function updateStudentInfo() {
    const elements = {
        'student-name': studentData.studentName,
        'student-id': studentData.studentId,
        'student-class': studentData.studentClass,
        'confirm-student-name': studentData.studentName,
        'confirm-student-id': studentData.studentId,
        'confirm-student-class': studentData.studentClass
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || '-';
        }
    });
}

// Show main form
function showMainForm() {
    console.log('📱 Showing main form...');
    
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        console.log('✅ Loading screen hidden');
    }
    
    // Show main form
    const mainForm = document.getElementById('main-form');
    if (mainForm) {
        mainForm.style.display = 'block';
        console.log('✅ Main form displayed');
    }
}

// Show error message
function showErrorMessage(message) {
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    
    if (errorSection && errorMessage) {
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
    } else {
        alert(message);
    }
}

// Show success message
function showSuccessMessage(message) {
    const successSection = document.getElementById('success-section');
    if (successSection) {
        successSection.style.display = 'block';
        
        // Auto close after 3 seconds
        let countdown = 3;
        const countdownElement = document.getElementById('countdown');
        
        const timer = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(timer);
                if (liffInitialized) {
                    liff.closeWindow();
                }
            }
        }, 1000);
    }
}

// Date picker functions
function setupDatePicker() {
    const leaveDateInput = document.getElementById('leave-date');
    const addDateBtn = document.getElementById('add-date-btn');
    const datesContainer = document.getElementById('dates-container');
    const confirmBtn = document.getElementById('confirm-btn');
    
    let selectedDates = [];
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    if (leaveDateInput) {
        leaveDateInput.min = today;
    }
    
    // Add date button click handler
    if (addDateBtn) {
        addDateBtn.addEventListener('click', function() {
            const selectedDate = leaveDateInput.value;
            
            if (!selectedDate) {
                alert('กรุณาเลือกวันที่');
                return;
            }
            
            if (selectedDates.includes(selectedDate)) {
                alert('วันที่นี้ถูกเลือกแล้ว');
                return;
            }
            
            selectedDates.push(selectedDate);
            updateDatesDisplay();
            leaveDateInput.value = '';
            updateConfirmButton();
        });
    }
    
    // Update dates display
    function updateDatesDisplay() {
        if (!datesContainer) return;
        
        if (selectedDates.length === 0) {
            datesContainer.innerHTML = '<p class="no-dates">ยังไม่ได้เลือกวันที่</p>';
        } else {
            const datesHtml = selectedDates.map(date => {
                const dateObj = new Date(date);
                const formattedDate = dateObj.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                return `
                    <div class="selected-date">
                        <span>${formattedDate}</span>
                        <button type="button" class="remove-date" data-date="${date}">✕</button>
                    </div>
                `;
            }).join('');
            
            datesContainer.innerHTML = datesHtml;
            
            // Add remove date handlers
            datesContainer.querySelectorAll('.remove-date').forEach(btn => {
                btn.addEventListener('click', function() {
                    const dateToRemove = this.getAttribute('data-date');
                    selectedDates = selectedDates.filter(date => date !== dateToRemove);
                    updateDatesDisplay();
                    updateConfirmButton();
                });
            });
        }
    }
    
    // Update confirm button state
    function updateConfirmButton() {
        if (confirmBtn) {
            confirmBtn.disabled = selectedDates.length === 0;
        }
    }
    
    // Return selected dates for form submission
    window.getSelectedDates = function() {
        return selectedDates;
    };
}

// Form submission
function setupFormSubmission() {
    const confirmBtn = document.getElementById('confirm-btn');
    const finalConfirmBtn = document.getElementById('final-confirm-btn');
    const backBtn = document.getElementById('back-btn');
    const retryBtn = document.getElementById('retry-btn');
    
    // Confirm button - show confirmation section
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const selectedDates = window.getSelectedDates ? window.getSelectedDates() : [];
            
            if (selectedDates.length === 0) {
                alert('กรุณาเลือกวันที่แจ้งลา');
                return;
            }
            
            // Update confirmation display
            updateConfirmationDisplay(selectedDates);
            
            // Show confirmation section
            document.getElementById('main-form').style.display = 'none';
            document.getElementById('confirmation-section').style.display = 'block';
        });
    }
    
    // Final confirm button - submit form
    if (finalConfirmBtn) {
        finalConfirmBtn.addEventListener('click', async function() {
            const selectedDates = window.getSelectedDates ? window.getSelectedDates() : [];
            await submitLeaveRequest(selectedDates);
        });
    }
    
    // Back button - return to main form
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            document.getElementById('confirmation-section').style.display = 'none';
            document.getElementById('main-form').style.display = 'block';
        });
    }
    
    // Retry button - hide error and show main form
    if (retryBtn) {
        retryBtn.addEventListener('click', function() {
            document.getElementById('error-section').style.display = 'none';
            document.getElementById('main-form').style.display = 'block';
        });
    }
}

// Update confirmation display
function updateConfirmationDisplay(selectedDates) {
    const confirmDatesContainer = document.getElementById('confirm-dates');
    
    if (confirmDatesContainer && selectedDates.length > 0) {
        const datesHtml = selectedDates.map(date => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            return `<div class="confirm-date-item">${formattedDate}</div>`;
        }).join('');
        
        confirmDatesContainer.innerHTML = datesHtml;
    }
}

// Submit leave request
async function submitLeaveRequest(selectedDates) {
    try {
        console.log('📤 Submitting leave request...');
        
        const requestData = {
            studentId: studentData.studentId,
            studentName: studentData.studentName,
            studentClass: studentData.studentClass,
            dates: selectedDates,
            submittedAt: new Date().toISOString()
        };
        
        console.log('📋 Request data:', requestData);
        
        const response = await fetch('/api/submit-leave-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        console.log('📨 Response:', result);
        
        if (result.success) {
            // Hide confirmation section
            document.getElementById('confirmation-section').style.display = 'none';
            
            // Show success message
            showSuccessMessage('ส่งข้อมูลการลาเรียบร้อยแล้ว');
        } else {
            throw new Error(result.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
        }
        
    } catch (error) {
        console.error('❌ Error submitting leave request:', error);
        
        // Hide confirmation section
        document.getElementById('confirmation-section').style.display = 'none';
        
        // Show error message
        showErrorMessage('เกิดข้อผิดพลาด: ' + error.message);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing leave form...');
    
    // Setup date picker
    setupDatePicker();
    
    // Setup form submission
    setupFormSubmission();
    
    // Initialize LIFF
    if (typeof liff !== 'undefined') {
        initializeLiff();
    } else {
        console.warn('⚠️ LIFF SDK not available, running in fallback mode');
        loadStudentDataFromUrl();
    }
});

// Export functions for global access
window.initializeLiff = initializeLiff;
window.loadStudentDataFromUrl = loadStudentDataFromUrl;
window.showErrorMessage = showErrorMessage;
window.showSuccessMessage = showSuccessMessage;