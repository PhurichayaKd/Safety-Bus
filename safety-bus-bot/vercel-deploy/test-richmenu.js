// test-richmenu.js - Test Rich Menu Status
import dotenv from 'dotenv';
import { Client } from '@line/bot-sdk';

// Load environment variables
dotenv.config();

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

async function testRichMenu() {
  try {
    console.log('🔍 Testing Rich Menu status...');
    
    // Check if environment variables are set
    if (!config.channelAccessToken || !config.channelSecret) {
      throw new Error('Missing LINE Bot credentials in environment variables');
    }
    
    console.log('✅ LINE Bot credentials found');
    console.log('Channel Access Token:', config.channelAccessToken.substring(0, 20) + '...');
    
    // Get existing Rich Menus
    console.log('📋 Getting existing Rich Menus...');
    const existingMenus = await client.getRichMenuList();
    
    if (existingMenus.length === 0) {
      console.log('❌ No Rich Menus found');
      return false;
    }
    
    console.log(`✅ Found ${existingMenus.length} Rich Menu(s):`);
    for (const menu of existingMenus) {
      console.log(`   - ${menu.name} (${menu.richMenuId})`);
      console.log(`     Selected: ${menu.selected}`);
      console.log(`     Chat Bar Text: ${menu.chatBarText}`);
      console.log(`     Areas: ${menu.areas.length}`);
      
      // Check each area
      menu.areas.forEach((area, index) => {
        console.log(`       Area ${index + 1}: ${area.action.displayText || area.action.data}`);
      });
    }
    
    // Get default Rich Menu
    try {
      const defaultRichMenu = await client.getDefaultRichMenu();
      console.log(`🎯 Default Rich Menu ID: ${defaultRichMenu.richMenuId}`);
    } catch (error) {
      console.log('⚠️ No default Rich Menu set');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing Rich Menu:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Run test
testRichMenu()
  .then((success) => {
    if (success) {
      console.log('\n✅ Rich Menu test completed successfully!');
    } else {
      console.log('\n❌ Rich Menu test failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });