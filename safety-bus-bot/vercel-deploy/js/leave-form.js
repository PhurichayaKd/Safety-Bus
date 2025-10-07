// Leave Form JavaScript
// This file handles the leave request form functionality
console.log('🚀 leave-form.js script started loading...');
console.log('🔧 LEAVE-FORM.JS LOADED');
console.log('📍 Current URL:', window.location.href);
console.log('📍 Document ready state:', document.readyState);

let supabase;
let studentData = null;
let userId = null; // Store LINE user ID
let selectedDates = []; // Store selected leave dates
let loadingScreen = null;
let mainForm = null;

console.log('📋 Global variables initialized');

// Initialize the application
async function initializeApp() {
    console.log('🚀 Starting app initialization...');
    console.log('🔍 LIFF object available:', typeof window.liff !== 'undefined');
    
    // DOM elements are now initialized in DOMContentLoaded
    
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        console.log('✅ Loading screen shown');
    } else {
        console.warn('⚠️ Loading screen element not found');
    }
    
    if (mainForm) {
        mainForm.style.display = 'none';
        console.log('✅ Main form hidden');
    } else {
        console.warn('⚠️ Main form element not found');
    }
    
    // Try to get userId from URL parameters first (for direct links)
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');
    const studentName = urlParams.get('studentName');
    
    if (studentId && studentName) {
        console.log('📋 Found URL parameters, using direct mode');
        userId = `fallback-${studentId}`;
        // Pre-populate student data from URL
        studentData = {
            student: {
                student_id: studentId,
                student_name: decodeURIComponent(studentName),
                name: decodeURIComponent(studentName),
                class: urlParams.get('class') ? decodeURIComponent(urlParams.get('class')) : 'ไม่ระบุ'
            }
        };
        console.log('✅ Using URL parameters for student data:', studentData);
    } else {
        // Try LIFF only if no URL parameters
        try {
            console.log('🔧 No URL parameters found, trying LIFF...');
            const liffId = document.querySelector('meta[name="liff-id"]')?.getAttribute('content') || '2008065330-AXGy9xda';
            console.log('🔧 Using LIFF ID:', liffId);
            await window.liff.init({ liffId: liffId });
            
            if (window.liff.isLoggedIn()) {
                console.log('✅ User is logged in to LIFF');
                const profile = await window.liff.getProfile();
                userId = profile.userId;
                console.log('👤 User profile:', profile);
            } else {
                console.log('❌ User not logged in to LIFF, using fallback mode...');
                // Don't redirect to login, use fallback instead
                userId = 'anonymous-user';
            }
        } catch (liffError) {
            console.error('❌ LIFF initialization failed:', liffError);
            console.log('🧪 Using fallback mode...');
            userId = 'anonymous-user';
        }
    }
    
    try {

        console.log('📊 Loading student data...');
        
        // If we already have student data from URL parameters, use it
        if (studentData && studentData.student) {
            console.log('✅ Using pre-populated student data from URL');
            updateStudentInfo(studentData.student);
            initializeForm();
        } else {
            // Add timeout for loading student data
            const loadingPromise = loadStudentData(userId);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('การโหลดข้อมูลใช้เวลานานเกินไป')), 10000);
            });
            
            await Promise.race([loadingPromise, timeoutPromise]);
        }

        console.log('🎛️ Initializing form...');
        // Initialize form
        initializeForm();

        // Hide loading screen
        console.log('✅ App initialization complete');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainForm) mainForm.style.display = 'block';

    } catch (error) {
        console.error('❌ Initialization error:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Hide loading screen even on error
        if (loadingScreen) loadingScreen.style.display = 'none';
        
        // Show detailed error message
        const errorMessage = error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        console.error('❌ Showing error to user:', errorMessage);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + errorMessage);
    }
}

