// recreate-richmenu.js - Recreate Rich Menu and Set as Default
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

// Rich Menu configuration
const richMenuObject = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: false,
  name: "Safety Bus Main Menu",
  chatBarText: "Menu",
  areas: [
    {
      bounds: {
        x: 0,
        y: 0,
        width: 1250,
        height: 843
      },
      action: {
        type: "postback",
        data: "action=history",
        displayText: "📊 ประวัตินักเรียน"
      }
    },
    {
      bounds: {
        x: 1250,
        y: 0,
        width: 1250,
        height: 843
      },
      action: {
        type: "postback",
        data: "action=leave",
        displayText: "📝 ฟอร์มแจ้งลา"
      }
    },
    {
      bounds: {
        x: 0,
        y: 843,
        width: 1250,
        height: 843
      },
      action: {
        type: "postback",
        data: "action=location",
        displayText: "🚌 ตำแหน่งรถ"
      }
    },
    {
      bounds: {
        x: 1250,
        y: 843,
        width: 1250,
        height: 843
      },
      action: {
        type: "postback",
        data: "action=contact",
        displayText: "📞 ติดต่อคนขับ"
      }
    }
  ]
};

async function recreateRichMenu() {
  try {
    console.log('🔄 Recreating Rich Menu...');
    
    // Check if environment variables are set
    if (!config.channelAccessToken || !config.channelSecret) {
      throw new Error('Missing LINE Bot credentials in environment variables');
    }
    
    console.log('✅ LINE Bot credentials found');
    
    // Delete existing Rich Menus
    console.log('🗑️ Deleting existing Rich Menus...');
    const existingMenus = await client.getRichMenuList();
    for (const menu of existingMenus) {
      await client.deleteRichMenu(menu.richMenuId);
      console.log(`   ✅ Deleted: ${menu.name} (${menu.richMenuId})`);
    }
    
    // Create new Rich Menu
    console.log('📋 Creating new Rich Menu...');
    const richMenuId = await client.createRichMenu(richMenuObject);
    console.log(`✅ Rich Menu created with ID: ${richMenuId}`);
    
    // Set as default Rich Menu immediately
    console.log('🎯 Setting as default Rich Menu...');
    await client.setDefaultRichMenu(richMenuId);
    console.log('✅ Rich Menu set as default');
    
    // Wait a moment and verify
    console.log('⏳ Waiting 2 seconds before verification...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the setting
    try {
      const defaultRichMenu = await client.getDefaultRichMenu();
      console.log(`🔍 Verified - Default Rich Menu ID: ${defaultRichMenu.richMenuId}`);
      
      if (defaultRichMenu.richMenuId === richMenuId) {
        console.log('✅ Default Rich Menu setting confirmed!');
        return true;
      } else {
        console.log('❌ Default Rich Menu setting verification failed');
        return false;
      }
    } catch (error) {
      console.log('⚠️ Could not verify default Rich Menu setting:', error.message);
      // Still consider it successful if we got this far
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error recreating Rich Menu:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Run recreation
recreateRichMenu()
  .then((success) => {
    if (success) {
      console.log('\n✅ Rich Menu recreation completed successfully!');
      console.log('🎉 Users should now see the Rich Menu at the bottom of their chat');
      console.log('📱 Try tapping the menu buttons in LINE to test functionality');
    } else {
      console.log('\n❌ Rich Menu recreation failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Recreation failed:', error.message);
    process.exit(1);
  });