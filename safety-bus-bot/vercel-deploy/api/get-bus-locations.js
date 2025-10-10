// Mock data for demonstration - replace with actual database queries
const mockBusData = [
    {
        id: 1,
        bus_number: "MSU-001",
        driver_name: "นายสมชาย ใจดี",
        route_name: "เส้นทาง A - หอพักมหาวิทยาลัย",
        capacity: 30,
        status: "active",
        has_location: true,
        current_latitude: 16.2498137,
        current_longitude: 103.2557912,
        home_latitude: 16.2450000,
        home_longitude: 103.2500000,
        school_latitude: 16.2550000,
        school_longitude: 103.2600000,
        last_seen: new Date().toISOString()
    },
    {
        id: 2,
        bus_number: "MSU-002",
        driver_name: "นายวิชัย รักษ์ดี",
        route_name: "เส้นทาง B - ตัวเมือง",
        capacity: 25,
        status: "active",
        has_location: true,
        current_latitude: 16.2520000,
        current_longitude: 103.2580000,
        home_latitude: 16.2470000,
        home_longitude: 103.2520000,
        school_latitude: 16.2550000,
        school_longitude: 103.2600000,
        last_seen: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
    },
    {
        id: 3,
        bus_number: "MSU-003",
        driver_name: "นายประยุทธ์ ขับดี",
        route_name: "เส้นทาง C - ชุมชนรอบมหาวิทยาลัย",
        capacity: 35,
        status: "inactive",
        has_location: false,
        current_latitude: null,
        current_longitude: null,
        home_latitude: 16.2430000,
        home_longitude: 103.2480000,
        school_latitude: 16.2550000,
        school_longitude: 103.2600000,
        last_seen: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
    }
];

// Simulate real-time movement for active buses
function simulateMovement(bus) {
    if (bus.status === 'active' && bus.has_location) {
        // Add small random movement (±0.001 degrees ≈ ±100 meters)
        const latOffset = (Math.random() - 0.5) * 0.002;
        const lngOffset = (Math.random() - 0.5) * 0.002;
        
        bus.current_latitude += latOffset;
        bus.current_longitude += lngOffset;
        bus.last_seen = new Date().toISOString();
    }
    return bus;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        // Simulate real-time data by adding movement to active buses
        const busData = mockBusData.map(bus => simulateMovement({...bus}));

        // Filter based on query parameters if provided
        const { status, route } = req.query;
        let filteredData = busData;

        if (status) {
            filteredData = filteredData.filter(bus => bus.status === status);
        }

        if (route) {
            filteredData = filteredData.filter(bus => 
                bus.route_name.toLowerCase().includes(route.toLowerCase())
            );
        }

        // Add summary statistics
        const summary = {
            total_buses: filteredData.length,
            active_buses: filteredData.filter(bus => bus.status === 'active').length,
            buses_with_location: filteredData.filter(bus => bus.has_location).length,
            last_updated: new Date().toISOString()
        };

        return res.status(200).json({
            success: true,
            data: filteredData,
            summary: summary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching bus locations:', error);
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่งรถบัส',
            details: error.message
        });
    }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

// Export helper function for use in other modules
export { calculateDistance };