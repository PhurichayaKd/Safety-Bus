import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import the API handler
import handler from './api/submit-leave.js';

// Mock request and response objects
function createMockReq(body) {
    return {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json'
        }
    };
}

function createMockRes() {
    let statusCode = 200;
    let responseData = null;
    
    return {
        status: (code) => {
            statusCode = code;
            return {
                json: (data) => {
                    responseData = data;
                    console.log(`Response Status: ${statusCode}`);
                    console.log('Response Data:', JSON.stringify(data, null, 2));
                    return { statusCode, data };
                }
            };
        },
        json: (data) => {
            responseData = data;
            console.log(`Response Status: ${statusCode}`);
            console.log('Response Data:', JSON.stringify(data, null, 2));
            return { statusCode, data };
        }
    };
}

// Test the API directly
async function testAPI() {
    console.log('=== Testing API Direct Call ===\n');
    
    // Test data
    const testData = {
        action: 'submitLeave',
        userId: 'test-user-123',
        displayName: 'Test User',
        studentInfo: {
            id: 5,
            name: 'ภูมิใจ เด่นดี',
            class: 'ป.4/7',
            link_code: '335875',
            line_user_id: 'test-user-123'
        },
        leaveDates: ['2025-01-20', '2025-01-21']
    };
    
    console.log('Test Data:', JSON.stringify(testData, null, 2));
    console.log('\n--- Calling API Handler ---\n');
    
    try {
        const req = createMockReq(testData);
        const res = createMockRes();
        
        await handler(req, res);
        
        console.log('\n--- API Call Completed ---');
        
    } catch (error) {
        console.error('Error calling API:', error);
    }
    
    // Verify data was inserted
    console.log('\n--- Verifying Database ---\n');
    
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('student_id', 5)
        .in('leave_date', ['2025-01-20', '2025-01-21'])
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Database verification error:', error);
    } else {
        console.log('Database verification result:');
        console.log(JSON.stringify(data, null, 2));
    }
}

// Run the test
testAPI().catch(console.error);