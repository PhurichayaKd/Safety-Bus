// fix-richmenu.js - Fix Rich Menu Default Setting
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

async function fixRichMenu() {
  try {
    console.log('🔧 Fixing Rich Menu default setting...');
    
    // Check if environment variables are set
    if (!config.channelAccessToken || !config.channelSecret) {
      throw new Error('Missing LINE Bot credentials in environment variables');
    }
    
    console.log('✅ LINE Bot credentials found');
    
    // Get existing Rich Menus
    console.log('📋 Getting existing Rich Menus...');
    const existingMenus = await client.getRichMenuList();
    
    if (existingMenus.length === 0) {
      console.log('❌ No Rich Menus found - need to create one first');
      return false;
    }
    
    // Find the Safety Bus menu
    const safetyBusMenu = existingMenus.find(menu => menu.name === 'Safety Bus Main Menu');
    
    if (!safetyBusMenu) {
      console.log('❌ Safety Bus Main Menu not found');
      return false;
    }
    
    console.log(`✅ Found Safety Bus Main Menu: ${safetyBusMenu.richMenuId}`);
    
    // Set as default Rich Menu
    console.log('🎯 Setting as default Rich Menu...');
    await client.setDefaultRichMenu(safetyBusMenu.richMenuId);
    console.log('✅ Rich Menu set as default successfully!');
    
    // Verify the setting
    try {
      const defaultRichMenu = await client.getDefaultRichMenu();
      console.log(`🔍 Verified - Default Rich Menu ID: ${defaultRichMenu.richMenuId}`);
      
      if (defaultRichMenu.richMenuId === safetyBusMenu.richMenuId) {
        console.log('✅ Default Rich Menu setting confirmed!');
        return true;
      } else {
        console.log('❌ Default Rich Menu setting verification failed');
        return false;
      }
    } catch (error) {
      console.log('⚠️ Could not verify default Rich Menu setting');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error fixing Rich Menu:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Run fix
fixRichMenu()
  .then((success) => {
    if (success) {
      console.log('\n✅ Rich Menu fix completed successfully!');
      console.log('🎉 Users should now see the Rich Menu at the bottom of their chat');
    } else {
      console.log('\n❌ Rich Menu fix failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });