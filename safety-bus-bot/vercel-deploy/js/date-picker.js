// Enhanced LIFF App JavaScript
let liff;
let selectedDates = [];
let studentInfo = null;
let currentSection = 'loading'; // loading, student-info, date-selection, confirmation, success, error

// Initialize LIFF
function initializeLIFF() {
    // Get LIFF ID from meta tag or use environment variable
    const liffId = document.querySelector('meta[name="liff-id"]')?.content || '2008065330-AXGy9xda';
    
    console.log('Initializing LIFF with ID:', liffId);
    
    liff.init({
        liffId: liffId
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

// Get student information from LINE ID first, then URL parameters as fallback
function getStudentInfo() {
    // Check if mock student info is already available (for testing)
    if (window.studentInfo) {
        console.log('Using mock student info:', window.studentInfo);
        studentInfo = window.studentInfo;
        showStudentInfoSection();
        return;
    }

    // Primary method: Get from LINE ID
    console.log('Getting student info from LINE profile...');
    liff.getProfile().then((profile) => {
        console.log('User profile:', profile);
        
        // Call API to get student info with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Use absolute URL for production
        const getStudentUrl = window.location.origin + '/api/get-student';
        console.log('Get student API URL:', getStudentUrl);
        
        return fetch(getStudentUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lineUserId: profile.userId
            }),
            signal: controller.signal
        }).finally(() => {
            clearTimeout(timeoutId);
        });
    }).then(response => {
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('ไม่พบข้อมูลนักเรียนในระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน');
            } else if (response.status >= 500) {
                throw new Error('เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้งในภายหลัง');
            } else {
                throw new Error(`เกิดข้อผิดพลาด (${response.status}) กรุณาลองใหม่อีกครั้ง`);
            }
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
        console.error('Error getting student info from LINE ID:', error);
        
        // Fallback: Try to get student info from URL parameters
        console.log('Trying fallback: URL parameters...');
        const urlParams = new URLSearchParams(window.location.search);
        const studentId = urlParams.get('studentId');
        const studentName = urlParams.get('studentName');
        
        if (studentId && studentName) {
            console.log('Using student info from URL parameters:', { studentId, studentName });
            studentInfo = {
                student_id: studentId,
                student_name: decodeURIComponent(studentName),
                link_code: studentId
            };
            showStudentInfoSection();
            return;
        }
        
        // If both methods fail, show error
        let errorMessage;
        if (error.name === 'AbortError') {
            errorMessage = 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
        } else {
            errorMessage = error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง';
        }
        
        showErrorSection(errorMessage);
    });
}

// Show different sections
function showSection(sectionName) {
    console.log('=== showSection called ===');
    console.log('Showing section:', sectionName);
    
    // Hide all sections
    const sections = ['loading-screen', 'main-form', 'confirmation-section', 'success-section', 'error-section'];
    console.log('Found sections:', sections.length);
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    console.log('Target section found:', targetSection);
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log('Section displayed successfully:', sectionName);
    } else {
        console.error('Target section not found:', sectionName);
    }
    
    currentSection = sectionName.replace('-section', '').replace('-screen', '');
}

function showStudentInfoSection() {
    if (studentInfo) {
        document.getElementById('student-name').textContent = studentInfo.student_name || studentInfo.name || '-';
        document.getElementById('student-code').textContent = studentInfo.link_code || '-';
    }
    showSection('main-form');
}

function showDateSelectionSection() {
    showSection('main-form');
    setupDatePicker();
}

function showConfirmationSection() {
    // Update confirmation details
    document.getElementById('confirm-student-name').textContent = studentInfo.student_name || studentInfo.name || '-';
    document.getElementById('confirm-student-code').textContent = studentInfo.link_code || '-';
    
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
    console.log('=== showSuccessSection called ===');
    showSection('success-section');
    
    // Start countdown
    let countdown = 3;
    const countdownElement = document.getElementById('countdown');
    console.log('Countdown element found:', countdownElement);
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            // ใช้การตรวจสอบเดียวกับในส่วนอื่นๆ
            const isLiffReady = liff && liff.isLoggedIn();
            if (isLiffReady && liff.isInClient()) {
                console.log('Closing LIFF window after countdown...');
                liff.closeWindow();
            } else if (isLiffReady) {
                console.log('Closing LIFF window (not in client) after countdown...');
                liff.closeWindow();
            } else {
                console.log('LIFF not available, window will remain open for testing');
            }
        }
    }, 1000);
}

function showErrorSection(message) {
    document.getElementById('error-message').textContent = message;
    showSection('error-section');
}

