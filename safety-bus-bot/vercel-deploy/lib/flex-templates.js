/**
 * Flex Message Templates for LINE Bot
 * สำหรับแสดงข้อมูลในรูปแบบการ์ดที่สวยงาม
 */

/**
 * สร้าง Bubble Container สำหรับแสดงข้อมูลนักเรียน
 * @param {Object} studentData - ข้อมูลนักเรียน
 * @param {Object} rfidData - ข้อมูล RFID
 * @param {Array} travelHistory - ประวัติการเดินทาง
 * @returns {Object} Flex Message object
 */
export function createStudentInfoBubble(studentData, rfidData, travelHistory) {
  const student = studentData.student || studentData;
  const fullData = studentData;
  
  // จัดรูปแบบวันที่
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  // สร้าง body contents
  const bodyContents = [
    // Header
    {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ข้อมูลนักเรียน",
          weight: "bold",
          size: "xl",
          color: "#1DB446",
          align: "center"
        }
      ],
      paddingBottom: "lg"
    },
    // Separator
    {
      type: "separator",
      margin: "md"
    },
    // Student Information
    {
      type: "box",
      layout: "vertical",
      contents: [
        // ชื่อ
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "text",
              text: "ชื่อ:",
              color: "#666666",
              size: "sm",
              flex: 2,
              weight: "bold"
            },
            {
              type: "text",
              text: fullData?.student_name || student?.student_name || '-',
              wrap: true,
              color: "#333333",
              size: "sm",
              flex: 5
            }
          ],
          spacing: "sm"
        },
        // รหัสนักเรียน
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "text",
              text: "รหัสนักเรียน:",
              color: "#666666",
              size: "sm",
              flex: 2,
              weight: "bold"
            },
            {
              type: "text",
              text: String(fullData?.student_id || student?.student_id || '-'),
              wrap: true,
              color: "#333333",
              size: "sm",
              flex: 5
            }
          ],
          spacing: "sm"
        },
        // ชั้นเรียน
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "text",
              text: "ชั้นเรียน:",
              color: "#666666",
              size: "sm",
              flex: 2,
              weight: "bold"
            },
            {
              type: "text",
              text: fullData?.grade || '-',
              wrap: true,
              color: "#333333",
              size: "sm",
              flex: 5
            }
          ],
          spacing: "sm"
        },
        // รหัสบัตร RFID
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "text",
              text: "รหัสบัตร:",
              color: "#666666",
              size: "sm",
              flex: 2,
              weight: "bold"
            },
            {
              type: "text",
              text: rfidData?.rfid_cards?.rfid_code || '-',
              wrap: true,
              color: "#333333",
              size: "sm",
              flex: 5
            }
          ],
          spacing: "sm"
        },
        // ชื่อผู้ปกครอง
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "text",
              text: "ชื่อผู้ปกครอง:",
              color: "#666666",
              size: "sm",
              flex: 2,
              weight: "bold"
            },
            {
              type: "text",
              text: fullData?.parents?.parent_name || '-',
              wrap: true,
              color: "#333333",
              size: "sm",
              flex: 5
            }
          ],
          spacing: "sm"
        },
        // วันที่เริ่มต้น-สิ้นสุด
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "text",
              text: "บริการรถรับส่ง:",
              color: "#666666",
              size: "sm",
              flex: 2,
              weight: "bold",
              wrap: true
            },
            {
              type: "text",
              text: `${formatDate(fullData?.start_date)} - ${formatDate(fullData?.end_date)}`,
              wrap: true,
              color: "#333333",
              size: "sm",
              flex: 5
            }
          ],
          spacing: "sm"
        }
      ],
      spacing: "md",
      margin: "lg"
    }
  ];

  // เพิ่มประวัติการเดินทางถ้ามี
  if (travelHistory && travelHistory.length > 0) {
    bodyContents.push(
      // Separator
      {
        type: "separator",
        margin: "lg"
      },
      // Travel History Header
      {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📊 ประวัติการเดินทางล่าสุด",
            weight: "bold",
            size: "md",
            color: "#1DB446",
            margin: "lg"
          }
        ]
      }
    );

    // เพิ่มรายการประวัติการเดินทาง (แสดงแค่ 5 รายการแรก)
    const historyToShow = travelHistory.slice(0, 5);
    historyToShow.forEach((record, index) => {
      const date = new Date(record.travel_date).toLocaleDateString('th-TH');
      bodyContents.push({
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: `${index + 1}.`,
                color: "#666666",
                size: "sm",
                flex: 1
              },
              {
                type: "text",
                text: date,
                color: "#333333",
                size: "sm",
                weight: "bold",
                flex: 4
              }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "🚌",
                size: "sm",
                flex: 1
              },
              {
                type: "text",
                text: `${record.pickup_time || 'N/A'} - ${record.dropoff_time || 'N/A'}`,
                color: "#666666",
                size: "sm",
                flex: 4
              }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "📍",
                size: "sm",
                flex: 1
              },
              {
                type: "text",
                text: record.status || 'N/A',
                color: "#666666",
                size: "sm",
                flex: 4
              }
            ]
          }
        ],
        spacing: "xs",
        margin: "md"
      });
    });
  }

  return {
    type: "flex",
    altText: "ข้อมูลนักเรียน",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
        spacing: "md",
        paddingAll: "lg"
      },
      styles: {
        body: {
          backgroundColor: "#FFFFFF"
        }
      }
    }
  };
}

/**
 * สร้าง Bubble Container สำหรับแสดงข้อมูลติดต่อคนขับ
 * @param {Object} driverData - ข้อมูลคนขับ
 * @returns {Object} Flex Message object
 */
