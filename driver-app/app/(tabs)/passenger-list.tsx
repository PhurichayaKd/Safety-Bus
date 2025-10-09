import React, { useCallback, useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl, 
  Modal, 
  Text, 
  FlatList,
  Dimensions,
  Platform,
  StatusBar,
  Linking,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../../src/services/supabaseClient';
import { modernBoardingService, type RFIDScanEvent } from '../../src/services/modernBoardingService';
import { fetchTodayLeaveRequests } from '../../src/services/leaveRequestService';
import type { 
  Student, 
  StudentWithGeo, 
  PDDEventType, 
  BoardingStatus,
  SupabaseRfidCardAssignment
} from '../../src/types';
import COLORS from '../colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const STORAGE_KEYS = {
  phase: 'driver_phase',
  mapHeight: 'map_height'
};

const TILE_URL = 'https://tile.openstreetmap.org/tile/{z}/{x}/{y}.png';

const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 3,
  },
});

export default function PassengerList() {
  // Internal state for data that was previously passed as props
  const [bus, setBus] = useState<{ lat: number; lng: number } | null>(null);
  const [studentsWithGeo, setStudentsWithGeo] = useState<StudentWithGeo[]>([]);
  const [driverId, setDriverId] = useState<number | null>(null);
  
  // Safety check for students data
  const safeStudentsWithGeo = studentsWithGeo || [];
  
  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<'pickup' | 'dropoff'>('pickup');
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [mapHeight, setMapHeight] = useState(screenHeight * 0.4);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithGeo | null>(null);
  
  // Boarding status management
  const [boardingStatuses, setBoardingStatuses] = useState<Map<number, BoardingStatus>>(new Map());
  const [leaveRequestSet, setLeaveRequestSet] = useState<Set<number>>(new Set());
  const [onBoardSet, setOnBoardSet] = useState<Set<number>>(new Set());
  const [offBoardSet, setOffBoardSet] = useState<Set<number>>(new Set());
  const [absentSet, setAbsentSet] = useState<Set<number>>(new Set());
  
  // WebView ref for map communication
  const webViewRef = useRef<WebView>(null);

  // Internal functions that were previously passed as props
  const getMyDriverId = async (): Promise<number | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('driver_bus')
        .select('driver_id')
        .eq('auth_user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching driver ID:', error);
        return null;
      }

      return data?.driver_id || null;
    } catch (error) {
      console.error('Failed to get driver ID:', error);
      return null;
    }
  };

  const fetchStudents = async (): Promise<void> => {
    try {
      // Fetch students data with RFID information
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          student_id,
          student_name,
          grade,
          student_phone,
          home_latitude,
          home_longitude,
          is_active,
          rfid_card_assignments(
            is_active,
            rfid_cards(
              rfid_code
            )
          )
        `)
        .eq('is_active', true)
        .order('student_name');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      console.log('Students fetched:', studentsData?.length || 0);

      // Transform data to match StudentWithGeo interface
      const studentsWithGeo: StudentWithGeo[] = (studentsData || []).map(student => {
        // Get RFID code from the joined tables
        let rfidCode = null;
        if (student.rfid_card_assignments && student.rfid_card_assignments.length > 0) {
          const activeAssignment = student.rfid_card_assignments.find((assignment: any) => assignment.is_active) as unknown as SupabaseRfidCardAssignment;
          if (activeAssignment && activeAssignment.rfid_cards && activeAssignment.rfid_cards.rfid_code) {
            rfidCode = activeAssignment.rfid_cards.rfid_code;
          }
        }
        
        // Ensure RFID code is not "0", "null", empty string, or undefined
        const validRfidCode = rfidCode && 
                             rfidCode !== "0" && 
                             rfidCode !== "null" && 
                             rfidCode !== "" &&
                             String(rfidCode).trim() !== "" ? rfidCode : null;
        
        return {
          id: student.student_id,
          name: student.student_name,
          grade: student.grade,
          rfid_tag: validRfidCode || undefined,
          student_phone: student.student_phone,
          pickup_location: { 
            latitude: student.home_latitude || 0, 
            longitude: student.home_longitude || 0, 
            address: '' 
          },
          dropoff_location: { 
            latitude: student.home_latitude || 0, 
            longitude: student.home_longitude || 0, 
            address: '' 
          },
          distance: 0,
          parent_phone: '',
          route_id: undefined
        };
      });

      setStudentsWithGeo(studentsWithGeo);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      throw error;
    }
  };

  // Get current date in ISO format
  const startOfTodayISO = new Date().toISOString().split('T')[0];

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // Check if the date is valid
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Get student status with additional RFID scan data
  const getStudentStatus = (studentId: number) => {
    const boardingStatus = boardingStatuses.get(studentId);
    
    // Helper function to validate RFID tag
    const getValidRfidTag = (rfidTag: any) => {
      if (!rfidTag || rfidTag === '0' || rfidTag === 0 || rfidTag === 'null' || String(rfidTag).trim() === '') {
        return null;
      }
      return rfidTag;
    };
    
    if (leaveRequestSet.has(studentId)) {
      return { 
        status: 'leave', 
        icon: 'calendar-outline', 
        color: COLORS.warning,
        timestamp: null,
        rfidTag: null
      };
    }
    
    if (absentSet.has(studentId)) {
      return { 
        status: 'absent', 
        icon: 'close-circle', 
        color: COLORS.error,
        timestamp: null,
        rfidTag: null
      };
    }
    
    if (onBoardSet.has(studentId)) {
      return { 
        status: 'onboard', 
        icon: 'checkmark-circle', 
        color: COLORS.success,
        timestamp: boardingStatus?.timestamp || null,
        rfidTag: getValidRfidTag(boardingStatus?.rfid_tag)
      };
    }
    
    if (offBoardSet.has(studentId)) {
      return { 
        status: 'offboard', 
        icon: 'remove-circle', 
        color: COLORS.info,
        timestamp: boardingStatus?.timestamp || null,
        rfidTag: getValidRfidTag(boardingStatus?.rfid_tag)
      };
    }
    
    return { 
      status: 'pending', 
      icon: 'time-outline', 
      color: COLORS.textSecondary,
      timestamp: null,
      rfidTag: null
    };
  };

  // Load saved preferences
  const loadPreferences = async () => {
    try {
      const [savedPhase, savedMapHeight] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.phase),
        AsyncStorage.getItem(STORAGE_KEYS.mapHeight)
      ]);
      
      if (savedPhase) setPhase(savedPhase as 'pickup' | 'dropoff');
      if (savedMapHeight) setMapHeight(parseFloat(savedMapHeight));
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Initialize boarding status
  const initializeBoardingStatus = async () => {
    if (!driverId) return;
    
    try {
      await modernBoardingService.initialize(driverId);
      const currentStatuses = await modernBoardingService.getCurrentBoardingStatuses();
      // Convert to Map format expected by the component
      const statusMap = new Map();
      currentStatuses.forEach(status => {
        statusMap.set(status.student_id, {
          student_id: parseInt(status.student_id),
          status: status.last_event_type === 'pickup' ? 'boarded' : 'waiting',
          phase: phase === 'pickup' ? 'go' : 'return',
          timestamp: status.last_event_time || new Date().toISOString()
        });
      });
      setBoardingStatuses(statusMap);
      updateSetsFromBoardingStatuses(statusMap);
    } catch (error) {
      console.error('Error initializing boarding status:', error);
    }
  };

  // Update sets from boarding statuses
  const updateSetsFromBoardingStatuses = (statuses: Map<number, BoardingStatus>) => {
    const newOnBoard = new Set<number>();
    const newOffBoard = new Set<number>();
    const newAbsent = new Set<number>();
    
    statuses.forEach((status, studentId) => {
      switch (status.status) {
        case 'onboard':
          newOnBoard.add(studentId);
          break;
        case 'offboard':
          newOffBoard.add(studentId);
          break;
        case 'absent':
          newAbsent.add(studentId);
          break;
      }
    });
    
    setOnBoardSet(newOnBoard);
    setOffBoardSet(newOffBoard);
    setAbsentSet(newAbsent);
  };

  // Handle phase change
  const handlePhaseChange = async () => {
    const newPhase = phase === 'pickup' ? 'dropoff' : 'pickup';
    setPhase(newPhase);
    await AsyncStorage.setItem(STORAGE_KEYS.phase, newPhase);
  };

  // Handle status update
  const handleStatusUpdate = async (studentId: number, newStatus: 'onboard' | 'offboard' | 'absent') => {
    if (!driverId) return;
    
    try {
      // Map status values to match service interface
      const statusMapping = {
        'onboard': 'boarded' as const,
        'offboard': 'dropped' as const,
        'absent': 'absent' as const
      };
      
      const mappedStatus = statusMapping[newStatus];
      const currentPhase = phase === 'pickup' ? 'go' : 'return';
      
      // Use modern boarding service to update status
      await modernBoardingService.updateStudentStatus(
        studentId.toString(), 
        newStatus === 'onboard' ? 'onboard' : newStatus === 'offboard' ? 'offboard' : 'absent',
        phase
      );
      
      // Update local state
      const newOnBoard = new Set(onBoardSet);
      const newOffBoard = new Set(offBoardSet);
      const newAbsent = new Set(absentSet);
      
      // Remove from all sets first
      newOnBoard.delete(studentId);
      newOffBoard.delete(studentId);
      newAbsent.delete(studentId);
      
      // Add to appropriate set
      switch (newStatus) {
        case 'onboard':
          newOnBoard.add(studentId);
          break;
        case 'offboard':
          newOffBoard.add(studentId);
          break;
        case 'absent':
          newAbsent.add(studentId);
          break;
      }
      
      setOnBoardSet(newOnBoard);
      setOffBoardSet(newOffBoard);
      setAbsentSet(newAbsent);
      setShowStatusModal(false);
      
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  // Send data to map
  const sendToMap = useCallback(() => {
    if (!webViewRef.current || !bus) return;
    
    const mapData = {
      bus,
      students: safeStudentsWithGeo.map(student => ({
        ...student,
        status: getStudentStatus(student.id).status
      })),
      phase
    };
    
    const script = `
      if (window.updateMapData) {
        window.updateMapData(${JSON.stringify(mapData)});
      }
      true;
    `;
    
    webViewRef.current.postMessage(JSON.stringify(mapData));
  }, [bus, safeStudentsWithGeo, phase, onBoardSet, offBoardSet, absentSet, leaveRequestSet]);

  // Load driver ID on mount
  useEffect(() => {
    const loadDriverId = async () => {
      try {
        const id = await getMyDriverId();
        setDriverId(id);
      } catch (error) {
        console.error('Error loading driver ID:', error);
      }
    };
    
    loadDriverId();
  }, []);

  // Load students when driver ID is available
  useEffect(() => {
    if (driverId) {
      const loadStudents = async () => {
        try {
          await fetchStudents();
          // fetchStudents already calls setStudentsWithGeo internally
        } catch (error) {
          console.error('Error loading students:', error);
        }
      };
      
      loadStudents();
    }
  }, [driverId]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
          await Promise.all([
            loadPreferences(),
            requestLocationPermission(),
            initializeBoardingStatus(),
            fetchTodayLeaveRequests().then(setLeaveRequestSet)
          ]);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }, [driverId])
  );

  // Subscribe to RFID scans
  useEffect(() => {
    if (!driverId) return;
    
    const unsubscribe = modernBoardingService.subscribeToRFIDScans((event: RFIDScanEvent) => {
      console.log('RFID scan event received:', event);
      
      // Update boarding statuses
      setBoardingStatuses(prev => {
        const updated = new Map(prev);
        const studentId = parseInt(event.student_id, 10);
        updated.set(studentId, {
          student_id: studentId,
          status: event.status,
          phase: event.phase,
          timestamp: event.timestamp,
          rfid_tag: event.rfid_tag
        });
        
        // Update sets
        updateSetsFromBoardingStatuses(updated);
        
        return updated;
      });
      
      // Show notification
      const studentId = parseInt(event.student_id, 10);
      const student = safeStudentsWithGeo.find(s => s.id === studentId);
      if (student) {
        const statusText = event.status === 'onboard' ? 'ขึ้นรถ' : 'ลงรถ';
        Alert.alert(
          'RFID Scan',
          `${student.name} ${statusText}\nเวลา: ${formatTimestamp(event.timestamp)}\nRFID: ${event.rfid_tag}`,
          [{ text: 'ตกลง' }]
        );
        
        // Auto-focus map to next pending student when someone boards
        if (event.status === 'onboard') {
          focusMapToNextStudent(studentId);
        }
      }
    });
    
    return unsubscribe;
  }, [driverId, safeStudentsWithGeo]);

  // Function to focus map to next pending student
  const focusMapToNextStudent = useCallback((currentStudentId: number) => {
    const currentIndex = safeStudentsWithGeo.findIndex(s => s.id === currentStudentId);
    
    // Find next student who hasn't boarded yet
    for (let i = currentIndex + 1; i < safeStudentsWithGeo.length; i++) {
      const student = safeStudentsWithGeo[i];
      const status = getStudentStatus(student.id);
      
      if (status.status === 'pending' && student.lat && student.lng) {
        // Send message to map to focus on this student
        if (webViewRef.current) {
          const message = JSON.stringify({
            action: 'focusStudent',
            studentId: student.id,
            lat: student.lat,
            lng: student.lng,
            name: student.name
          });
          webViewRef.current.postMessage(message);
        }
        break;
      }
    }
  }, [safeStudentsWithGeo, getStudentStatus]);

  // Update map when data changes
  useEffect(() => {
    sendToMap();
  }, [sendToMap]);

  // Calculate statistics
  const totalStudents = safeStudentsWithGeo.length;
  const onBoardCount = onBoardSet.size;
  const offBoardCount = offBoardSet.size;
  const absentCount = absentSet.size;

  // HTML template for map
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Student Tracking Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100%; }
        .next-student-marker {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let map, busMarker;
        let studentMarkers = [];
        let nextStudentMarker = null;
        
        function initMap() {
          map = L.map('map').setView([13.7563, 100.5018], 13);
          L.tileLayer('${TILE_URL}').addTo(map);
        }
        
        function updateMapData(data) {
          if (!map) initMap();
          
          // Update bus marker
          if (data.bus && busMarker) {
            busMarker.setLatLng([data.bus.lat, data.bus.lng]);
          } else if (data.bus) {
            busMarker = L.marker([data.bus.lat, data.bus.lng], {
              icon: L.divIcon({
                html: '🚌',
                iconSize: [30, 30],
                className: 'bus-marker'
              })
            }).addTo(map);
          }
          
          // Clear existing student markers
          studentMarkers.forEach(marker => map.removeLayer(marker));
          studentMarkers = [];
          
          // Add student markers
          data.students.forEach(student => {
            if (student.lat && student.lng) {
              const statusColors = {
                onboard: '#10B981',
                offboard: '#3B82F6', 
                absent: '#EF4444',
                leave: '#F59E0B',
                pending: '#6B7280'
              };
              
              const marker = L.circleMarker([student.lat, student.lng], {
                radius: 8,
                fillColor: statusColors[student.status] || statusColors.pending,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
              }).addTo(map);
              
              marker.bindPopup(\`
                <div style="text-align: center;">
                  <strong>\${student.name}</strong><br>
                  ชั้น: \${student.grade}<br>
                  สถานะ: \${student.status}
                </div>
              \`);
              
              studentMarkers.push(marker);
            }
          });
          
          // Fit map to show all markers
          if (data.bus || studentMarkers.length > 0) {
            const group = new L.featureGroup([
              ...(busMarker ? [busMarker] : []),
              ...studentMarkers
            ]);
            if (group.getLayers().length > 0) {
              map.fitBounds(group.getBounds().pad(0.1));
            }
          }
        }
        
        function focusOnStudent(studentData) {
          if (!map) return;
          
          // Remove previous next student marker
          if (nextStudentMarker) {
            map.removeLayer(nextStudentMarker);
          }
          
          // Create highlighted marker for next student
          nextStudentMarker = L.circleMarker([studentData.lat, studentData.lng], {
            radius: 12,
            fillColor: '#F59E0B',
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9,
            className: 'next-student-marker'
          }).addTo(map);
          
          nextStudentMarker.bindPopup(\`
            <div style="text-align: center;">
              <strong>🎯 นักเรียนคนถัดไป</strong><br>
              <strong>\${studentData.name}</strong><br>
              <em>กำลังรอขึ้นรถ</em>
            </div>
          \`).openPopup();
          
          // Focus map on this student with smooth animation
          map.setView([studentData.lat, studentData.lng], 16, {
            animate: true,
            duration: 1.5
          });
          
          // Auto-close popup after 3 seconds
          setTimeout(() => {
            if (nextStudentMarker) {
              nextStudentMarker.closePopup();
            }
          }, 3000);
        }
        
        // Initialize map
        initMap();
        
        // Listen for messages from React Native
        window.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            
            if (data.action === 'focusStudent') {
              focusOnStudent(data);
            } else {
              updateMapData(data);
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        });
        
        // For Android
        document.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            
            if (data.action === 'focusStudent') {
              focusOnStudent(data);
            } else {
              updateMapData(data);
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        });
      </script>
    </body>
    </html>
  `;

  // Student item component
  const StudentItem = ({ item, index }: { item: StudentWithGeo; index: number }) => {
    const studentStatus = getStudentStatus(item.id);
    
    return (
      <View style={[styles.studentCard, { marginBottom: index === safeStudentsWithGeo.length - 1 ? 0 : 12 }]}>
        <View style={styles.studentNumberContainer}>
          <Text style={styles.studentNumberText}>#{item.student_number}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.studentInfoTouchable}
          onPress={() => {
            setSelectedStudent(item);
            setShowStatusModal(true);
          }}
        >
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name}</Text>
            <View style={styles.studentDetails}>
              <Text style={styles.studentGrade}>ชั้น {item.grade}</Text>
              <Text style={styles.studentRfid}>
                RFID: {item.rfid_tag || 'ยังไม่ได้กำหนด'}
              </Text>
              {/* Status indicator below RFID */}
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.statusText,
                  {
                    color: studentStatus.status === 'onboard' ? COLORS.success : 
                           studentStatus.status === 'offboard' ? COLORS.info : 
                           COLORS.textSecondary,
                    backgroundColor: studentStatus.status === 'onboard' ? COLORS.successSoft : 
                                   studentStatus.status === 'offboard' ? COLORS.infoSoft : 
                                   COLORS.bgSecondary
                  }
                ]}>
                  สถานะ: {studentStatus.status === 'onboard' ? 'ขึ้นรถ' : 
                          studentStatus.status === 'offboard' ? 'ลงรถ' : 
                          'รอขึ้นรถ'}
                </Text>
              </View>
              {item.distance && item.distance > 0 && (
                <Text style={styles.studentDistance}>{item.distance.toFixed(1)} กม.</Text>
              )}
              {studentStatus.timestamp && (
                <Text style={styles.studentTimestamp}>
                  {studentStatus.status === 'onboard' ? 'ขึ้นรถ' : 'ลงรถ'}: {formatTimestamp(studentStatus.timestamp)}
                </Text>
              )}
              {studentStatus.rfidTag && studentStatus.rfidTag !== '0' && studentStatus.rfidTag !== 0 && (
                <Text style={styles.studentRfidScan}>สแกน: {studentStatus.rfidTag}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.studentStatus}>
          <View style={[styles.statusIndicator, { backgroundColor: studentStatus.color }]}>
            <Ionicons name={studentStatus.icon as any} size={16} color={COLORS.card} />
          </View>
          {(() => {
            const formattedTime = formatTimestamp(studentStatus.timestamp);
            return formattedTime ? (
              <Text style={[styles.statusTime, { color: studentStatus.color }]}>
                {formattedTime}
              </Text>
            ) : null;
          })()}
        </View>
        
        <TouchableOpacity 
          style={styles.phoneIconButton}
          onPress={() => {
            setSelectedStudent(item);
            setShowPhoneModal(true);
          }}
        >
          <Ionicons name="call" size={20} color={COLORS.success} />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 16, color: COLORS.textSecondary }}>กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasLocationPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Ionicons name="location-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>ต้องการสิทธิ์เข้าถึงตำแหน่ง</Text>
          <Text style={styles.permissionSubtitle}>
            แอปต้องการเข้าถึงตำแหน่งของคุณเพื่อแสดงตำแหน่งรถบนแผนที่และติดตามนักเรียน
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestLocationPermission}>
            <Ionicons name="location" size={20} color={COLORS.card} />
            <Text style={styles.permissionButtonText}>อนุญาตการเข้าถึง</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <View style={styles.brandSection}>
            <View style={styles.brandText}>
              <Text style={styles.appTitle}>แผนที่และรายชื่อ</Text>
              <View style={styles.titleRow}>
                <Text style={styles.subtitle}>ระบบติดตามนักเรียน</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.phaseButton} onPress={handlePhaseChange}>
            <Text style={styles.phaseButtonText}>
              {phase === 'pickup' ? 'รับนักเรียน' : 'ส่งนักเรียน'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* View Toggle */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'map' && styles.viewToggleActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons 
              name="map-outline" 
              size={16} 
              color={viewMode === 'map' ? COLORS.card : COLORS.textSecondary} 
            />
            <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>
              แผนที่
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'split' && styles.viewToggleActive]}
            onPress={() => setViewMode('split')}
          >
            <Ionicons 
              name="grid-outline" 
              size={16} 
              color={viewMode === 'split' ? COLORS.card : COLORS.textSecondary} 
            />
            <Text style={[styles.viewToggleText, viewMode === 'split' && styles.viewToggleTextActive]}>
              แบ่งหน้าจอ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons 
              name="list-outline" 
              size={16} 
              color={viewMode === 'list' ? COLORS.card : COLORS.textSecondary} 
            />
            <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
              รายชื่อ
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalStudents}</Text>
            <Text style={styles.statLabel}>ทั้งหมด</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{onBoardCount}</Text>
            <Text style={styles.statLabel}>ขึ้นรถ</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.info }]}>{offBoardCount}</Text>
            <Text style={styles.statLabel}>ลงรถ</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.error }]}>{absentCount}</Text>
            <Text style={styles.statLabel}>ขาด</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Map Section */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <View style={[
            styles.mapSection, 
            viewMode === 'map' ? styles.mapFullHeight : { height: mapHeight }
          ]}>
            <WebView
              ref={webViewRef}
              source={{ html: mapHTML }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              onMessage={(event) => {
                console.log('WebView message:', event.nativeEvent.data);
              }}
            />
          </View>
        )}

        {/* List Section */}
        {(viewMode === 'list' || viewMode === 'split') && (
          <View style={[
            styles.listSection,
            viewMode === 'list' ? styles.listFullHeight : styles.listSplitHeight
          ]}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>รายชื่อนักเรียน</Text>
              <Text style={styles.listSubtitle}>
                {phase === 'pickup' ? 'รอบรับนักเรียน' : 'รอบส่งนักเรียน'} • {totalStudents} คน
              </Text>
            </View>
            <FlatList
              data={safeStudentsWithGeo}
              keyExtractor={(item) => item.id.toString()}
              renderItem={StudentItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={fetchStudents}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
            />
          </View>
        )}
      </View>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>อัปเดตสถานะ</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowStatusModal(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                {selectedStudent?.name} (ชั้น {selectedStudent?.grade})
              </Text>
              
              <TouchableOpacity 
                style={styles.statusOption}
                onPress={() => selectedStudent && handleStatusUpdate(selectedStudent.id, 'onboard')}
              >
                <View style={[styles.statusIcon, { backgroundColor: COLORS.success }]}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.card} />
                </View>
                <Text style={styles.statusOptionText}>ขึ้นรถแล้ว</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statusOption}
                onPress={() => selectedStudent && handleStatusUpdate(selectedStudent.id, 'offboard')}
              >
                <View style={[styles.statusIcon, { backgroundColor: COLORS.info }]}>
                  <Ionicons name="remove-circle" size={20} color={COLORS.card} />
                </View>
                <Text style={styles.statusOptionText}>ลงรถแล้ว</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statusOption}
                onPress={() => selectedStudent && handleStatusUpdate(selectedStudent.id, 'absent')}
              >
                <View style={[styles.statusIcon, { backgroundColor: COLORS.error }]}>
                  <Ionicons name="close-circle" size={20} color={COLORS.card} />
                </View>
                <Text style={styles.statusOptionText}>ขาดเรียน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Phone Modal */}
      <Modal
        visible={showPhoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPhoneModal(false)}
        >
          <View style={styles.phonePopupContainer}>
            <View style={styles.phonePopupHeader}>
              <Text style={styles.phonePopupTitle}>โทรศัพท์</Text>
              <Text style={styles.phonePopupStudentName}>{selectedStudent?.name}</Text>
              <TouchableOpacity onPress={() => setShowPhoneModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.phonePopupContent}>
              {selectedStudent?.student_phone && (
                <TouchableOpacity 
                  style={styles.phoneContactOption}
                  onPress={() => {
                    Linking.openURL(`tel:${selectedStudent.student_phone}`);
                    setShowPhoneModal(false);
                  }}
                >
                  <View style={[styles.phoneContactIcon, { backgroundColor: COLORS.primary }]}>
                    <Ionicons name="person" size={24} color={COLORS.card} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.phoneContactTitle}>โทรหานักเรียน</Text>
                    <Text style={styles.phoneContactNumber}>{selectedStudent.student_phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              
              {selectedStudent?.parent_phone && (
                <TouchableOpacity 
                  style={styles.phoneContactOption}
                  onPress={() => {
                    Linking.openURL(`tel:${selectedStudent.parent_phone}`);
                    setShowPhoneModal(false);
                  }}
                >
                  <View style={[styles.phoneContactIcon, { backgroundColor: COLORS.success }]}>
                    <Ionicons name="people" size={24} color={COLORS.card} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.phoneContactTitle}>โทรหาผู้ปกครอง</Text>
                    <Text style={styles.phoneContactNumber}>{selectedStudent.parent_phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerContainer: {
    backgroundColor: COLORS.card,
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...shadow,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  brandText: {
    flex: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  phaseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  phaseButtonText: {
    color: COLORS.card,
    fontSize: 14,
    fontWeight: '600',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewToggleActive: {
    backgroundColor: COLORS.primary,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  viewToggleTextActive: {
    color: COLORS.card,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
  },
  mapSection: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  mapFullHeight: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  listSection: {
    backgroundColor: COLORS.bg,
  },
  listSplitHeight: {
    flex: 1,
  },
  listFullHeight: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 120,
    flexGrow: 1,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    ...shadow,
  },
  studentNumberContainer: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignSelf: 'flex-start',
  },
  studentNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  studentInfoTouchable: {
    flex: 1,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  studentDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studentGrade: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  studentRfid: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  studentDistance: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  studentTimestamp: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  studentRfidScan: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 4,
    marginBottom: 2,
  },
  statusTextSecondary: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    textAlign: 'center',
    overflow: 'hidden',
  },
  studentStatus: {
    alignItems: 'center',
    gap: 4,
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTime: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  phoneIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.success,
    ...shadow,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  permissionButtonText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  phonePopupContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 40,
    maxWidth: screenWidth - 32,
    width: '100%',
    alignSelf: 'center',
    ...shadow,
  },
  phonePopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  phonePopupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  phonePopupStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  phonePopupContent: {
    padding: 24,
    gap: 16,
  },
  phoneContactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
  },
  phoneContactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneContactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  phoneContactNumber: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});