import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const DRIVER_ID = 1; // สมชาย คนขับ

// Test scenarios that match driver app buttons
const testScenarios = [
  {
    name: '🚌 เริ่มออกเดินทาง (Start Trip)',
    trip_phase: 'go',
    current_status: 'active',
    description: 'คนขับกดปุ่ม "เริ่มออกเดินทาง" ในแอป'
  },
  {
    name: '🏫 ถึงโรงเรียน (Arrived at School)', 
    trip_phase: 'go',
    current_status: 'inactive',
    description: 'คนขับกดปุ่ม "ถึงโรงเรียน" ในแอป'
  },
  {
    name: '⏰ รอรับกลับบ้าน (Waiting for Return)',
    trip_phase: 'return', 
    current_status: 'active',
    description: 'คนขับกดปุ่ม "รอรับกลับบ้าน" ในแอป'
  },
  {
    name: '🏠 จบการเดินทาง (Finished Trip)',
    trip_phase: 'return',
    current_status: 'inactive', 
    description: 'คนขับกดปุ่ม "จบการเดินทาง" ในแอป'
  }
];

async function testDriverStatusUpdate(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`📊 Data: trip_phase="${scenario.trip_phase}", current_status="${scenario.current_status}"`);
  console.log(`${'='.repeat(60)}`);

  try {
    const response = await axios.post(`${API_BASE_URL}/api/driver-status-notification`, {
      driver_id: DRIVER_ID,
      trip_phase: scenario.trip_phase,
      current_status: scenario.current_status,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📋 Response Headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`📄 Raw Response:`, JSON.stringify(response.data, null, 0));
    
    if (response.data) {
      console.log(`✅ Parsed JSON:`, JSON.stringify(response.data, null, 2));
      
      // Analyze notification results
      if (response.data.notification_results) {
        const results = response.data.notification_results;
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;
        
        console.log(`\n📈 Notification Summary:`);
        console.log(`   ✅ Successful: ${successful}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📊 Total: ${results.length}`);
        
        if (response.data.summary) {
          console.log(`\n📋 Detailed Summary:`);
          console.log(`   👥 Students notified: ${response.data.summary.students_notified || 0}`);
          console.log(`   👨‍👩‍👧‍👦 Parents notified: ${response.data.summary.parents_notified || 0}`);
          console.log(`   📱 Total sent: ${response.data.summary.total_sent || 0}`);
          console.log(`   ⚠️ Total failed: ${response.data.summary.total_failed || 0}`);
        }
        
        // Show individual notification results
        if (results.length > 0) {
          console.log(`\n📱 Individual Notification Results:`);
          results.forEach((result, index) => {
            const statusIcon = result.status === 'success' ? '✅' : '❌';
            console.log(`   ${index + 1}. ${statusIcon} ${result.type}: ${result.lineUserId}`);
            if (result.error) {
              console.log(`      Error: ${result.error}`);
            }
          });
        }
      }
    }

    return { success: true, data: response.data };

  } catch (error) {
    console.log(`❌ Error occurred:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log(`   No response received:`, error.message);
    } else {
      console.log(`   Request error:`, error.message);
    }
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log(`🚀 Starting Driver App Status Update Tests`);
  console.log(`🎯 Target API: ${API_BASE_URL}/api/driver-status-notification`);
  console.log(`👤 Driver ID: ${DRIVER_ID}`);
  console.log(`📅 Test Time: ${new Date().toLocaleString('th-TH')}`);
  
  const results = [];
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    const result = await testDriverStatusUpdate(scenario);
    results.push({ scenario: scenario.name, ...result });
    
    // Wait between tests to avoid rate limiting
    if (i < testScenarios.length - 1) {
      console.log(`\n⏳ Waiting 2 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Final summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 FINAL TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful tests: ${successful}/${results.length}`);
  console.log(`❌ Failed tests: ${failed}/${results.length}`);
  
  results.forEach((result, index) => {
    const statusIcon = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${statusIcon} ${result.scenario}`);
  });
  
  console.log(`\n🎯 Test completed at: ${new Date().toLocaleString('th-TH')}`);
  console.log(`${'='.repeat(80)}`);
}

// Run the tests
runAllTests().catch(console.error);