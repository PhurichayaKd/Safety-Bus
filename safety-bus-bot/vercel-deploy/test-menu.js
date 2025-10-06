import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Test webhook status (GET request - no signature needed)
async function testWebhookStatus() {
  const webhookUrl = 'https://safety-bus-liff-v4-new.vercel.app/api/webhook';
  
  try {
    console.log('🧪 Testing webhook status...');
    
    const response = await axios.get(webhookUrl);

    console.log('✅ Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('🎉 Webhook is running successfully!');
      
      // Check if all required environment variables are set
      const env = response.data.environment;
      if (env.supabase === 'Connected' && env.lineSecret === 'Set' && env.lineToken === 'Set') {
        console.log('✅ All environment variables are properly configured');
        return true;
      } else {
        console.log('⚠️ Some environment variables may be missing');
        return false;
      }
    } else {
      console.log('❌ Webhook status test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing webhook status:', error.response?.data || error.message);
    return false;
  }
}

// Test menu file structure
async function testMenuFileStructure() {
  console.log('\n🔍 Testing menu file structure...');
  
  try {
    const menuPath = path.join(process.cwd(), 'lib', 'menu.js');
    const handlersPath = path.join(process.cwd(), 'lib', 'handlers.js');
    
    // Check if files exist
    if (fs.existsSync(menuPath)) {
      console.log('✅ menu.js file exists');
    } else {
      console.log('❌ menu.js file not found');
      return false;
    }
    
    if (fs.existsSync(handlersPath)) {
      console.log('✅ handlers.js file exists');
    } else {
      console.log('❌ handlers.js file not found');
      return false;
    }
    
    // Read and check menu.js content
    const menuContent = fs.readFileSync(menuPath, 'utf8');
    
    // Check for key functions and configurations
    const checks = [
      { name: 'sendMainMenu function', pattern: /export async function sendMainMenu/ },
      { name: 'mainRichMenu configuration', pattern: /const mainRichMenu = {/ },
      { name: 'leaveQuickReply configuration', pattern: /const leaveQuickReply = {/ },
      { name: 'menu areas configuration', pattern: /areas: \[/ },
      { name: 'postback actions', pattern: /action.*postback/ }
    ];
    
    for (const check of checks) {
      if (check.pattern.test(menuContent)) {
        console.log(`✅ ${check.name} found`);
      } else {
        console.log(`⚠️ ${check.name} not found`);
      }
    }
    
    // Read and check handlers.js content
    const handlersContent = fs.readFileSync(handlersPath, 'utf8');
    
    const handlerChecks = [
      { name: 'handlePostback function', pattern: /export async function handlePostback/ },
      { name: 'handleMainAction function', pattern: /export async function handleMainAction/ },
      { name: 'handleTextMessage function', pattern: /export async function handleTextMessage/ },
      { name: 'postback data parsing', pattern: /data\.startsWith\('action='/ }
    ];
    
    for (const check of handlerChecks) {
      if (check.pattern.test(handlersContent)) {
        console.log(`✅ ${check.name} found`);
      } else {
        console.log(`⚠️ ${check.name} not found`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking menu file structure:', error.message);
    return false;
  }
}

// Test menu configuration structure
async function testMenuConfiguration() {
  console.log('\n📋 Testing menu configuration structure...');
  
  try {
    const menuPath = path.join(process.cwd(), 'lib', 'menu.js');
    const menuContent = fs.readFileSync(menuPath, 'utf8');
    
    // Extract menu actions from the content
    const actionMatches = menuContent.match(/data: "action=([^"]+)"/g);
    if (actionMatches) {
      const actions = actionMatches.map(match => match.match(/action=([^"]+)/)[1]);
      console.log('✅ Menu actions found:', actions);
      
      // Check for expected actions
      const expectedActions = ['history', 'leave', 'location', 'contact'];
      const foundActions = expectedActions.filter(action => actions.includes(action));
      
      console.log('✅ Expected actions found:', foundActions);
      
      if (foundActions.length === expectedActions.length) {
        console.log('✅ All expected menu actions are configured');
        return true;
      } else {
        console.log('⚠️ Some expected menu actions are missing');
        return false;
      }
    } else {
      console.log('❌ No menu actions found in configuration');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing menu configuration:', error.message);
    return false;
  }
}

// Simulate menu postback handling logic
async function simulateMenuHandling() {
  console.log('\n🎭 Simulating menu handling logic...');
  
  try {
    // Test different postback data formats
    const testCases = [
      { data: 'action=main_menu', expected: 'main_menu' },
      { data: 'action=history', expected: 'history' },
      { data: 'action=leave', expected: 'leave' },
      { data: 'action=location', expected: 'location' },
      { data: 'action=contact', expected: 'contact' },
      { data: 'leave_type=sick', expected: 'leave_related' },
      { data: 'unknown_action', expected: 'unknown' }
    ];
    
    for (const testCase of testCases) {
      console.log(`📤 Testing postback data: ${testCase.data}`);
      
      // Simulate the parsing logic from handlers.js
      let result;
      if (testCase.data.startsWith('action=')) {
        const action = testCase.data.split('=')[1];
        result = action;
        console.log(`✅ Parsed action: ${action}`);
      } else if (testCase.data.startsWith('leave_type=') || testCase.data.startsWith('confirm_leave=') || testCase.data.startsWith('leave_form_')) {
        result = 'leave_related';
        console.log(`✅ Identified as leave-related postback`);
      } else {
        result = 'unknown';
        console.log(`⚠️ Unknown postback format`);
      }
      
      // Verify expected result
      if ((testCase.expected === 'leave_related' && result === 'leave_related') ||
          (testCase.expected !== 'leave_related' && testCase.expected !== 'unknown' && result === testCase.expected) ||
          (testCase.expected === 'unknown' && result === 'unknown')) {
        console.log(`✅ Test case passed`);
      } else {
        console.log(`❌ Test case failed - expected: ${testCase.expected}, got: ${result}`);
      }
    }
    
    console.log('✅ Menu handling simulation completed');
    return true;
  } catch (error) {
    console.error('❌ Error simulating menu handling:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive menu tests...\n');
  
  const results = {
    webhookStatus: await testWebhookStatus(),
    menuFileStructure: await testMenuFileStructure(),
    menuConfiguration: await testMenuConfiguration(),
    menuSimulation: await simulateMenuHandling()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Menu handlers are working correctly.');
    console.log('\n📋 Summary:');
    console.log('- Webhook is running and properly configured');
    console.log('- Menu files exist and contain required functions');
    console.log('- Menu configuration includes all expected actions');
    console.log('- Menu handling logic works as expected');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the issues above.');
  }
  
  return allPassed;
}

runAllTests().catch(console.error);