// Date picker functionality
function setupDatePicker() {
    const dateInput = document.getElementById('leave-date');
    
    // Check if dateInput exists before setting properties
    if (!dateInput) {
        console.warn('Date input element not found');
        return;
    }
    
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
    const dateInput = document.getElementById('leave-date');
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
    const container = document.getElementById('selected-dates-list');
    
    if (!container) {
        console.warn('Selected dates container not found');
        return;
    }
    
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
    const addButton = document.getElementById('add-date-btn');
    const dateInput = document.getElementById('leave-date');
    
    if (!addButton) {
        console.warn('Add button not found');
        return;
    }
    
    if (selectedDates.length >= 3) {
        addButton.disabled = true;
        addButton.textContent = 'เลือกครบ 3 วันแล้ว';
        if (dateInput) {
            dateInput.disabled = true;
        }
    } else {
        addButton.disabled = false;
        addButton.textContent = '+ เพิ่มวัน';
        if (dateInput) {
            dateInput.disabled = false;
        }
    }
}

// Update confirm button state
function updateConfirmButton() {
    const confirmButton = document.getElementById('confirm-btn');
    
    if (!confirmButton) {
        console.warn('Confirm button not found');
        return;
    }
    
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
    console.log('=== finalSubmitLeave called ===');
    
    console.log('Selected dates:', selectedDates);
    console.log('Student info:', studentInfo);
    
    // Check if LIFF is available and logged in
    const isLiffReady = liff && liff.isLoggedIn();
    console.log('LIFF ready status:', isLiffReady);
    
    if (!isLiffReady) {
        console.log('LIFF not ready, using mock data for testing');
    }
    
    if (!selectedDates || selectedDates.length === 0) {
        console.error('No dates selected');
        showErrorSection('กรุณาเลือกวันที่แจ้งลาก่อน');
        return;
    }
    
    if (!studentInfo) {
        console.error('No student info available');
        showErrorSection('ไม่พบข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง');
        return;
    }
    
    const finalConfirmButton = document.getElementById('final-confirm-btn');
    if (!finalConfirmButton) {
        console.error('Final confirm button not found');
        return;
    }
    
    finalConfirmButton.disabled = true;
    finalConfirmButton.innerHTML = '<span class="loading"></span>กำลังส่งข้อมูล...';
    
    console.log('Preparing leave data...');
    
    // Prepare leave data with profile info (real or mock)
    const prepareAndSubmit = (profile) => {
        console.log('User profile:', profile);
        
        const leaveData = {
            action: 'submitLeave',
            userId: profile.userId,
            displayName: profile.displayName,
            studentInfo: studentInfo, // Send as object, not stringified
            leaveDates: selectedDates
        };
        
        console.log('Student info object:', studentInfo);
        console.log('Leave dates:', selectedDates);
        console.log('Leave data prepared:', leaveData);
        
        return submitLeaveRequest(leaveData);
    };
    
    // Get profile data (real or mock)
    const profilePromise = isLiffReady 
        ? liff.getProfile()
        : Promise.resolve({
            userId: 'test-user-123',
            displayName: studentInfo?.student_name || 'Test User'
          });
    
    profilePromise.then(prepareAndSubmit).then((response) => {
        console.log('Submit response:', response);
        
        if (response.success) {
            console.log('Leave request successful');
            console.log('Response data:', response.data);
            
            // Show success modal
            showSuccessModal('✅ ส่งข้อมูลสำเร็จ!', 'ข้อมูลการลาได้ถูกบันทึกเรียบร้อยแล้ว');
            
            showSuccessSection();
            
            // Close LIFF window immediately after success (only if LIFF is available)
            setTimeout(() => {
                if (isLiffReady && liff.isInClient()) {
                    console.log('Closing LIFF window...');
                    liff.closeWindow();
                } else if (isLiffReady) {
                    console.log('Closing LIFF window (not in client)...');
                    liff.closeWindow();
                } else {
                    console.log('LIFF not available, window will remain open for testing');
                }
            }, 2000);
        } else {
            console.error('Leave request failed:', response.message);
            console.error('Full response:', response);
            throw new Error(response.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
        }
    }).catch((error) => {
        console.error('Error submitting leave:', error);
        
        // Show error modal
        showErrorModal('❌ เกิดข้อผิดพลาด!', error.message || 'ไม่สามารถส่งข้อมูลได้');
        
        showErrorSection(error.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    }).finally(() => {
        console.log('Resetting button state');
        finalConfirmButton.disabled = false;
        finalConfirmButton.innerHTML = 'ยืนยันการส่งข้อมูล';
    });
}

// Submit leave request via API endpoint
function submitLeaveRequest(data) {
    console.log('=== submitLeaveRequest called ===');
    console.log('Input data:', data);
    
    // Submit via API endpoint with new format
    return submitViaAPI({
        action: 'submitLeave',
        userId: data.userId,
        displayName: data.displayName,
        studentInfo: data.studentInfo, // Send as object directly
        leaveDates: data.leaveDates,
        source: 'direct'
    });
}

// Function to submit data via API endpoint
async function submitViaAPI(requestData) {
    console.log('=== submitViaAPI called ===');
    console.log('Request data:', requestData);
    
    try {
        console.log('Sending request to /api/submit-leave...');
        
        // Use absolute URL for production
        const apiUrl = window.location.origin + '/api/submit-leave';
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Raw response:', response);
        console.log('Response headers:', response.headers);
        
        console.log('API response status:', response.status);
        console.log('API response ok:', response.ok);
        
        const result = await response.json();
        console.log('API response data:', result);
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        if (result.ok || result.success) {
            console.log('API request successful');
            return {
                success: true,
                message: result.message || 'แจ้งลาสำเร็จ',
                data: result.data
            };
        } else {
            throw new Error(result.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
        }
        
    } catch (error) {
        console.error('Error submitting via API:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล'
        };
    }
}

// Navigation functions
function goToDateSelection() {
    // Show date selection card instead of looking for date-selection id
    const dateCard = document.querySelector('.date-selection-card');
    if (dateCard) {
        dateCard.style.display = 'block';
        console.log('Date selection card displayed successfully');
    } else {
        console.error('Date selection card not found');
    }
}

function goBackToDateSelection() {
    // Show date selection card instead of looking for date-selection id
    const dateCard = document.querySelector('.date-selection-card');
    if (dateCard) {
        dateCard.style.display = 'block';
        console.log('Date selection card displayed successfully');
    } else {
        console.error('Date selection card not found');
    }
}

function retryConnection() {
    console.log('Retrying connection...');
    showSection('loading-screen');
    currentSection = 'loading';
    
    // Reset variables
    selectedDates = [];
    studentInfo = null;
    
    // Wait a bit before retrying
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
    console.log('Page loaded, checking URL parameters...');
    
    // Show loading screen initially
    showSection('loading-screen');
    
    // Check if student info is provided via URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');
    const studentName = urlParams.get('studentName');
    
    if (studentId && studentName) {
        console.log('Using student info from URL parameters:', { studentId, studentName });
        // Use student info from URL parameters directly
        studentInfo = {
            student_id: studentId,
            student_name: decodeURIComponent(studentName),
            link_code: studentId
        };
        
        // Add event listeners
        setupEventListeners();
        
        // Show student info section directly
        showStudentInfoSection();
    } else {
        // Fallback to LIFF if no URL parameters
        console.log('No URL parameters found, initializing LIFF...');
        waitForLIFF();
    }
});

// Function to setup event listeners
function setupEventListeners() {
    const proceedBtn = document.getElementById('proceed-btn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', goToDateSelection);
    }
    
    const addDateBtn = document.getElementById('add-date-btn');
    if (addDateBtn) {
        addDateBtn.addEventListener('click', addDate);
    }
    
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmLeave);
    }
    
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', goBackToDateSelection);
    }
    
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelLeave);
    }
    
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', retryConnection);
    }
    
    const finalConfirmBtn = document.getElementById('final-confirm-btn');
    if (finalConfirmBtn) {
        finalConfirmBtn.addEventListener('click', finalSubmitLeave);
    }
    
    // Setup date picker
    setupDatePicker();
}

