// app/(tabs)/passenger-list.tsx - Combined Map & Passenger Management
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, Linking, Modal, Alert, Platform, Dimensions, Pressable,
  SafeAreaView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { supabase } from '../../src/services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { 
  parseDetails, 
  getSourceText, 
  getEventTypeText as getEventTypeTextFromService,
  getEventTypeIcon as getEventTypeIconFromService,
  getEventTypeColor as getEventTypeColorFromService,
  getTriggeredByText as getTriggeredByTextFromService,
  formatDateTime as formatDateTimeFromService
} from '../../src/services/emergencyService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

/* ======= CLEAN WHITE/BLUE THEME ======= */
const COLORS = {
  // Background & Surface
  bg: '#FAFBFC',
  bgSecondary: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  
  // Text Colors
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  
  // Border & Divider
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
  
  // Primary Brand (Blue theme matching homepage)
  primary: '#3B82F6',        // Blue 500 - matching homepage
  primaryDark: '#2563EB',    // Blue 600
  primaryLight: '#60A5FA',   // Blue 400
  primarySoft: '#EFF6FF',
  primaryGradient: ['#3B82F6', '#60A5FA'],
  
  // Status Colors (Phone icons green - Beautiful & Modern)
  success: '#059669',        // Emerald Green - สีเขียวมรกต สวยงาม
  successLight: '#D1FAE5',   // Light Emerald - สีเขียวอ่อนนุ่มนวล
  successSoft: '#ECFDF5',    // Soft Green Background
  successDark: '#047857',    // Dark Emerald - สีเขียวเข้มสำหรับเงา
  successBright: '#10B981',  // Bright Green - สีเขียวสดใส
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  waiting: '#6366F1',        // สีม่วงน้ำเงินสำหรับสถานะรอรับ
  waitingSoft: '#EEF2FF',    // พื้นหลังสีม่วงอ่อนนุ่มนวล
  
  // Additional Colors
  surfaceDisabled: '#F8FAFC',
  
  // Interactive States
  hover: '#F8FAFC',
  pressed: '#F1F5F9',
  focus: '#021C8B',
  
  // Shadows
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.15)',
};

// Types
type Mode = 'send' | 'stop';
type PDDEventType = 'pickup' | 'dropoff' | 'absent';
type TripPhase = 'go' | 'return';
type TripStep = 'idle' | 'boarding' | 'dropping';
type ViewMode = 'split' | 'map' | 'list';

type Student = {
  student_id: number;
  student_name: string;
  grade: string;
  student_phone?: string | null;
  status: 'active' | 'inactive' | null;
  primary_parent?: { parent_phone?: string | null } | null;
  home_latitude?: number | null;
  home_longitude?: number | null;
  stop_order?: number;
  rfid_code?: string | null;
};

type StudentWithGeo = Student & { lat: number; lng: number; dist: number };
type Pt = { lat: number; lng: number };

interface EmergencyLog {
  event_id: number;
  driver_id: number;
  event_time: string;
  event_type: 'PANIC_BUTTON' | 'SENSOR_ALERT' | 'DRIVER_INCAPACITATED';
  triggered_by: 'sensor' | 'driver' | 'student';
  details?: string;
}

const STORAGE_KEYS = {
  phase: 'trip_phase',
  resetFlag: 'reset_today_flag',
  date: 'last_trip_date',
};

const UPDATE_MS = 10000;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const shadow = Platform.select({
  ios: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
});

const shadowElevated = Platform.select({
  ios: {
    shadowColor: COLORS.shadowDark,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 6 },
});