// Load student data from API
async function loadStudentData(userId) {
    try {
        console.log('📡 Loading student data for userId:', userId);
        
        const requestBody = {
            action: 'getStudentInfo',
            userId: userId
        };
        
        console.log('📤 Sending request:', requestBody);
        
        const response = await fetch('/api/submit-leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error response:', errorText);
            throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📊 Student data result:', result);
        console.log('📊 Result type:', typeof result);
        console.log('📊 Result.type:', result.type);
        console.log('📊 Result.student:', result.student);
        
        if (result && result.student) {
            studentData = result.student;
            console.log('✅ Student data loaded:', studentData);
            
            // Update UI with student data
            updateStudentInfo(studentData);
        } else {
            console.error('❌ Invalid student data response:', result);
            console.error('❌ Expected format: { type: "student", student: {...} }');
            console.error('❌ Received format:', JSON.stringify(result, null, 2));
            throw new Error('ไม่พบข้อมูลนักเรียน - ระบบตอบกลับข้อมูลไม่ถูกต้อง');
        }
        
    } catch (error) {
        console.error('❌ Error loading student data:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            userId: userId,
            name: error.name
        });
        
        // Re-throw with more context
        if (error.message.includes('HTTP Error')) {
            throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (' + error.message + ')');
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error('ไม่สามารถเชื่อมต่อเครือข่ายได้');
        } else if (error.name === 'SyntaxError') {
            throw new Error('เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง (JSON Parse Error)');
        } else {
            throw error;
        }
    }
}

// Update student info in UI
function updateStudentInfo(student) {
    const nameElement = document.getElementById('student-name');
    const codeElement = document.getElementById('student-code');
    const classElement = document.getElementById('student-class');
    
    if (nameElement) nameElement.textContent = student.name || student.student_name || '-';
    if (codeElement) codeElement.textContent = student.student_id || '-';
    if (classElement) classElement.textContent = student.class || '-';
}

