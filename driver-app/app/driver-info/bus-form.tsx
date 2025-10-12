// app/bus-form.tsx
import React, { useEffect, useState } from 'react';
import {
  Alert, ActivityIndicator, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { router, Href, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/services/supabaseClient';
import { safeGoBack } from '../../src/utils/navigationUtils';

type RouteRow = {
  route_id: number;
  route_name: string;
  start_point: string;
  end_point: string;
  start_latitude: number | null;
  start_longitude: number | null;
  end_latitude: number | null;
  end_longitude: number | null;
};

export default function BusForm() {
  const { target, lat: qLat, lng: qLng, home_lat, home_lng, school_lat, school_lng } =
    useLocalSearchParams<{ 
      target?: string; 
      lat?: string | string[]; 
      lng?: string | string[]; 
      home_lat?: string;
      home_lng?: string;
      school_lat?: string;
      school_lng?: string;
    }>();

  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ฟิลด์ฟอร์ม (ตรงกับ driver_bus)
  const [driverName, setDriverName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(''); // จาก Auth
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [routeId, setRouteId] = useState<number | null>(null);

  // จุดเริ่ม/จุดสิ้นสุด (เก็บใน driver_bus)
  const [startLabel, setStartLabel] = useState('บ้านคนขับ');
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);

  const [endLabel, setEndLabel] = useState('โรงเรียน');
  const [schoolLat, setSchoolLat] = useState<number | null>(null);
  const [schoolLng, setSchoolLng] = useState<number | null>(null);

  // รับค่าพิกัดกลับจาก /map
  useEffect(() => {
    console.log('Parameters received:', { home_lat, home_lng, school_lat, school_lng, target, qLat, qLng });
    
    // รับค่าจากพารามิเตอร์ home_lat, home_lng, school_lat, school_lng
    if (home_lat && home_lng) {
      const nHomeLat = Number(home_lat);
      const nHomeLng = Number(home_lng);
      if (!Number.isNaN(nHomeLat) && !Number.isNaN(nHomeLng)) {
        console.log('Updating home coordinates:', nHomeLat, nHomeLng);
        setHomeLat(nHomeLat);
        setHomeLng(nHomeLng);
      }
    }
    
    if (school_lat && school_lng) {
      const nSchoolLat = Number(school_lat);
      const nSchoolLng = Number(school_lng);
      if (!Number.isNaN(nSchoolLat) && !Number.isNaN(nSchoolLng)) {
        console.log('Updating school coordinates:', nSchoolLat, nSchoolLng);
        setSchoolLat(nSchoolLat);
        setSchoolLng(nSchoolLng);
      }
    }

    // รับค่าจากพารามิเตอร์ lat, lng (สำหรับ backward compatibility)
    const getOne = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
    const latStr = getOne(qLat); const lngStr = getOne(qLng);
    if (latStr && lngStr) {
      const nLat = Number(latStr); const nLng = Number(lngStr);
      if (!Number.isNaN(nLat) && !Number.isNaN(nLng)) {
        console.log('Updating coordinates via target:', target, nLat, nLng);
        if (target === 'start') { setHomeLat(nLat); setHomeLng(nLng); }
        if (target === 'end')   { setSchoolLat(nLat);  setSchoolLng(nLng);  }
      }
    }
  }, [target, qLat, qLng, home_lat, home_lng, school_lat, school_lng]);

  // โหลด routes + user + ข้อมูล bus ของผู้ใช้
  useEffect(() => {
    (async () => {
      try {
        setLoadingRoutes(true);
        const [{ data: routeData, error: routeErr }, { data: userRes, error: userErr }] = await Promise.all([
          supabase.from('routes')
            .select('route_id, route_name, start_point, end_point, start_latitude, start_longitude, end_latitude, end_longitude')
            .order('route_name', { ascending: true }),
          supabase.auth.getUser(),
        ]);
        if (routeErr) throw routeErr;
        if (userErr) throw userErr;

        setRoutes(routeData ?? []);
        setEmail(userRes.user?.email ?? '');

        // Prefill จาก driver_bus
        if (userRes.user) {
          const { data: bus, error: busErr } = await supabase
            .from('driver_bus')
            .select('driver_name, phone_number, license_plate, capacity, route_id, home_latitude, home_longitude, school_latitude, school_longitude')
            .eq('auth_user_id', userRes.user.id)
            .maybeSingle();

          if (busErr && busErr.code !== 'PGRST116') throw busErr;
          if (bus) {
            setDriverName(bus.driver_name ?? '');
            setPhoneNumber(bus.phone_number ?? '');
            setLicensePlate(bus.license_plate ?? '');
            setCapacity(bus.capacity ? String(bus.capacity) : '');
            setRouteId(bus.route_id ?? null);
            
            // ใช้พิกัดจาก driver_bus
            setHomeLat(bus.home_latitude ?? null);
            setHomeLng(bus.home_longitude ?? null);
            setSchoolLat(bus.school_latitude ?? null);
            setSchoolLng(bus.school_longitude ?? null);

            // เติมพิกัด/ป้ายจาก routes ถ้ามี route_id และยังไม่มีพิกัดใน driver_bus
            if (bus.route_id) {
              const r = (routeData ?? []).find(x => x.route_id === bus.route_id);
              if (r) {
                setStartLabel(r.start_point || 'บ้านคนขับ');
                setEndLabel(r.end_point || 'โรงเรียน');
                
                // ใช้พิกัดจาก routes เฉพาะเมื่อยังไม่มีใน driver_bus
                if (!bus.home_latitude || !bus.home_longitude) {
                  setHomeLat(r.start_latitude ?? null);
                  setHomeLng(r.start_longitude ?? null);
                }
                if (!bus.school_latitude || !bus.school_longitude) {
                  setSchoolLat(r.end_latitude ?? null);
                  setSchoolLng(r.end_longitude ?? null);
                }
              }
            }
          }
        }
      } catch (e: any) {
        Alert.alert('ผิดพลาด', e.message ?? 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setLoadingRoutes(false);
      }
    })();
  }, []);

  // เมื่อเลือกเส้นทาง → เติมข้อมูลจาก routes
  useEffect(() => {
    if (!routeId) return;
    const r = routes.find(x => x.route_id === routeId);
    if (!r) return;

    // เติมปลายทางเสมอ
    setSchoolLat(r.end_latitude ?? null);
    setSchoolLng(r.end_longitude ?? null);
    if (!endLabel) setEndLabel(r.end_point || 'โรงเรียน');

    // ต้นทาง: ถ้าในฟอร์มยังว่างให้เติม
    if (homeLat == null || homeLng == null) {
      setHomeLat(r.start_latitude ?? null);
      setHomeLng(r.start_longitude ?? null);
    }
    if (!startLabel) setStartLabel(r.start_point || 'บ้านคนขับ');
  }, [routeId, routes, homeLat, homeLng, endLabel, startLabel]);

  const validate = () => {
    if (!driverName.trim()) return 'กรอกชื่อคนขับ';
    if (!phoneNumber.trim()) return 'กรอกเบอร์โทร';
    if (!/^\+?\d{8,15}$/.test(phoneNumber)) return 'รูปแบบเบอร์โทรไม่ถูกต้อง';
    if (!email.trim()) return 'ไม่พบอีเมลจากบัญชีผู้ใช้';
    if (!licensePlate.trim()) return 'กรอกทะเบียนรถ';
    if (!capacity || isNaN(Number(capacity)) || Number(capacity) <= 0) return 'ความจุต้องเป็นตัวเลขมากกว่า 0';
    // แนะนำให้มีอย่างน้อยจุดเริ่ม (ใช้คำนวณ/จัดเรียง)
    if (homeLat == null || homeLng == null) return 'กรุณาปักหมุด "จุดเริ่มต้น (บ้านคนขับ)"';
    return null;
  };

  const openMapPick = (which: 'start' | 'end') => {
    const lat = which === 'start' ? homeLat : schoolLat;
    const lng = which === 'start' ? homeLng : schoolLng;
    let href = `/map?returnTo=/driver-info/bus-form&target=${which}`;
    if (lat != null && lng != null) href += `&lat=${lat}&lng=${lng}`;
    
    // ส่งข้อมูลตำแหน่งทั้งหมดไปยังแผนที่เพื่อรักษาข้อมูลที่มีอยู่
    if (homeLat != null && homeLng != null) {
      href += `&home_lat=${homeLat}&home_lng=${homeLng}`;
    }
    if (schoolLat != null && schoolLng != null) {
      href += `&school_lat=${schoolLat}&school_lng=${schoolLng}`;
    }
    
    router.push(href as Href);
  };

  const onSubmit = async () => {
    await Haptics.selectionAsync();
    const errMsg = validate();
    if (errMsg) { Alert.alert('กรอกไม่ครบ', errMsg); return; }

    setSubmitting(true);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userRes.user;
      if (!user) throw new Error('ยังไม่ได้ล็อกอิน');

      // 1) อัปเซิร์ต driver_bus (รวมฟิลด์ใหม่)
      const payload: any = {
        auth_user_id: user.id,
        driver_name: driverName.trim(),
        phone_number: phoneNumber.trim(),
        username: email.trim(), // ใช้อีเมลเป็น username
        license_plate: licensePlate.trim().toUpperCase(),
        capacity: Number(capacity),
        route_id: routeId, // null = ไม่เลือก
        home_latitude: homeLat,
        home_longitude: homeLng,
        school_latitude: schoolLat,
        school_longitude: schoolLng,
      };

      const { error: upErr } = await supabase
        .from('driver_bus')
        .upsert(payload, { onConflict: 'auth_user_id' });

      if (upErr) {
        if (String(upErr.message).toLowerCase().includes('unique')) {
          Alert.alert('บันทึกไม่สำเร็จ', 'ข้อมูลซ้ำ (เบอร์โทร/ทะเบียน/อีเมล/ผู้ใช้)');
        } else {
          Alert.alert('บันทึกไม่สำเร็จ', upErr.message);
        }
        return;
      }

      Alert.alert('สำเร็จ', 'บันทึกข้อมูลรถบัสเรียบร้อย');
    } catch (err: any) {
      Alert.alert('ผิดพลาด', err.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Top bar ให้ฟีลเดียวกับฟอร์มนักเรียน */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.replace('/driver-info')} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>ข้อมูลรถบัส</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* การ์ด: บัญชี/คนขับ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ข้อมูลผู้ขับ</Text>

          <Text style={styles.label}>อีเมล (จากบัญชี)</Text>
          <TextInput style={[styles.input, { backgroundColor: '#f3f4f6' }]} value={email} editable={false} />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>ชื่อคนขับ *</Text>
              <TextInput
                style={styles.input}
                value={driverName}
                onChangeText={setDriverName}
                placeholder="เช่น สมชาย ขับดี"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>เบอร์โทร *</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="0891234567"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>ทะเบียนรถ *</Text>
              <TextInput
                style={styles.input}
                value={licensePlate}
                onChangeText={setLicensePlate}
                placeholder="กข-1234"
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>ความจุ (ที่นั่ง) *</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="12"
                keyboardType='number-pad'
              />
            </View>
          </View>


        </View>

        {/* การ์ด: เส้นทาง */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เส้นทาง</Text>
          <Text style={styles.label}>เส้นทาง (เลือกได้)</Text>
          {loadingRoutes ? (
            <ActivityIndicator />
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker 
                selectedValue={routeId} 
                onValueChange={(value) => {
                  console.log('Picker value changed:', value);
                  setRouteId(value === null || value === undefined ? null : Number(value));
                }}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                mode="dropdown"
              >
                <Picker.Item label="— ไม่เลือก —" value={null} />
                {routes.map((r) => (
                  <Picker.Item
                    key={r.route_id}
                    label={`${r.route_name} (${r.start_point} → ${r.end_point})`}
                    value={r.route_id}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* การ์ด: จุดเริ่ม/จุดสิ้นสุด */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>จุดเริ่มต้นและจุดสิ้นสุด</Text>

          {/* เริ่มต้น */}
          <Text style={styles.label}>จุดเริ่มต้น (บ้านคนขับ)</Text>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={startLabel}
              onChangeText={setStartLabel}
              placeholder="เช่น บ้านคนขับ"
            />
            <TouchableOpacity style={styles.mapBtn} onPress={() => openMapPick('start')}>
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.mapBtnTxt}>{homeLat != null && homeLng != null ? 'แก้ไขตำแหน่ง' : 'ปักหมุดแผนที่'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.coordTxt}>
            {homeLat != null && homeLng != null
              ? `เลือกแล้ว: ${homeLat.toFixed(6)}, ${homeLng.toFixed(6)}`
              : 'ยังไม่ได้ปักหมุด'}
          </Text>

          {/* สิ้นสุด */}
          <Text style={[styles.label, { marginTop: 12 }]}>จุดสิ้นสุด (โรงเรียน)</Text>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={endLabel}
              onChangeText={setEndLabel}
              placeholder="เช่น โรงเรียน ..."
            />
            <TouchableOpacity style={styles.mapBtn} onPress={() => openMapPick('end')}>
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.mapBtnTxt}>{schoolLat != null && schoolLng != null ? 'แก้ไขตำแหน่ง' : 'ปักหมุดแผนที่'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.coordTxt}>
            {schoolLat != null && schoolLng != null
              ? `เลือกแล้ว: ${schoolLat.toFixed(6)}, ${schoolLng.toFixed(6)}`
              : 'ยังไม่ได้ปักหมุด'}
          </Text>
        </View>

        {/* ปุ่มล่าง */}
        <View style={styles.formActions}>
          <TouchableOpacity disabled={submitting} style={[styles.btn, styles.btnPrimary]} onPress={onSubmit}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.btnTxt}>บันทึกข้อมูล</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>* จำเป็นต้องกรอก • ข้อมูลจะผูกกับบัญชีผู้ใช้ปัจจุบัน</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.select({ ios: 12, android: 10 }), paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF',
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  scroll: { padding: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8, color: '#0F172A' },

  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  label: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, color: '#0F172A', fontSize: 15, backgroundColor: '#fff',
  },

  pickerWrapper: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  picker: { 
    height: 50, 
    color: '#0F172A',
    backgroundColor: '#fff',
  },
  pickerItem: {
    fontSize: 15,
    color: '#0F172A',
    height: 50,
  },

  mapBtn: {
    backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 40, borderRadius: 20, marginLeft: 8,
  },
  mapBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },

  coordTxt: { fontSize: 12, color: '#111827', marginTop: 6 },

  formActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: {
    flex: 1, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  btnPrimary: { backgroundColor: '#059669' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

  hint: { fontSize: 12, color: '#666', marginTop: 8 },
});