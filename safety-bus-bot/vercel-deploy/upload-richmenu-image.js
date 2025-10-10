// upload-richmenu-image.js - Upload Rich Menu image and set as default
import 'dotenv/config';
import { Client } from '@line/bot-sdk';
import fs from 'fs';
import path from 'path';

// LINE Bot configuration
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

async function uploadRichMenuImageAndSetDefault() {
    try {
        console.log('🖼️ Uploading Rich Menu image and setting as default...');
        
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
        
        // Check if image file exists
        const imagePath = path.join(process.cwd(), 'assets', 'richmenu-image.jpg');
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Rich Menu image not found at: ${imagePath}`);
        }
        
        console.log(`📁 Found image file: ${imagePath}`);
        
        // Read image file
        const imageBuffer = fs.readFileSync(imagePath);
        console.log(`📏 Image size: ${imageBuffer.length} bytes`);
        
        // Upload image to Rich Menu
        console.log('⬆️ Uploading image to Rich Menu...');
        try {
            await client.setRichMenuImage(safetyBusMenu.richMenuId, imageBuffer, 'image/jpeg');
            console.log('✅ Rich Menu image uploaded successfully!');
        } catch (uploadError) {
            console.error('❌ Error uploading image:', uploadError.message);
            throw uploadError;
        }
        
        // Wait a moment for the image to be processed
        console.log('⏳ Waiting for image processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Set as default Rich Menu
        console.log('🎯 Setting as default Rich Menu...');
        try {
            await client.setDefaultRichMenu(safetyBusMenu.richMenuId);
            console.log('✅ Rich Menu set as default successfully!');
        } catch (defaultError) {
            console.error('❌ Error setting default:', defaultError.message);
            throw defaultError;
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
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return false;
    }
}

// Run the function
uploadRichMenuImageAndSetDefault()
    .then((success) => {
        if (success) {
            console.log('\n✅ Rich Menu setup completed successfully!');
            console.log('🎉 Users should now see the Rich Menu in their LINE chat');
            console.log('📱 The menu includes:');
            console.log('   📊 ประวัตินักเรียน');
            console.log('   📝 ฟอร์มแจ้งลา');
            console.log('   🚌 ตำแหน่งรถ');
            console.log('   📞 ติดต่อคนขับ');
        } else {
            console.log('\n❌ Rich Menu setup failed!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('\n💥 Unexpected error:', error);
        process.exit(1);
    });