// Initialize form elements
function initializeForm() {
    // Add event listeners with null checks
    const addDateBtn = document.getElementById('add-date-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const finalConfirmBtn = document.getElementById('final-confirm-btn');
    const backBtn = document.getElementById('back-btn');
    const retryBtn = document.getElementById('retry-btn');
    const leaveDateInput = document.getElementById('leave-date');
    
    if (addDateBtn) addDateBtn.addEventListener('click', handleAddDate);
    if (confirmBtn) confirmBtn.addEventListener('click', handleSubmit);
    if (finalConfirmBtn) finalConfirmBtn.addEventListener('click', handleConfirm);
    if (backBtn) backBtn.addEventListener('click', handleBack);
    if (retryBtn) retryBtn.addEventListener('click', handleRetry);
    
    // Set minimum date to today
    if (leaveDateInput) {
        const today = new Date().toISOString().split('T')[0];
        leaveDateInput.min = today;
    }
}

// Handle adding a date
function handleAddDate() {
    const dateInput = document.getElementById('leave-date');
    if (!dateInput) {
        console.error('Date input element not found');
        return;
    }
    
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
    if (!datesContainer) {
        console.error('Dates container element not found');
        return;
    }
    
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
    const submitBtn = document.getElementById('confirm-btn'); // Fixed: use correct ID
    if (submitBtn) {
        submitBtn.disabled = selectedDates.length === 0;
    }
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
    const confirmStudentName = document.getElementById('confirm-student-name');
    const confirmStudentCode = document.getElementById('confirm-student-code');
    const confirmStudentClass = document.getElementById('confirm-student-class');
    
    if (confirmStudentName) confirmStudentName.textContent = studentData?.name || studentData?.student_name || '-';
    if (confirmStudentCode) confirmStudentCode.textContent = studentData?.student_id || '-';
    if (confirmStudentClass) confirmStudentClass.textContent = studentData?.class || '-';
    
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
    const confirmationSection = document.getElementById('confirmation-section');
    const mainForm = document.getElementById('main-form');
    
    if (confirmationSection) confirmationSection.style.display = 'block';
    if (mainForm) mainForm.style.display = 'none';
}

// Handle confirmation
async function handleConfirm() {
    try {
        const confirmBtn = document.getElementById('final-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'กำลังส่ง...';
        }
        
        await submitLeaveRequest();
        
    } catch (error) {
        console.error('Submit error:', error);
        showError('เกิดข้อผิดพลาด: ' + error.message);
        
        const confirmBtn = document.getElementById('final-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'ยืนยันส่งข้อมูล';
        }
    }
}

// Submit leave request
async function submitLeaveRequest() {
    try {
        showLoading(true);
        
        // Validate required data before sending
        if (!userId) {
            throw new Error('ไม่พบข้อมูล User ID');
        }
        
        if (!studentData) {
            throw new Error('ไม่พบข้อมูลนักเรียน');
        }
        
        if (!selectedDates || selectedDates.length === 0) {
            throw new Error('กรุณาเลือกวันที่ลา');
        }
        
        console.log('Sending leave request with data:', {
            action: 'submitLeave',
            userId: userId,
            studentInfo: {
                student_id: studentData.student_id,
                student_name: studentData.name,
                name: studentData.name,
                class: studentData.class
            },
            leaveDates: selectedDates,
            source: 'direct'
        });
        
        const response = await fetch('/api/submit-leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'submitLeave',
                userId: userId,
                studentInfo: {
                    student_id: studentData.student_id,
                    student_name: studentData.name,
                    name: studentData.name,
                    class: studentData.class
                },
                leaveDates: selectedDates,
                source: 'direct'
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        // Check if response is ok
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        // Try to parse JSON response
        let result;
        try {
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            throw new Error('เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ไม่ถูกต้อง');
        }
        
        console.log('Parsed result:', result);
        
        if (result && result.ok) {
            showSuccess();
        } else {
            throw new Error(result?.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showError(error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    } finally {
        showLoading(false);
    }
}

// Handle back button
function handleBack() {
    const confirmationSection = document.getElementById('confirmation-section');
    const mainForm = document.getElementById('main-form');
    
    if (confirmationSection) confirmationSection.style.display = 'none';
    if (mainForm) mainForm.style.display = 'block';
}

// Show success message
function showSuccess() {
    const confirmationSection = document.getElementById('confirmation-section');
    const successSection = document.getElementById('success-section');
    
    if (confirmationSection) confirmationSection.style.display = 'none';
    if (successSection) successSection.style.display = 'block';
}

// Show error message
function showError(message) {
    const confirmationSection = document.getElementById('confirmation-section');
    const errorSection = document.getElementById('error-section');
    const mainForm = document.getElementById('main-form');
    
    if (confirmationSection) confirmationSection.style.display = 'none';
    if (mainForm) mainForm.style.display = 'none';
    if (errorSection) errorSection.style.display = 'block';
    
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

// Go back to form
function goBackToForm() {
    const confirmationSection = document.getElementById('confirmation-section');
    const mainForm = document.getElementById('main-form');
    const errorSection = document.getElementById('error-section');
    
    if (confirmationSection) confirmationSection.style.display = 'none';
    if (errorSection) errorSection.style.display = 'none';
    if (mainForm) mainForm.style.display = 'block';
}

// Retry submission
function retrySubmission() {
    const errorSection = document.getElementById('error-section');
    const confirmationSection = document.getElementById('confirmation-section');
    
    if (errorSection) errorSection.style.display = 'none';
    if (confirmationSection) confirmationSection.style.display = 'block';
}

// Handle retry button click
function handleRetry() {
    retrySubmission();
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
console.log('📋 Setting up DOMContentLoaded listener...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOMContentLoaded event fired!');
    
    // Initialize DOM elements first
    console.log('🔍 Searching for DOM elements...');
    loadingScreen = document.getElementById('loading-screen');
    mainForm = document.getElementById('main-form');
    
    console.log('🔍 DOM Elements check:');
    console.log('- loading-screen:', loadingScreen);
    console.log('- main-form:', mainForm);
    
    if (!loadingScreen) {
        console.warn('⚠️ loading-screen element not found!');
    } else {
        console.log('✅ loading-screen element found');
    }
    if (!mainForm) {
        console.warn('⚠️ main-form element not found!');
    } else {
        console.log('✅ main-form element found');
    }
    
    initializeApp();
});