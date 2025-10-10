// set-default-richmenu.js - Set existing Rich Menu as default
import 'dotenv/config';
import { Client } from '@line/bot-sdk';

// LINE Bot configuration
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

async function setDefaultRichMenu() {
    try {
        console.log('🔧 Setting Rich Menu as default...');
        
        // Verify credentials
        if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
            throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in environment variables');
        }
        
        console.log('✅ LINE Bot credentials found');
        
        // Get existing Rich Menus
        console.log('📋 Getting existing Rich Menus...');
        const existingMenus = await client.getRichMenuList();
        
        if (existingMenus.length === 0) {
            throw new Error('No Rich Menu found. Please create one first.');
        }
        
        // Find Safety Bus Main Menu
        const safetyBusMenu = existingMenus.find(menu => 
            menu.name && menu.name.includes('Safety Bus')
        );
        
        if (!safetyBusMenu) {
            throw new Error('Safety Bus Main Menu not found');
        }
        
        console.log(`✅ Found Safety Bus Main Menu: ${safetyBusMenu.richMenuId}`);
        
        // Set as default using direct API call
        console.log('🎯 Setting as default Rich Menu...');
        
        try {
            // Use the LINE Messaging API directly
            const response = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${safetyBusMenu.richMenuId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('✅ Rich Menu set as default successfully!');
            
        } catch (apiError) {
            console.error('❌ API Error:', apiError.message);
            throw apiError;
        }
        
        // Verify the setting
        console.log('🔍 Verifying default Rich Menu setting...');
        try {
            const defaultRichMenu = await client.getDefaultRichMenu();
            console.log(`🔍 Verified - Default Rich Menu ID: ${defaultRichMenu.richMenuId}`);
            
            if (defaultRichMenu.richMenuId === safetyBusMenu.richMenuId) {
                console.log('✅ Rich Menu is now set as default!');
                return true;
            } else {
                console.log('⚠️ Rich Menu ID mismatch');
                return false;
            }
        } catch (verifyError) {
            console.log('⚠️ Could not verify default Rich Menu setting');
            console.log('This might be normal - the setting may still be working');
            return true; // Assume success if we can't verify
        }
        
    } catch (error) {
        console.error('❌ Error setting default Rich Menu:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return false;
    }
}

// Run the function
setDefaultRichMenu()
    .then((success) => {
        if (success) {
            console.log('\n✅ Rich Menu setup completed successfully!');
            console.log('🎉 Users should now see the Rich Menu in their LINE chat');
        } else {
            console.log('\n❌ Rich Menu setup failed!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('\n💥 Unexpected error:', error);
        process.exit(1);
    });