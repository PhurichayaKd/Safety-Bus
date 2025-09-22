import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRichMenu, setDefaultRichMenu } from './lib/line.js';
import { mainRichMenu } from './lib/menu.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deleteAllRichMenus() {
  try {
    console.log('🗑️ Deleting all existing Rich Menus...');
    
    // Get all Rich Menus
    const response = await fetch('https://api.line.me/v2/bot/richmenu/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to get Rich Menu list:', response.status);
      return;
    }
    
    const data = await response.json();
    const richMenus = data.richmenus || [];
    
    console.log(`Found ${richMenus.length} existing Rich Menus`);
    
    // Delete each Rich Menu
    for (const richMenu of richMenus) {
      console.log(`Deleting Rich Menu: ${richMenu.richMenuId}`);
      
      const deleteResponse = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenu.richMenuId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
        }
      });
      
      if (deleteResponse.ok) {
        console.log(`✅ Deleted Rich Menu: ${richMenu.richMenuId}`);
      } else {
        console.error(`❌ Failed to delete Rich Menu: ${richMenu.richMenuId}`);
      }
    }
    
    console.log('✅ All existing Rich Menus deleted');
  } catch (error) {
    console.error('❌ Error deleting Rich Menus:', error);
  }
}

async function uploadRichMenuImage(richMenuId, imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    
    const response = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'image/jpeg'
      },
      body: imageBuffer
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload Rich Menu Image Error:', response.status, errorText);
      throw new Error(`Upload Rich Menu Image Error: ${response.status}`);
    }
    
    console.log('✅ Rich Menu image uploaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error uploading rich menu image:', error);
    throw error;
  }
}

async function setupRichMenu() {
  try {
    console.log('🚀 Setting up Rich Menu...');
    
    // Delete all existing Rich Menus first
    await deleteAllRichMenus();
    
    // Wait a bit for LINE to process the deletions
    console.log('⏳ Waiting for LINE to process deletions...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create Rich Menu
    console.log('📝 Creating new Rich Menu...');
    const richMenuId = await createRichMenu(mainRichMenu);
    console.log('✅ Rich Menu created with ID:', richMenuId);
    
    // Upload Rich Menu image
    console.log('📷 Uploading Rich Menu image...');
    const imagePath = path.join(__dirname, 'assets', 'richmenu-image.jpg');
    await uploadRichMenuImage(richMenuId, imagePath);
    
    // Set as default Rich Menu
    console.log('🔧 Setting as default Rich Menu...');
    await setDefaultRichMenu(richMenuId);
    console.log('✅ Rich Menu set as default');
    
    console.log('🎉 Rich Menu setup completed successfully!');
    console.log('Rich Menu ID:', richMenuId);
    console.log('⚠️ Please restart your LINE app to see the updated Rich Menu');
    
  } catch (error) {
    console.error('❌ Error setting up Rich Menu:', error);
    process.exit(1);
  }
}

// Run setup
setupRichMenu();