// setup-richmenu.js - Rich Menu Setup Script
import dotenv from 'dotenv';
import { Client } from '@line/bot-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function setupRichMenu() {
  try {
    console.log('🚀 Starting Rich Menu setup...');
    
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
      console.log(`   Deleted: ${menu.name} (${menu.richMenuId})`);
    }
    
    // Create new Rich Menu
    console.log('📋 Creating new Rich Menu...');
    const richMenuId = await client.createRichMenu(richMenuObject);
    console.log(`✅ Rich Menu created with ID: ${richMenuId}`);
    
    // Upload Rich Menu image
    console.log('🖼️ Uploading Rich Menu image...');
    const imagePath = path.join(__dirname, 'assets', 'richmenu-image.jpg');
    
    if (!fs.existsSync(imagePath)) {
      console.log('⚠️ Rich Menu image not found, creating a simple one...');
      // For now, we'll skip image upload and just use the menu without image
      console.log('📝 Rich Menu created without image - you can add image later');
    } else {
      const imageBuffer = fs.readFileSync(imagePath);
      await client.setRichMenuImage(richMenuId, imageBuffer, 'image/jpeg');
      console.log('✅ Rich Menu image uploaded');
    }
    
    // Set as default Rich Menu
    console.log('🎯 Setting as default Rich Menu...');
    await client.setDefaultRichMenu(richMenuId);
    console.log('✅ Rich Menu set as default');
    
    console.log('🎉 Rich Menu setup completed successfully!');
    console.log(`Rich Menu ID: ${richMenuId}`);
    
    return richMenuId;
    
  } catch (error) {
    console.error('❌ Error setting up Rich Menu:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupRichMenu()
    .then((richMenuId) => {
      console.log(`\n✅ Setup completed! Rich Menu ID: ${richMenuId}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    });
}

export { setupRichMenu, richMenuObject };