export function createContactDriverBubble(driverData) {
  const {
    driver_name = 'คนขับรถโรงเรียน',
    phone_number = '043-754-321',
    license_plate = 'ไม่ระบุ',
    start_point = 'ไม่ระบุ'
  } = driverData;

  // ทำความสะอาดเบอร์โทรศัพท์สำหรับการโทร
  const cleanPhoneNumber = phone_number.replace(/[-\s]/g, '');

  return {
    type: "flex",
    altText: `📞 ติดต่อคนขับรถ - ${driver_name}`,
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          // Header
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📞 ติดต่อคนขับรถ",
                weight: "bold",
                size: "xl",
                color: "#1DB446",
                align: "center"
              }
            ],
            paddingBottom: "lg"
          },
          // Separator
          {
            type: "separator",
            margin: "md"
          },
          // Driver Information
          {
            type: "box",
            layout: "vertical",
            contents: [
              // Driver Name
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "👨‍💼 ชื่อคนขับ:",
                    size: "sm",
                    color: "#666666",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: driver_name,
                    size: "sm",
                    weight: "bold",
                    color: "#333333",
                    flex: 3,
                    wrap: true
                  }
                ],
                margin: "lg"
              },
              // Phone Number
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "📱 เบอร์โทร:",
                    size: "sm",
                    color: "#666666",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: phone_number,
                    size: "sm",
                    weight: "bold",
                    color: "#1DB446",
                    flex: 3,
                    wrap: true
                  }
                ],
                margin: "md"
              },
              // License Plate
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "🚌 ป้ายทะเบียน:",
                    size: "sm",
                    color: "#666666",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: license_plate,
                    size: "sm",
                    weight: "bold",
                    color: "#333333",
                    flex: 3,
                    wrap: true
                  }
                ],
                margin: "md"
              },
              // Address
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "📍 ที่อยู่:",
                    size: "sm",
                    color: "#666666",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: start_point,
                    size: "sm",
                    weight: "bold",
                    color: "#333333",
                    flex: 3,
                    wrap: true
                  }
                ],
                margin: "md"
              },
              // Working Hours
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "⏰ เวลาทำการ:",
                    size: "sm",
                    color: "#666666",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: "06:00 - 17:00 น.",
                    size: "sm",
                    weight: "bold",
                    color: "#333333",
                    flex: 3,
                    wrap: true
                  }
                ],
                margin: "md"
              }
            ],
            paddingTop: "lg"
          },
          // Separator
          {
            type: "separator",
            margin: "lg"
          },
          // Call Button
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                action: {
                  type: "uri",
                  label: "📞 โทรหาคนขับ",
                  uri: `tel:${cleanPhoneNumber}`
                },
                style: "primary",
                color: "#1DB446",
                height: "sm"
              }
            ],
            paddingTop: "lg"
          }
        ],
        paddingAll: "20px"
      }
    }
  };
}

/**
 * สร้าง Bubble Container สำหรับฟอร์มแจ้งลา
 * @param {Object} studentData - ข้อมูลนักเรียน
 * @param {string} formUrl - URL ของฟอร์มแจ้งลา
 * @returns {Object} Flex Message object
 */
export function createLeaveRequestBubble(studentData, formUrl) {
  const student = studentData.student || studentData;

  return {
    type: "flex",
    altText: "ฟอร์มแจ้งลาหยุด",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          // Header
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📝 แจ้งลาหยุด",
                weight: "bold",
                size: "xl",
                color: "#1DB446",
                align: "center"
              }
            ],
            paddingBottom: "lg"
          },
          // Separator
          {
            type: "separator",
            margin: "md"
          },
          // Student Information
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📋 ข้อมูลนักเรียน",
                weight: "bold",
                size: "md",
                color: "#333333",
                margin: "lg"
              },
              // ชื่อ
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "ชื่อ:",
                    color: "#666666",
                    size: "sm",
                    flex: 2,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: student?.student_name || '-',
                    wrap: true,
                    color: "#333333",
                    size: "sm",
                    flex: 5
                  }
                ],
                spacing: "sm"
              },
              // รหัส
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "รหัส:",
                    color: "#666666",
                    size: "sm",
                    flex: 2,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: String(student?.student_id || '-'),
                    wrap: true,
                    color: "#333333",
                    size: "sm",
                    flex: 5
                  }
                ],
                spacing: "sm"
              },
              // ชั้น
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "ชั้น:",
                    color: "#666666",
                    size: "sm",
                    flex: 2,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: student?.grade || 'ไม่ระบุ',
                    wrap: true,
                    color: "#333333",
                    size: "sm",
                    flex: 5
                  }
                ],
                spacing: "sm"
              }
            ],
            spacing: "md"
          },
          // Separator
          {
            type: "separator",
            margin: "lg"
          },
          // Instructions
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "กรุณากดปุ่มด้านล่างเพื่อเปิดฟอร์มแจ้งลาหยุด",
                wrap: true,
                color: "#666666",
                size: "sm",
                align: "center",
                margin: "lg"
              }
            ]
          }
        ],
        spacing: "md",
        paddingAll: "lg"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "🔗 เปิดฟอร์มแจ้งลา",
              uri: formUrl
            },
            style: "primary",
            color: "#1DB446",
            height: "sm"
          }
        ],
        spacing: "sm",
        paddingAll: "lg"
      },
      styles: {
        body: {
          backgroundColor: "#FFFFFF"
        },
        footer: {
          backgroundColor: "#FFFFFF"
        }
      }
    }
  };
}