// Function to wait for LIFF SDK to load
function waitForLIFF() {
    if (typeof window.liff === 'undefined') {
        console.log('Waiting for LIFF SDK to load...');
        setTimeout(waitForLIFF, 100); // Check again after 100ms
        return;
    }
    
    console.log('LIFF SDK loaded successfully');
    liff = window.liff;
    
    // Add event listeners
    setupEventListeners();
    
    // Initialize LIFF
    initializeLIFF();
}


// Handle LIFF errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (currentSection === 'loading') {
        showErrorSection('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ กรุณาลองใหม่อีกครั้ง');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Function to show success modal
function showSuccessModal(title, message) {
    console.log('🎉 showSuccessModal called with:', { title, message });
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Sarabun', sans-serif;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 320px;
        width: 90%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <h3 style="color: #28a745; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">${title}</h3>
        <p style="color: #666; margin: 0 0 20px 0; font-size: 14px; line-height: 1.4;">${message}</p>
        <button onclick="closeSuccessModal(this)" style="
            background: #28a745;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        ">ตกลง</button>
    `;
    
    overlay.className = 'modal-overlay';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Add CSS animation
    if (!document.querySelector('#modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto close after 3 seconds
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, 3000);
}

// Function to close success modal and LIFF window
function closeSuccessModal(button) {
    // Remove the modal
    const overlay = button.closest('.modal-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Close LIFF window immediately
    if (liff && liff.isLoggedIn()) {
        console.log('Closing LIFF window from modal button...');
        liff.closeWindow();
    } else if (liff) {
        console.log('Closing LIFF window (not logged in) from modal button...');
        liff.closeWindow();
    } else {
        console.log('LIFF not available, cannot close window');
    }
}

// Function to show error modal
function showErrorModal(title, message) {
    console.log('❌ showErrorModal called with:', { title, message });
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Sarabun', sans-serif;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 320px;
        width: 90%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
        <h3 style="color: #dc3545; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">${title}</h3>
        <p style="color: #666; margin: 0 0 20px 0; font-size: 14px; line-height: 1.4;">${message}</p>
        <button onclick="this.closest('.modal-overlay').remove()" style="
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        ">ตกลง</button>
    `;
    
    overlay.className = 'modal-overlay';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, 5000);
 }