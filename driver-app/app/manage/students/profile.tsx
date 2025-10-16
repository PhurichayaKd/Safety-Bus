// app/profile.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../../src/services/supabaseClient';
import { safeGoBack } from '../../../src/utils/navigationUtils';

type Row = {
  student_id: number;
  student_name: string;
  grade: string;
  student_phone: string | null;
  parents: {
    parent_name: string;
    parent_phone: string;
    parent_line_links: {
      line_display_id: string;
      active: boolean;
    }[];
  } | null;
  student_guardians: {
    parents: {
      parent_name: string;
      parent_phone: string;
      parent_line_links: {
        line_display_id: string;
        active: boolean;
      }[];
    };
    is_primary: boolean;
  }[] | null;
  rfid_card_assignments: {
    rfid_cards: {
      rfid_code: string;
    } | null;
  }[] | null;
};

const COLORS = {
  // Background Colors
  bg: '#F8F9FA',
  bgSecondary: '#F1F3F4',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  
  // Text Colors
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Border Colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Primary Colors (ใช้โทนสีฟ้าเดียวกับหน้าหลัก)
  primary: '#3B82F6',
  primarySoft: '#EBF4FF',
  primaryLight: '#DBEAFE',
  
  // Status Colors
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#EBF4FF',
  
  // Shadow Colors
  shadow: '#000000',
  shadowDark: '#000000',
  
  // Legacy aliases for backward compatibility
  sub: '#9CA3AF',
};

export default function ProfilePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchList = async (keyword?: string) => {
    setLoading(true);
    const query = supabase
      .from('students')
      .select(`
        student_id, 
        student_name, 
        grade, 
        student_phone,
        parents:parent_id(
          parent_name, 
          parent_phone,
          parent_line_links!inner(line_display_id, active)
        ),
        student_guardians(
          parents(
            parent_name, 
            parent_phone,
            parent_line_links!inner(line_display_id, active)
          ),
          is_primary
        ),
        rfid_card_assignments(rfid_cards(rfid_code))
      `)
      .eq('parents.parent_line_links.active', true)
      .eq('student_guardians.parents.parent_line_links.active', true)
      .order('student_id', { ascending: true });

    if (keyword && keyword.trim()) {
      const k = keyword.trim();
      query.or(
        `student_name.ilike.%${k}%,grade.ilike.%${k}%,student_phone.ilike.%${k}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      Alert.alert('โหลดข้อมูลไม่สำเร็จ', error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as Row[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchList(); }, []);

  // Refresh data when page gets focus (e.g., returning from edit page)
  useFocusEffect(
    React.useCallback(() => {
      fetchList(q);
    }, [q])
  );

  // debounce search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchList(q), 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchList(q);
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Row }) => (
    <TouchableOpacity
      style={styles.cardRow}
      onPress={() => router.push({ pathname: '/manage/students/form', params: { id: String(item.student_id) } } as any)}
      activeOpacity={0.9}
    >
      {/* left: student ID display - เอาวงกลมออกและทำให้สวยงาม */}
      <View style={styles.noBadge}>
        <Text style={styles.noBadgeTxt}>{item.student_id}</Text>
      </View>

      {/* center: main content */}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{item.student_name}</Text>

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Ionicons name="school-outline" size={12} color={COLORS.text} />
            <Text style={styles.pillTxt}>{item.grade}</Text>
          </View>
          {item.rfid_card_assignments && item.rfid_card_assignments.length > 0 && item.rfid_card_assignments[0].rfid_cards?.rfid_code && (
            <View style={styles.pill}>
              <Ionicons name="card-outline" size={12} color={COLORS.text} />
              <Text style={styles.pillTxt}>{item.rfid_card_assignments[0].rfid_cards.rfid_code}</Text>
            </View>
          )}
        </View>

        {/* แสดงข้อมูลผู้ปกครองจาก student_guardians หรือ parents */}
        {(() => {
          // ลองใช้ข้อมูลจาก student_guardians ก่อน
          if (item.student_guardians && item.student_guardians.length > 0) {
            const primaryGuardian = item.student_guardians.find(g => g.is_primary) || item.student_guardians[0];
            const lineId = primaryGuardian.parents.parent_line_links?.find(link => link.active)?.line_display_id;
            return (
              <Text style={styles.parentLine} numberOfLines={1}>
                ผู้ปกครอง: {primaryGuardian.parents.parent_name} {primaryGuardian.parents.parent_phone && `(${primaryGuardian.parents.parent_phone})`} {lineId && `LINE: ${lineId}`}
              </Text>
            );
          }
          // ถ้าไม่มีใน student_guardians ให้ใช้ parents (legacy)
          if (item.parents) {
            const lineId = item.parents.parent_line_links?.find(link => link.active)?.line_display_id;
            return (
              <Text style={styles.parentLine} numberOfLines={1}>
                ผู้ปกครอง: {item.parents.parent_name} {item.parents.parent_phone && `(${item.parents.parent_phone})`} {lineId && `LINE: ${lineId}`}
              </Text>
            );
          }
          return null;
        })()}
      </View>

      {/* right: arrow */}
      <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>ข้อมูลนักเรียน</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/manage/students/form')}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.addBtnTxt}>เพิ่มนักเรียน</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.sub} />
        <TextInput
          style={styles.searchInput}
          value={q}
          onChangeText={setQ}
          placeholder="ค้นหาชื่อ, ชั้น, บัตร, ผู้ปกครอง..."
          placeholderTextColor={COLORS.sub}
        />
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 8, color: COLORS.sub }}>กำลังโหลด...</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.student_id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="people-outline" size={48} color={COLORS.sub} />
              <Text style={{ marginTop: 12, color: COLORS.sub, fontSize: 16 }}>ไม่พบข้อมูล</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

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

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },

  topBar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 24 : 16,
    paddingTop: Platform.select({ ios: 16, android: 14 }),
    paddingBottom: 14,
    borderBottomWidth: 1, 
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.card,
    ...shadow,
  },
  iconBtn: {
    width: 40, 
    height: 40, 
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  addBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 16, 
    height: 42, 
    borderRadius: 12,
    ...shadow,
  },
  addBtnTxt: { 
    color: '#fff', 
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  searchWrap: {
    marginTop: 12, 
    marginHorizontal: isTablet ? 24 : 16,
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 16,
    paddingHorizontal: 16, 
    height: 48, 
    backgroundColor: COLORS.card,
    ...shadow,
  },
  searchInput: { 
    flex: 1, 
    paddingVertical: 0, 
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },

  cardRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1, 
    borderColor: COLORS.border,
    paddingHorizontal: 16, 
    paddingVertical: 16,
    marginTop: 12,
    ...shadow,
  },
  noBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    alignSelf: 'flex-start',
  },
  noBadgeTxt: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: COLORS.primary,
    letterSpacing: -0.2,
  },

  name: { 
    fontWeight: '800', 
    color: COLORS.text, 
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 20,
  },

  metaRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 8 
  },
  pill: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    borderWidth: 1, 
    borderColor: COLORS.borderLight, 
    borderRadius: 9999,
    paddingHorizontal: 10, 
    height: 28, 
    backgroundColor: COLORS.bgSecondary,
  },
  pillTxt: { 
    fontSize: 12, 
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  parentLine: { 
    color: COLORS.textTertiary, 
    fontSize: 13, 
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '500',
  },
});