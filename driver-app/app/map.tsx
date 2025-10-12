// app/map.tsx - หน้าแผนที่เฉพาะสำหรับคนขับ
import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router, Href } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/services/supabaseClient';
import { safeGoBack } from '../src/utils/navigationUtils';

type Pt = { lat: number; lng: number };
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function DriverMap() {
  const webRef = useRef<WebView>(null);
  const { returnTo, target, lat, lng, home_lat, home_lng, school_lat, school_lng } = useLocalSearchParams<{
    returnTo?: string; 
    target?: string; 
    lat?: string; 
    lng?: string;
    home_lat?: string;
    home_lng?: string;
    school_lat?: string;
    school_lng?: string;
  }>();
  
  const [picked, setPicked] = useState<Pt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // กำหนดตำแหน่งเริ่มต้น (กรุงเทพฯ)
  const initialPosition = useMemo(() => {
    if (lat && lng) {
      return { lat: Number(lat), lng: Number(lng) };
    }
    return { lat: 13.7563, lng: 100.5018 }; // กรุงเทพฯ
  }, [lat, lng]);

  // HTML สำหรับแผนที่
  const html = useMemo(() => {
    const targetLabel = target === 'home' ? 'บ้าน' : target === 'school' ? 'โรงเรียน' : 'ตำแหน่ง';
    
    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map { 
      height: 100%; 
      margin: 0; 
      font-family: system-ui, -apple-system, sans-serif;
    }
    .marker-icon {
      background: #2563EB;
      color: white;
      border-radius: 12px;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 12px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      text-align: center;
      min-width: 60px;
    }
    .home-marker {
      background: #059669;
    }
    .school-marker {
      background: #DC2626;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div id="loading" class="loading">กำลังโหลดแผนที่...</div>
  <div id="map"></div>
  
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // ซ่อน loading เมื่อโหลดเสร็จ
    setTimeout(() => {
      document.getElementById('loading').style.display = 'none';
    }, 1000);

    const map = L.map('map').setView([${initialPosition.lat}, ${initialPosition.lng}], 15);
    
    L.tileLayer('${TILE_URL}', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    function postMessage(message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    }

    let currentMarker = null;
    
    function setMarkerPosition(lat, lng) {
      const markerClass = '${target}' === 'home' ? 'home-marker' : 
                         '${target}' === 'school' ? 'school-marker' : '';
      
      if (!currentMarker) {
        currentMarker = L.marker([lat, lng], {
          draggable: true,
          icon: L.divIcon({
            className: '',
            html: '<div class="marker-icon ' + markerClass + '">${targetLabel}</div>',
            iconSize: [80, 30],
            iconAnchor: [40, 15]
          })
        }).addTo(map);
        
        currentMarker.on('dragend', function() {
          const position = currentMarker.getLatLng();
          postMessage({
            type: 'locationPicked',
            lat: position.lat,
            lng: position.lng,
            target: '${target}'
          });
        });
      } else {
        currentMarker.setLatLng([lat, lng]);
      }
      
      postMessage({
        type: 'locationPicked',
        lat: lat,
        lng: lng,
        target: '${target}'
      });
    }

    // คลิกบนแผนที่เพื่อวางหมุด
    map.on('click', function(e) {
      setMarkerPosition(e.latlng.lat, e.latlng.lng);
    });

    // ถ้ามีตำแหน่งเริ่มต้น ให้วางหมุด
    ${(lat && lng) ? `setMarkerPosition(${Number(lat)}, ${Number(lng)});` : ''}

    // แจ้งว่าแผนที่พร้อมใช้งาน
    postMessage({ type: 'mapReady' });
  </script>
</body>
</html>`;
  }, [initialPosition, target]);

  // จัดการข้อความจาก WebView
  const handleMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event?.nativeEvent?.data || '{}');
      
      switch (message.type) {
        case 'mapReady':
          setIsLoading(false);
          break;
          
        case 'locationPicked':
          setPicked({
            lat: message.lat,
            lng: message.lng
          });
          break;
      }
    } catch (error) {
      console.error('Error parsing message from WebView:', error);
    }
  }, []);

  // ยืนยันการเลือกตำแหน่ง
  const confirmLocation = useCallback(() => {
    if (!picked) {
      Alert.alert('กรุณาเลือกตำแหน่ง', 'กรุณาคลิกบนแผนที่เพื่อเลือกตำแหน่ง');
      return;
    }

    const targetLabel = target === 'home' ? 'บ้าน' : target === 'school' ? 'โรงเรียน' : 'ตำแหน่ง';
    
    Alert.alert(
      'ยืนยันตำแหน่ง',
      `คุณต้องการบันทึกตำแหน่ง${targetLabel}นี้หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: () => {
            // ส่งข้อมูลกลับไปยังหน้าเดิม พร้อมรักษาข้อมูลตำแหน่งอื่นๆ ที่มีอยู่แล้ว
            const params = new URLSearchParams();
            
            // แปลง target เป็นชื่อพารามิเตอร์ที่ถูกต้อง
            const targetParam = target === 'start' ? 'home' : target === 'end' ? 'school' : target;
            
            // เพิ่มตำแหน่งที่เลือกใหม่
            params.set(`${targetParam}_lat`, picked.lat.toString());
            params.set(`${targetParam}_lng`, picked.lng.toString());
            
            // รักษาข้อมูลตำแหน่งอื่นๆ ที่มีอยู่แล้ว
            if (targetParam !== 'home' && home_lat && home_lng) {
              params.set('home_lat', home_lat);
              params.set('home_lng', home_lng);
            }
            if (targetParam !== 'school' && school_lat && school_lng) {
              params.set('school_lat', school_lat);
              params.set('school_lng', school_lng);
            }
            
            console.log('Navigating back with params:', params.toString());
            
            if (returnTo) {
              router.push(`${returnTo}?${params.toString()}` as Href);
            } else {
              safeGoBack('/');
            }
          }
        }
      ]
    );
  }, [picked, target, returnTo, home_lat, home_lng, school_lat, school_lng]);

  // ปุ่มย้อนกลับ
  const goBack = useCallback(() => {
    if (returnTo) {
      router.push(returnTo as Href);
    } else {
      safeGoBack('/');
    }
  }, [returnTo]);

  // ปุ่มหาตำแหน่งปัจจุบัน
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          webRef.current?.postMessage(JSON.stringify({
            type: 'setLocation',
            lat: latitude,
            lng: longitude
          }));
        },
        (error) => {
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถหาตำแหน่งปัจจุบันได้');
        }
      );
    } else {
      Alert.alert('ข้อผิดพลาด', 'อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง');
    }
  }, []);

  const targetLabel = target === 'home' ? 'บ้าน' : target === 'school' ? 'โรงเรียน' : 'ตำแหน่ง';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>เลือกตำแหน่ง{targetLabel}</Text>
        <TouchableOpacity onPress={getCurrentLocation} style={styles.locationButton}>
          <Ionicons name="location" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* แผนที่ */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webRef}
          source={{ html }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </View>

      {/* ข้อมูลตำแหน่งที่เลือก */}
      {picked && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>ตำแหน่งที่เลือก:</Text>
          <Text style={styles.infoText}>
            ละติจูด: {picked.lat.toFixed(6)}
          </Text>
          <Text style={styles.infoText}>
            ลองจิจูด: {picked.lng.toFixed(6)}
          </Text>
        </View>
      )}

      {/* ปุ่มยืนยัน */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.confirmButton, !picked && styles.disabledButton]} 
          onPress={confirmLocation}
          disabled={!picked}
        >
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={styles.confirmButtonText}>
            ยืนยันตำแหน่ง{targetLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }
  },
  android: {
    elevation: 3
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  locationButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    ...shadow,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});