export default function PassengerMapPage() {
  // Map states
  const webRef = useRef<WebView>(null);
  const [bus, setBus] = useState<Pt | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  
  // Passenger states
  const [phase, setPhase] = useState<TripPhase>('go');
  const [step, setStep] = useState<TripStep>('idle');
  const [mode, setMode] = useState<Mode>('send');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [mapHeight, setMapHeight] = useState(screenHeight * 0.4);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Phone popup states
  const [phonePopupVisible, setPhonePopupVisible] = useState(false);
  const [selectedForPhone, setSelectedForPhone] = useState<Student | null>(null);

  // Sets for today's events
  const [boardedGoSet, setBoardedGoSet] = useState<Set<number>>(new Set());
  const [boardedReturnSet, setBoardedReturnSet] = useState<Set<number>>(new Set());
  const [droppedGoSet, setDroppedGoSet] = useState<Set<number>>(new Set());
  const [droppedReturnSet, setDroppedReturnSet] = useState<Set<number>>(new Set());
  const [absentSet, setAbsentSet] = useState<Set<number>>(new Set());

  const [alertsVisible, setAlertsVisible] = useState(false);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverReady, setDriverReady] = useState(false);
  const [emergencyLogs, setEmergencyLogs] = useState<EmergencyLog[]>([]);

  // Date calculations
  const startOfTodayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  // Map utilities
  const driverIdRef = useRef<number | null>(null);
  const getMyDriverId = useCallback(async () => {
    if (driverIdRef.current) return driverIdRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('driver_bus').select('driver_id').eq('auth_user_id', user.id).single();
    driverIdRef.current = data?.driver_id ?? null;
    return driverIdRef.current;
  }, []);

  const calculateDistance = useCallback((a: Pt, b: Pt) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const la1 = toRad(a.lat);
    const la2 = toRad(b.lat);
    const aa = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(aa));
  }, []);

  const studentsWithGeo: StudentWithGeo[] = useMemo(() => {
    // Filter out absent students first and maintain stop_order sorting
    const activeStudents = students.filter(student => !absentSet.has(student.student_id));
    
    return activeStudents.map((student, index) => {
      const lat = student.home_latitude;
      const lng = student.home_longitude;
      return { 
        ...student, 
        lat: lat || 0, 
        lng: lng || 0, 
        dist: index + 1 // Use index as distance for display purposes (1, 2, 3...)
      };
    }) as StudentWithGeo[];
  }, [students, absentSet]);

  // Map HTML
  const mapHTML = useMemo(() => {
    const INIT = bus ?? { lat: 13.7563, lng: 100.5018 };
    return `
<!doctype html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;font-family:system-ui}
  .num{background:#0a7ea4;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font:bold 14px system-ui;border:3px solid #fff;box-shadow:0 4px 12px rgba(10,126,164,.3)}
  .bus-marker{background:#059669;width:16px;height:16px;border-radius:50%;border:4px solid #fff;box-shadow:0 4px 12px rgba(5,150,105,.4)}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map = L.map('map').setView([${INIT.lat},${INIT.lng}], 15);
L.tileLayer('${TILE_URL}', {maxZoom: 19, attribution: '&copy; OpenStreetMap'}).addTo(map);

let busMarker = L.circleMarker([${INIT.lat},${INIT.lng}],{radius:10,color:'#059669',fillColor:'#059669',fill:true,fillOpacity:.9,weight:4}).addTo(map).bindPopup('🚌 ตำแหน่งรถ');
let stuMarkers = []; let routeLine=null; let homeMarker=null; let schoolMarker=null;

function clearStudents(){stuMarkers.forEach(m=>m.remove());stuMarkers=[]; if(routeLine){routeLine.remove();routeLine=null;}}
function setBus(lat,lng){busMarker.setLatLng([lat,lng]);}
function setHome(lat,lng){
  if(homeMarker) homeMarker.remove();
  const homeIcon = L.divIcon({html:'🏠', className:'', iconSize:[24,24], iconAnchor:[12,12]});
  homeMarker = L.marker([lat,lng],{icon:homeIcon}).addTo(map).bindPopup('🏠 บ้านคนขับ');
}
function setSchool(lat,lng){
  if(schoolMarker) schoolMarker.remove();
  const schoolIcon = L.divIcon({html:'🏫', className:'', iconSize:[24,24], iconAnchor:[12,12]});
  schoolMarker = L.marker([lat,lng],{icon:schoolIcon}).addTo(map).bindPopup('🏫 โรงเรียน');
}
function addStudents(items){
  clearStudents();
  items.forEach((s, i)=>{
    const ic = L.divIcon({html:'<div class="num">'+(i+1)+'</div>', className:'', iconSize:[28,28], iconAnchor:[14,14]});
    const m = L.marker([s.lat,s.lng],{icon:ic}).addTo(map).bindPopup('👦 '+(i+1)+'. '+(s.student_name||'นักเรียน'));
    stuMarkers.push(m);
  });
}
function drawRoute(to){
  if(routeLine) {routeLine.remove();routeLine=null;}
  if(!to) return;
  routeLine = L.polyline([[to.bus.lat,to.bus.lng],[to.stu.lat,to.stu.lng]],{color:'#0a7ea4',weight:4,opacity:.8,dashArray:'10,5'}).addTo(map);
  if(to.studentName) {
    routeLine.bindPopup('🚌 ➡️ ' + to.studentName);
  }
  map.fitBounds(L.latLngBounds([[to.bus.lat,to.bus.lng],[to.stu.lat,to.stu.lng]]),{padding:[30,30]});
}

function handle(raw){
  try{
    const m = JSON.parse(raw||'{}');
    if(m.type==='bus') setBus(m.lat,m.lng);
    if(m.type==='students') addStudents(m.items||[]);
    if(m.type==='route') drawRoute(m.to||null);
    if(m.type==='home') setHome(m.lat,m.lng);
    if(m.type==='school') setSchool(m.lat,m.lng);
  }catch(e){}
}
document.addEventListener('message',e=>handle(e.data));
window.addEventListener('message',e=>handle(e.data));
</script></body></html>`;
  }, [bus]);

  const sendToMap = useCallback((payload: any) => {
    const s = JSON.stringify(payload).replace(/\\/g,'\\\\').replace(/`/g,'\\`');
    webRef.current?.injectJavaScript(`(function(){window.dispatchEvent(new MessageEvent('message',{data:\`${s}\`}));})();true;`);
  }, []);



  // Location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'ต้องการสิทธิ์เข้าถึงตำแหน่ง',
          'แอปต้องการเข้าถึงตำแหน่งของคุณเพื่อแสดงตำแหน่งรถบนแผนที่',
          [
            { text: 'ยกเลิก', style: 'cancel' },
            { text: 'ตั้งค่า', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
    }
  };

  // Check location permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  // Phase from AsyncStorage
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = (await AsyncStorage.getItem(STORAGE_KEYS.phase)) as TripPhase | null;
        setPhase(p === 'return' ? 'return' : 'go');

        const flag = await AsyncStorage.getItem(STORAGE_KEYS.resetFlag);
        if (flag) {
          softResetSets();
          // Refresh student list to include all students (reset leave status)
          await fetchStudents();
          await AsyncStorage.removeItem(STORAGE_KEYS.resetFlag);
        }
      })();
    }, [])
  );

  // Driver ID setup
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase.from('driver_bus')
        .select('driver_id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (data?.driver_id) {
        setDriverId(data.driver_id);
        setDriverReady(true);
      }
    })();
  }, []);

  const softResetSets = () => {
    setBoardedGoSet(new Set());
    setBoardedReturnSet(new Set());
    setDroppedGoSet(new Set());
    setDroppedReturnSet(new Set());
    setAbsentSet(new Set());
  };

  // Check today's leave requests
  const fetchTodayLeaveRequests = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    
    const { data, error } = await supabase
      .from('leave_requests')
      .select('student_id')
      .eq('leave_date', today)
      .eq('status', 'approved');

    if (error) {
      console.error('Error fetching leave requests:', error);
      return new Set<number>();
    }

    return new Set((data || []).map(item => item.student_id));
  }, []);

  // Load students
  const fetchStudents = useCallback(async () => {
    const driverId = await getMyDriverId();
    if (!driverId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // Get driver's route_id from driver_bus table
    const { data: driverBusData } = await supabase
      .from('driver_bus')
      .select('route_id')
      .eq('driver_id', driverId)
      .single();

    if (!driverBusData?.route_id) {
      console.error('No route found for driver');
      setStudents([]);
      setLoading(false);
      return;
    }

    // Fetch ALL students from students table with their route information and RFID
    const { data, error } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        student_phone,
        status,
        home_latitude,
        home_longitude,
        primary_parent:students_parent_id_fkey ( parent_phone ),
        route_students!left (
          stop_order,
          route_id
        ),
        rfid_card_assignments!left (
          rfid_cards (
            rfid_code
          )
        )
      `)
      .eq('is_active', true)
      .eq('rfid_card_assignments.is_active', true)
      .is('rfid_card_assignments.valid_to', null)
      .order('student_id', { ascending: true });

    if (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } else {
      // Get today's leave requests
      const leaveRequestsToday = await fetchTodayLeaveRequests();
      
      // Transform data and assign stop_order based on route assignment or default order
      const studentsData = (data || []).map((student: any, index: number) => {
        // Find route assignment for this driver's route
        const routeAssignment = student.route_students?.find((rs: any) => rs.route_id === driverBusData.route_id);
        
        // Get RFID code from assignments
        const rfidCode = student.rfid_card_assignments?.[0]?.rfid_cards?.rfid_code || null;
        
        return {
          student_id: student.student_id,
          student_name: student.student_name,
          grade: student.grade,
          student_phone: student.student_phone,
          status: student.status,
          home_latitude: student.home_latitude,
          home_longitude: student.home_longitude,
          primary_parent: student.primary_parent,
          rfid_code: rfidCode,
          stop_order: routeAssignment?.stop_order || (index + 1) // Use route stop_order or default sequential order
        };
      });
      
      // Sort by stop_order to maintain pickup sequence
      studentsData.sort((a, b) => a.stop_order - b.stop_order);
      
      const filteredStudents = studentsData.filter(student => 
        !leaveRequestsToday.has(student.student_id)
      );
      
      setStudents(filteredStudents as Student[]);
      
      // Update absent set with students on leave
      setAbsentSet(leaveRequestsToday);
    }
    setLoading(false);
  }, [fetchTodayLeaveRequests, getMyDriverId]);

  // Load today's events
  const fetchTodayEvents = useCallback(async () => {
    if (!driverId) { softResetSets(); return; }

    const { data, error } = await supabase
      .from('pickup_dropoff')
      .select('student_id,event_type,event_time,pickup_source,location_type,driver_id')
      .gte('event_time', startOfTodayISO)
      .eq('driver_id', driverId)
      .order('event_time', { ascending: true });

    if (error) {
      console.error('Error fetching today events:', error);
      softResetSets();
      return;
    }

    const gPick = new Set<number>(), rPick = new Set<number>();
    const gDrop = new Set<number>(), rDrop = new Set<number>();
    const ab = new Set<number>();

    (data || []).forEach((row: any) => {
      const sid = row.student_id as number;
      const type = row.event_type as PDDEventType;
      const loc: string = row.location_type || 'go';

      if (type === 'pickup') {
        if (loc === 'return') rPick.add(sid); else gPick.add(sid);
      } else if (type === 'dropoff') {
        if (loc === 'return') rDrop.add(sid); else gDrop.add(sid);
      } else if (type === 'absent') {
        ab.add(sid);
      }
    });

    setBoardedGoSet(gPick);
    setBoardedReturnSet(rPick);
    setDroppedGoSet(gDrop);
    setDroppedReturnSet(rDrop);
    setAbsentSet(ab);
  }, [startOfTodayISO, driverId]);

  // Load emergency logs
  const fetchEmergencyLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_logs')
        .select('*')
        .order('event_time', { ascending: false })
        .limit(20); // Get latest 20 emergency logs

      if (error) {
        console.error('Error fetching emergency logs:', error);
        setEmergencyLogs([]);
        return;
      }

      setEmergencyLogs(data || []);
    } catch (error) {
      console.error('Error fetching emergency logs:', error);
      setEmergencyLogs([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchStudents();
      await fetchTodayEvents();
    })();
  }, [fetchStudents, fetchTodayEvents]);

  // Fetch emergency logs when alerts modal is opened
  useEffect(() => {
    if (alertsVisible) {
      fetchEmergencyLogs();
    }
  }, [alertsVisible, fetchEmergencyLogs]);

  // Real-time subscription for leave requests
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const subscription = supabase
      .channel('leave_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leave_requests',
          filter: `leave_date=eq.${today}`
        },
        (payload) => {
          console.log('New leave request:', payload);
          // Refresh student list when new leave request is added for today
          fetchStudents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_requests',
          filter: `leave_date=eq.${today}`
        },
        (payload) => {
          console.log('Leave request updated:', payload);
          // Refresh student list when leave request status changes
          fetchStudents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchStudents]);

  // Location tracking - now using live_driver_locations instead of GPS
  useEffect(() => {
    let subscription: any;

    const startLocationTracking = async () => {
      const driverId = await getMyDriverId();
      if (!driverId) return;

      // Get initial position from live_driver_locations
      const { data: initialLocation } = await supabase
        .from('live_driver_locations')
        .select('latitude, longitude')
        .eq('driver_id', driverId)
        .single();

      if (initialLocation) {
        const pt = { lat: initialLocation.latitude, lng: initialLocation.longitude };
        setBus(pt);
      }

      // Subscribe to real-time updates from live_driver_locations
      subscription = supabase
        .channel('live_driver_locations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_driver_locations',
            filter: `driver_id=eq.${driverId}`
          },
          (payload) => {
            const newData = payload.new as any;
            if (newData && newData.latitude && newData.longitude) {
              const pt = { lat: newData.latitude, lng: newData.longitude };
              setBus(pt);
            }
          }
        )
        .subscribe();
    };

    startLocationTracking();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [getMyDriverId]);

  // Fetch home and school locations from driver_bus
  useEffect(() => {
    const fetchDriverBusData = async () => {
      const driverId = await getMyDriverId();
      if (!driverId) return;

      const { data: driverBusData } = await supabase
        .from('driver_bus')
        .select('home_latitude, home_longitude, school_latitude, school_longitude')
        .eq('driver_id', driverId)
        .single();

      if (driverBusData) {
        // Send home location to map
        if (driverBusData.home_latitude && driverBusData.home_longitude) {
          sendToMap({
            type: 'home',
            lat: driverBusData.home_latitude,
            lng: driverBusData.home_longitude
          });
        }

        // Send school location to map
        if (driverBusData.school_latitude && driverBusData.school_longitude) {
          sendToMap({
            type: 'school',
            lat: driverBusData.school_latitude,
            lng: driverBusData.school_longitude
          });
        }
      }
    };

    fetchDriverBusData();
  }, [getMyDriverId, sendToMap]);

  // Send data to map
  useEffect(() => { 
    if(bus) sendToMap({type:'bus', lat:bus.lat, lng:bus.lng}); 
  }, [bus, sendToMap]);
  
  useEffect(() => { 
    if(studentsWithGeo.length) sendToMap({
      type:'students',
      items:studentsWithGeo.map(s=>({
        student_id:s.student_id,
        student_name:s.student_name,
        lat:s.lat,
        lng:s.lng
      }))
    }); 
  }, [studentsWithGeo, sendToMap]);
  
  // Dynamic route to next student
  useEffect(() => { 
    if (!bus) {
      sendToMap({type:'route',to:null});
      return;
    }

    // Find the next student who hasn't been picked up yet
    const nextStudent = studentsWithGeo.find(student => {
      const isPickedUp = phase === 'go' 
        ? boardedGoSet.has(student.student_id)
        : boardedReturnSet.has(student.student_id);
      return !isPickedUp;
    });

    if (nextStudent) {
      // Draw route to next student
      sendToMap({
        type:'route', 
        to:{ 
          bus, 
          stu:{lat:nextStudent.lat, lng:nextStudent.lng},
          studentName: nextStudent.student_name
        }
      });
    } else {
      // All students picked up, draw route to school (if in 'go' phase)
      if (phase === 'go') {
        // Get school location from driver_bus data
        getMyDriverId().then(async (driverId) => {
          if (driverId) {
            const { data: driverBusData } = await supabase
              .from('driver_bus')
              .select('school_latitude, school_longitude')
              .eq('driver_id', driverId)
              .single();

            if (driverBusData?.school_latitude && driverBusData?.school_longitude) {
              sendToMap({
                type:'route', 
                to:{ 
                  bus, 
                  stu:{lat:driverBusData.school_latitude, lng:driverBusData.school_longitude},
                  studentName: 'โรงเรียน'
                }
              });
            } else {
              sendToMap({type:'route',to:null});
            }
          }
        });
      } else {
        // Return phase - no route needed when all students dropped off
        sendToMap({type:'route',to:null});
      }
    }
  }, [bus, studentsWithGeo, boardedGoSet, boardedReturnSet, phase, sendToMap, getMyDriverId]);

  // Event handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStudents(), fetchTodayEvents()]);
    setRefreshing(false);
  }, [fetchStudents, fetchTodayEvents]);

  const handleStudentPress = (student: Student) => {
    setSelected(student);
    setSheetVisible(true);
  };

  const handlePhaseToggle = async () => {
    const newPhase = phase === 'go' ? 'return' : 'go';
    setPhase(newPhase);
    await AsyncStorage.setItem(STORAGE_KEYS.phase, newPhase);
  };

  // Render functions
  const renderViewModeToggle = () => (
    <View style={styles.viewToggleContainer}>
      <TouchableOpacity
        style={[styles.viewToggleButton, viewMode === 'split' && styles.viewToggleActive]}
        onPress={() => setViewMode('split')}
      >
        <Ionicons name="grid-outline" size={18} color={viewMode === 'split' ? COLORS.card : COLORS.textSecondary} />
        <Text style={[styles.viewToggleText, viewMode === 'split' && styles.viewToggleTextActive]}>แยกหน้า</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.viewToggleButton, viewMode === 'map' && styles.viewToggleActive]}
        onPress={() => setViewMode('map')}
      >
        <Ionicons name="map-outline" size={18} color={viewMode === 'map' ? COLORS.card : COLORS.textSecondary} />
        <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>แผนที่</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleActive]}
        onPress={() => setViewMode('list')}
      >
        <Ionicons name="list-outline" size={18} color={viewMode === 'list' ? COLORS.card : COLORS.textSecondary} />
        <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>รายชื่อ</Text>
      </TouchableOpacity>
    </View>
  );

  const getStudentStatus = (student: Student) => {
    const sid = student.student_id;
    if (absentSet.has(sid)) return { status: 'absent', color: COLORS.textMuted, icon: 'close-circle', label: 'ขาด' };
    
    if (phase === 'go') {
      if (droppedGoSet.has(sid)) return { status: 'dropped', color: COLORS.success, icon: 'checkmark-circle', label: 'ส่งแล้ว' };
      if (boardedGoSet.has(sid)) return { status: 'boarded', color: COLORS.warning, icon: 'car', label: 'ขึ้นรถ' };
      return { status: 'waiting', color: COLORS.waiting, icon: 'time', label: 'รอรับ' };
    } else {
      if (droppedReturnSet.has(sid)) return { status: 'dropped', color: COLORS.success, icon: 'checkmark-circle', label: 'ส่งแล้ว' };
      if (boardedReturnSet.has(sid)) return { status: 'boarded', color: COLORS.warning, icon: 'car', label: 'ขึ้นรถ' };
      return { status: 'waiting', color: COLORS.waiting, icon: 'time', label: 'รอรับ' };
    }
  };

  const handleStudentPhonePress = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleParentPhonePress = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handlePhonePress = (student: Student) => {
    const hasStudentPhone = student.student_phone && student.student_phone.trim() !== '';
    const hasParentPhone = student.primary_parent?.parent_phone && student.primary_parent?.parent_phone.trim() !== '';
    
    // ถ้ามีเบอร์เดียว ให้โทรตรง
    if (hasStudentPhone && !hasParentPhone) {
      Linking.openURL(`tel:${student.student_phone}`);
    } else if (!hasStudentPhone && hasParentPhone) {
      Linking.openURL(`tel:${student.primary_parent?.parent_phone}`);
    } else if (hasStudentPhone && hasParentPhone) {
      // ถ้ามีทั้งสองเบอร์ ให้แสดงหน้าต่างเลือก
      setSelectedForPhone(student);
      setPhonePopupVisible(true);
    }
    // ถ้าไม่มีเบอร์เลย ไม่ทำอะไร
  };

  const handleCallStudent = () => {
    if (selectedForPhone?.student_phone) {
      Linking.openURL(`tel:${selectedForPhone.student_phone}`);
    }
    setPhonePopupVisible(false);
  };

  const handleCallParent = () => {
    if (selectedForPhone?.primary_parent?.parent_phone) {
      Linking.openURL(`tel:${selectedForPhone.primary_parent?.parent_phone}`);
    }
    setPhonePopupVisible(false);
  };

  const handleStatusUpdate = async (eventType: PDDEventType) => {
    if (!selected || !driverId) return;
    
    setSheetVisible(false);
    
    try {
      const now = new Date().toISOString();
      const location = phase === 'go' ? 'go' : 'return';
      
      if (eventType === 'absent') {
        // For absent status, insert into leave_requests table
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        
        const { error } = await supabase
          .from('leave_requests')
          .insert({
            student_id: selected.student_id,
            leave_date: today,
            status: 'approved',
            leave_type: 'กดโดยคนขับ',
            created_at: now,
            updated_at: now,
          });

        if (error) {
          console.error('Error creating leave request:', error);
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกการลาได้');
          return;
        }
      } else {
        // For pickup/dropoff, check if record exists first
        const today = new Date().toISOString().split('T')[0];
        const { data: existingRecord } = await supabase
          .from('pickup_dropoff')
          .select('id')
          .eq('student_id', selected.student_id)
          .gte('event_time', `${today}T00:00:00.000Z`)
          .lt('event_time', `${today}T23:59:59.999Z`)
          .eq('location_type', location)
          .single();

        let error;
        if (existingRecord) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('pickup_dropoff')
            .update({
              event_type: eventType,
              event_time: now,
              driver_id: driverId,
            })
            .eq('id', existingRecord.id);
          error = updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('pickup_dropoff')
            .insert({
              student_id: selected.student_id,
              driver_id: driverId,
              event_type: eventType,
              event_time: now,
              location_type: location,
            });
          error = insertError;
        }

        if (error) {
          console.error('Error updating status:', error);
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถอัปเดตสถานะได้');
          return;
        }
      }

      // Update local state
      if (eventType === 'pickup') {
        if (phase === 'go') {
          setBoardedGoSet(prev => new Set([...prev, selected.student_id]));
        } else {
          setBoardedReturnSet(prev => new Set([...prev, selected.student_id]));
        }
      } else if (eventType === 'dropoff') {
        if (phase === 'go') {
          setDroppedGoSet(prev => new Set([...prev, selected.student_id]));
        } else {
          setDroppedReturnSet(prev => new Set([...prev, selected.student_id]));
        }
      } else if (eventType === 'absent') {
        setAbsentSet(prev => new Set([...prev, selected.student_id]));
      }

      // Update statistics in AsyncStorage
      try {
        // Calculate new statistics based on current sets
        let newPickupGo = boardedGoSet.size;
        let newDropGo = droppedGoSet.size;
        let newPickupRet = boardedReturnSet.size;
        let newDropRet = droppedReturnSet.size;

        // Adjust for the new action
        if (eventType === 'pickup') {
          if (phase === 'go') {
            newPickupGo = boardedGoSet.size + 1; // +1 for the new pickup
          } else {
            newPickupRet = boardedReturnSet.size + 1; // +1 for the new pickup in return phase
          }
        } else if (eventType === 'dropoff') {
          if (phase === 'go') {
            newDropGo = droppedGoSet.size + 1; // +1 for the new dropoff
          } else {
            newDropRet = droppedReturnSet.size + 1; // +1 for the new dropoff in return phase
          }
        }
        // For absent, no change in statistics

        // Save updated statistics to AsyncStorage with new structure
        const stats = {
          pickupGo: newPickupGo,
          dropGo: newDropGo,
          pickupRet: newPickupRet,
          dropRet: newDropRet,
          total: students.length
        };
        
        await AsyncStorage.setItem('passenger_stats', JSON.stringify(stats));
      } catch (statsError) {
        console.error('Error updating statistics:', statsError);
      }

      // Show success message
      const statusText = eventType === 'pickup' ? 'ขึ้นรถแล้ว' : 
                        eventType === 'dropoff' ? 'ส่งแล้ว' : 'หยุด';
      Alert.alert('สำเร็จ', `อัปเดตสถานะ "${statusText}" สำหรับ ${selected.student_name} แล้ว`);
      
    } catch (error) {
      console.error('Error updating student status:', error);
      Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handlePanGesture = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const newHeight = mapHeight + event.nativeEvent.translationY;
      const minHeight = screenHeight * 0.2; // ขั้นต่ำ 20% - ไม่ให้รายชื่อปิดแผนที่ทั้งหมด
      const maxHeight = screenHeight * 0.8; // สูงสุด 80% - ไม่ให้แผนที่ปิดรายชื่อทั้งหมด
      
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setMapHeight(newHeight);
      }
    }
  };

  const StudentItem = ({ item, index }: { item: StudentWithGeo; index: number }) => {
    const statusInfo = getStudentStatus(item);
    const studentPhone = item.student_phone;
    const parentPhone = item.primary_parent?.parent_phone;
    
    const handlePhoneButtonPress = (e: any) => {
      e.stopPropagation();
      handlePhonePress(item);
    };
    
    return (
      <TouchableOpacity 
        style={[
          styles.studentCard,
          statusInfo.status === 'waiting' && styles.studentCardWaiting
        ]}
        onPress={() => handleStudentPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.studentNumberContainer}>
          <Text style={styles.studentNumberText}>#{index + 1}</Text>
        </View>
        <TouchableOpacity 
          style={styles.studentInfoTouchable}
          onPress={() => handleStudentPress(item)}
          activeOpacity={1}
        >
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.student_name}</Text>
            <View style={styles.studentDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="school-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.studentGrade}>ชั้น {item.grade}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.studentRfid}>RFID: {item.rfid_code || 'ไม่มี'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {/* ปุ่มโทร */}
        {(studentPhone || parentPhone) ? (
          <TouchableOpacity 
            style={styles.phoneIconButton}
            onPress={handlePhoneButtonPress}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={22} color={COLORS.successDark} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.phoneIconButton, styles.phoneIconButtonDisabled]}>
            <Ionicons name="call" size={22} color={COLORS.textMuted} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading || !driverReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  // Location permission request
  if (locationPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrap}>
            <Ionicons name="location-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>ต้องการสิทธิ์เข้าถึงตำแหน่ง</Text>
          <Text style={styles.permissionSubtitle}>
            แอปต้องการเข้าถึงตำแหน่งของคุณเพื่อแสดงตำแหน่งรถบนแผนที่และคำนวณเส้นทางไปยังนักเรียน
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestLocationPermission}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.permissionButtonText}>อนุญาต</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const total = students.length;
  const came = boardedGoSet.size;
  const back = droppedGoSet.size + droppedReturnSet.size;
  const absent = absentSet.size;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {/* Enhanced Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <View style={styles.brandSection}>
            <Ionicons name="bus" size={24} color={COLORS.primary} />
            <View style={styles.brandText}>
              <Text style={styles.appTitle}>แผนที่ & รายชื่อผู้โดยสาร</Text>
              <View style={styles.titleRow}>
                <Text style={styles.subtitle}>จัดการเส้นทางและนักเรียน</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={() => setAlertsVisible(true)} 
            style={styles.bellButton}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* View Mode Toggle */}
        {renderViewModeToggle()}

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text style={styles.statLabel}>ทั้งหมด</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {color: COLORS.warning}]}>{came}</Text>
            <Text style={styles.statLabel}>ขึ้นรถ</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {color: COLORS.success}]}>{back}</Text>
            <Text style={styles.statLabel}>ลงรถ</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {color: COLORS.textMuted}]}>{absent}</Text>
            <Text style={styles.statLabel}>ขาด</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Map Section */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <View style={[
            styles.mapSection,
            viewMode === 'map' ? styles.mapFullHeight : { height: mapHeight }
          ]}>
            <WebView 
              ref={webRef} 
              source={{ html: mapHTML }} 
              originWhitelist={['*']} 
              javaScriptEnabled 
              domStorageEnabled 
              mixedContentMode="always"
              style={styles.webview}
            />
          </View>
        )}

        {/* Resizable Divider for Split View */}
        {viewMode === 'split' && (
          <PanGestureHandler onGestureEvent={handlePanGesture}>
            <View style={styles.resizeDivider}>
              <View style={styles.resizeHandle} />
            </View>
          </PanGestureHandler>
        )}

        {/* Passenger List Section */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <View style={[
            styles.listSection,
            viewMode === 'list' ? styles.listFullHeight : styles.listSplitHeight
          ]}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>ลำดับที่ต้องรับ-ส่ง</Text>
              <Text style={styles.listSubtitle}>
                {studentsWithGeo.length} นักเรียน • เรียงตามระยะทางใกล้สุด
              </Text>
            </View>
            
            <FlatList 
              data={studentsWithGeo} 
              keyExtractor={v => String(v.student_id)} 
              renderItem={({ item, index }) => <StudentItem item={item} index={index} />} 
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              showsVerticalScrollIndicator={true}
              indicatorStyle="default"
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
              // Performance optimizations
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
              getItemLayout={(data, index) => ({
                length: 100, // Approximate height of each item (increased for more content)
                offset: 108 * index, // 100 + 8 separator
                index,
              })}
              // Better scrolling experience
              bounces={true}
              bouncesZoom={false}
              alwaysBounceVertical={true}
              scrollEventThrottle={16}
            />
          </View>
        )}
      </View>

      {/* Student Status Modal */}
      <Modal
        transparent
        visible={sheetVisible}
        animationType="fade"
        onRequestClose={() => setSheetVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setSheetVisible(false)}
        >
          <View style={styles.modalSheet}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selected?.student_name}
                </Text>
                <TouchableOpacity 
                  onPress={() => setSheetVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.modalSubtitle}>เลือกสถานะนักเรียน</Text>
                
                <TouchableOpacity 
                  style={styles.statusOption}
                  onPress={() => handleStatusUpdate('pickup')}
                >
                  <View style={[styles.statusIcon, { backgroundColor: COLORS.warning + '20' }]}>
                    <Ionicons name="car" size={20} color={COLORS.warning} />
                  </View>
                  <Text style={styles.statusOptionText}>ขึ้นรถแล้ว</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statusOption}
                  onPress={() => handleStatusUpdate('dropoff')}
                >
                  <View style={[styles.statusIcon, { backgroundColor: COLORS.success + '20' }]}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  </View>
                  <Text style={styles.statusOptionText}>ลงรถ</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statusOption}
                  onPress={() => handleStatusUpdate('absent')}
                >
                  <View style={[styles.statusIcon, { backgroundColor: COLORS.danger + '20' }]}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </View>
                  <Text style={styles.statusOptionText}>หยุด</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Phone Popup Modal */}
      <Modal
        transparent
        visible={phonePopupVisible}
        animationType="fade"
        onRequestClose={() => setPhonePopupVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setPhonePopupVisible(false)}
        >
          <View style={styles.phonePopupContainer}>
            <View style={styles.phonePopupHeader}>
              <Text style={styles.phonePopupTitle}>โทรหา</Text>
              <Text style={styles.phonePopupStudentName}>{selectedForPhone?.student_name}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setPhonePopupVisible(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.phonePopupContent}>
              {/* Student Phone */}
              {selectedForPhone?.student_phone ? (
                <TouchableOpacity 
                  style={styles.phoneContactOption}
                  onPress={handleCallStudent}
                  activeOpacity={0.7}
                >
                  <View style={[styles.phoneContactIcon, { backgroundColor: COLORS.successLight }]}>
                    <Ionicons name="person" size={24} color={COLORS.successDark} />
                  </View>
                  <View style={styles.phoneContactInfo}>
                    <Text style={styles.phoneContactLabel}>นักเรียน</Text>
                    <Text style={styles.phoneContactNumber}>{selectedForPhone.student_phone}</Text>
                  </View>
                  <Ionicons name="call" size={20} color={COLORS.successDark} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.phoneContactOption, styles.phoneContactDisabled]}>
                  <View style={[styles.phoneContactIcon, { backgroundColor: COLORS.surfaceDisabled }]}>
                    <Ionicons name="person" size={24} color={COLORS.textMuted} />
                  </View>
                  <View style={styles.phoneContactInfo}>
                    <Text style={[styles.phoneContactLabel, { color: COLORS.textMuted }]}>นักเรียน</Text>
                    <Text style={[styles.phoneContactNumber, { color: COLORS.textMuted }]}>ไม่มีเบอร์โทร</Text>
                  </View>
                </View>
              )}

              {/* Parent Phone */}
              {selectedForPhone?.primary_parent?.parent_phone ? (
                <TouchableOpacity 
                  style={styles.phoneContactOption}
                  onPress={handleCallParent}
                  activeOpacity={0.7}
                >
                  <View style={[styles.phoneContactIcon, { backgroundColor: COLORS.successLight }]}>
                    <Ionicons name="people" size={24} color={COLORS.success} />
                  </View>
                  <View style={styles.phoneContactInfo}>
                    <Text style={styles.phoneContactLabel}>ผู้ปกครอง</Text>
                    <Text style={styles.phoneContactNumber}>{selectedForPhone.primary_parent?.parent_phone}</Text>
                  </View>
                  <Ionicons name="call" size={20} color={COLORS.success} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.phoneContactOption, styles.phoneContactDisabled]}>
                  <View style={[styles.phoneContactIcon, { backgroundColor: COLORS.surfaceDisabled }]}>
                    <Ionicons name="people" size={24} color={COLORS.textMuted} />
                  </View>
                  <View style={styles.phoneContactInfo}>
                    <Text style={[styles.phoneContactLabel, { color: COLORS.textMuted }]}>ผู้ปกครอง</Text>
                    <Text style={[styles.phoneContactNumber, { color: COLORS.textMuted }]}>ไม่มีเบอร์โทร</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Emergency Alerts Modal */}
      <Modal
        transparent
        visible={alertsVisible}
        animationType="slide"
        onRequestClose={() => setAlertsVisible(false)}
      >
        <View style={styles.alertsModalBackdrop}>
          <View style={styles.alertsModalContainer}>
            <View style={styles.alertsModalHeader}>
              <Text style={styles.alertsModalTitle}>แจ้งเตือนฉุกเฉิน</Text>
              <TouchableOpacity 
                onPress={() => setAlertsVisible(false)}
                style={styles.alertsModalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.alertsModalContent}>
              {emergencyLogs.length === 0 ? (
                <View style={styles.alertsEmptyContainer}>
                  <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
                  <Text style={styles.alertsEmptyText}>ไม่มีเหตุการณ์ฉุกเฉิน</Text>
                  <Text style={styles.alertsEmptySubtext}>ระบบทำงานปกติ</Text>
                </View>
              ) : (
                <FlatList
                  data={emergencyLogs}
                  keyExtractor={(item) => item.event_id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.alertsLogItem}>
                      <View style={styles.alertsLogHeader}>
                        <View style={styles.alertsLogTypeContainer}>
                          <Ionicons
                            name={getEventTypeIconFromService(item.event_type)}
                            size={20}
                            color={getEventTypeColorFromService(item.event_type)}
                          />
                          <Text style={[styles.alertsLogType, { color: getEventTypeColorFromService(item.event_type) }]}>
                            {getEventTypeTextFromService(item.event_type)}
                          </Text>
                        </View>
                        <Text style={styles.alertsLogTime}>{formatDateTimeFromService(item.event_time)}</Text>
                      </View>
                      <View style={styles.alertsLogDetails}>
                        <Text style={styles.alertsLogDetailText}>
                          แหล่งที่มา: {getSourceText(item)}
                        </Text>
                      </View>
                    </View>
                  )}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.alertsListContainer}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionIconWrap: {
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
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
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
  mapSplitHeight: {
    height: screenHeight * 0.4,
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
    borderRadius: 16,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  studentCardWaiting: {
    backgroundColor: COLORS.waitingSoft,  // พื้นหลังสีม่วงอ่อนนุ่มนวล
    borderColor: COLORS.waiting,         // เส้นขอบสีม่วงน้ำเงิน
    borderWidth: 2,                      // เส้นขอบหนาขึ้นเพื่อให้โดดเด่น
    shadowColor: COLORS.waiting,         // เงาสีม่วงน้ำเงิน
    shadowOpacity: 0.15,                 // เงาชัดขึ้น
    shadowRadius: 10,                    // เงากว้างขึ้น
    elevation: 5,                        // ยกระดับให้สูงขึ้น
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
  studentPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  studentStatus: {
    alignItems: 'center',
    gap: 4,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  phoneButtonsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  phoneButton: {
    width: 50,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    gap: 4,
  },
  studentPhoneButton: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  parentPhoneButton: {
    backgroundColor: COLORS.successLight,  // พื้นหลังสีเขียวอ่อนสวยงาม
    borderColor: COLORS.success,          // เส้นขอบสีเขียวมรกต
    shadowColor: COLORS.successDark,      // เงาสีเขียวเข้ม
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  phoneButtonDisabled: {
    backgroundColor: COLORS.surfaceDisabled,
    borderColor: COLORS.borderLight,
  },
  phoneButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
  },
  phoneButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  phoneIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.successLight,  // สีเขียวอ่อนสวยงาม
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.success,          // เส้นขอบสีเขียวมรกต
    shadowColor: COLORS.successDark,      // เงาสีเขียวเข้ม
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  phoneIconButtonDisabled: {
    backgroundColor: COLORS.surfaceDisabled,
    borderColor: COLORS.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  resizeDivider: {
    height: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
  },
  resizeHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textTertiary,
    borderRadius: 2,
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
  // Phone Popup Styles
  phonePopupContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    marginHorizontal: 20,
    marginVertical: 60,
    maxWidth: 400,
    width: screenWidth - 40,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
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
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 76,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  phoneContactDisabled: {
    opacity: 0.6,
  },
  phoneContactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.successLight,  // พื้นหลังสีเขียวอ่อน
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.success,          // เส้นขอบสีเขียวมรกต
    shadowColor: COLORS.successDark,      // เงาสีเขียวเข้ม
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  phoneContactInfo: {
    flex: 1,
  },
  phoneContactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  phoneContactNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Emergency Alerts Modal Styles
  alertsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  alertsModalContainer: {
    width: '100%',
    height: '90%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
  },
  alertsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  alertsModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertsModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertsModalContent: {
    flex: 1,
    padding: 16,
  },
  alertsEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  alertsEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  alertsEmptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  alertsListContainer: {
    paddingBottom: 16,
  },
  alertsLogItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertsLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertsLogTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertsLogType: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertsLogTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  alertsLogDetails: {
    marginTop: 4,
  },
  alertsLogDetailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },


});