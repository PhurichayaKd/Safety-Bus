const { Client } = require('@line/bot-sdk');

// LINE Bot configuration
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Helper function to get leave type in Thai
function getLeaveTypeText(leaveType) {
    const types = {
        'sick': 'ลาป่วย',
        'personal': 'ลากิจ',
        'emergency': 'ลาฉุกเฉิน',
        'other': 'อื่นๆ'
    };
    return types[leaveType] || leaveType;
}

// Helper function to calculate leave duration
function calculateLeaveDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const {
            studentId,
            studentName,
            class: studentClass,
            leaveType,
            startDate,
            endDate,
            reason,
            contactNumber,
            submittedAt
        } = req.body;

        // Validate required fields
        if (!studentId || !studentName || !leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({
                success: false,
                error: 'ข้อมูลไม่ครบถ้วน กรุณากรอกข้อมูลให้ครบ'
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            return res.status(400).json({
                success: false,
                error: 'ไม่สามารถลาย้อนหลังได้'
            });
        }

        if (end < start) {
            return res.status(400).json({
                success: false,
                error: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น'
            });
        }

        // Calculate leave duration
        const duration = calculateLeaveDuration(startDate, endDate);
        const leaveTypeText = getLeaveTypeText(leaveType);
        const startDateText = formatDate(startDate);
        const endDateText = formatDate(endDate);

        // Create leave request message for admin/driver
        const leaveMessage = {
            type: 'flex',
            altText: `แจ้งลาหยุด - ${studentName}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '📝 แจ้งลาหยุดเรียน',
                            weight: 'bold',
                            size: 'lg',
                            color: '#ffffff'
                        }
                    ],
                    backgroundColor: '#FF6B6B',
                    paddingAll: '20px'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '👤 ข้อมูลนักเรียน',
                                    weight: 'bold',
                                    size: 'md',
                                    color: '#333333',
                                    margin: 'none'
                                },
                                {
                                    type: 'separator',
                                    margin: 'sm'
                                }
                            ],
                            margin: 'none'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'ชื่อ:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 2
                                        },
                                        {
                                            type: 'text',
                                            text: studentName,
                                            size: 'sm',
                                            color: '#333333',
                                            flex: 5,
                                            wrap: true
                                        }
                                    ],
                                    margin: 'sm'
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'รหัส:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 2
                                        },
                                        {
                                            type: 'text',
                                            text: studentId,
                                            size: 'sm',
                                            color: '#333333',
                                            flex: 5
                                        }
                                    ],
                                    margin: 'sm'
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'ชั้น:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 2
                                        },
                                        {
                                            type: 'text',
                                            text: studentClass || 'ไม่ระบุ',
                                            size: 'sm',
                                            color: '#333333',
                                            flex: 5
                                        }
                                    ],
                                    margin: 'sm'
                                }
                            ],
                            margin: 'md'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '📅 รายละเอียดการลา',
                                    weight: 'bold',
                                    size: 'md',
                                    color: '#333333',
                                    margin: 'xl'
                                },
                                {
                                    type: 'separator',
                                    margin: 'sm'
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'ประเภท:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 2
                                        },
                                        {
                                            type: 'text',
                                            text: leaveTypeText,
                                            size: 'sm',
                                            color: '#333333',
                                            flex: 5,
                                            weight: 'bold'
                                        }
                                    ],
                                    margin: 'sm'
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'วันที่:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 2
                                        },
                                        {
                                            type: 'text',
                                            text: startDate === endDate ? startDateText : `${startDateText} - ${endDateText}`,
                                            size: 'sm',
                                            color: '#333333',
                                            flex: 5,
                                            wrap: true
                                        }
                                    ],
                                    margin: 'sm'
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'จำนวน:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 2
                                        },
                                        {
                                            type: 'text',
                                            text: `${duration} วัน`,
                                            size: 'sm',
                                            color: '#333333',
                                            flex: 5,
                                            weight: 'bold'
                                        }
                                    ],
                                    margin: 'sm'
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'เหตุผล:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 2
                                        },
                                        {
                                            type: 'text',
                                            text: reason,
                                            size: 'sm',
                                            color: '#333333',
                                            flex: 5,
                                            wrap: true
                                        }
                                    ],
                                    margin: 'sm'
                                }
                            ],
                            margin: 'md'
                        }
                    ],
                    paddingAll: '20px'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `⏰ แจ้งเมื่อ: ${new Date(submittedAt).toLocaleString('th-TH')}`,
                            size: 'xs',
                            color: '#999999',
                            align: 'center'
                        }
                    ],
                    paddingAll: '10px'
                }
            }
        };

        // Add contact number if provided
        if (contactNumber) {
            const contactInfo = {
                type: 'box',
                layout: 'baseline',
                contents: [
                    {
                        type: 'text',
                        text: 'เบอร์:',
                        size: 'sm',
                        color: '#666666',
                        flex: 2
                    },
                    {
                        type: 'text',
                        text: contactNumber,
                        size: 'sm',
                        color: '#333333',
                        flex: 5
                    }
                ],
                margin: 'sm'
            };
            
            leaveMessage.contents.body.contents[3].contents.push(contactInfo);
        }

        // Send notification to admin/driver group (you may need to adjust this)
        // For now, we'll log the leave request
        console.log('Leave request submitted:', {
            studentId,
            studentName,
            studentClass,
            leaveType: leaveTypeText,
            startDate: startDateText,
            endDate: endDateText,
            duration,
            reason,
            contactNumber,
            submittedAt
        });

        // Here you would typically:
        // 1. Save to database
        // 2. Send notification to admin/driver LINE group
        // 3. Send confirmation to student
        
        // For demonstration, we'll send a simple confirmation
        // You'll need to implement the actual notification logic based on your system

        return res.status(200).json({
            success: true,
            message: 'ส่งใบลาเรียบร้อยแล้ว',
            data: {
                studentId,
                studentName,
                leaveType: leaveTypeText,
                startDate: startDateText,
                endDate: endDateText,
                duration,
                submittedAt: new Date(submittedAt).toLocaleString('th-TH')
            }
        });

    } catch (error) {
        console.error('Error processing leave request:', error);
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
        });
    }
}