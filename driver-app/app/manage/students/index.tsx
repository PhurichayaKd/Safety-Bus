// app/manage/students/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../../src/services/supabaseClient';

interface Student {
  student_id: number;
  student_name: string;
  grade: string;
  student_phone: string | null;
  parents: {
    parent_name: string;
    parent_phone: string;
  } | null;
  rfid_card_assignments: {
    rfid_cards: {
      rfid_code: string;
    } | null;
  }[] | null;
}

type Row = {
  student_id: number;
  student_name: string;
  grade: string;
  student_phone: string | null;
  parents: {
    parent_name: string;
    parent_phone: string;
  } | null;
  rfid_card_assignments: {
    rfid_cards: {
      rfid_code: string;
    } | null;
  }[] | null;
};

const COLORS = {
  // Background Colors
  bg: '#FAFBFC',
  bgSecondary: '#F8FAFC',
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
  
  // Primary Brand (Blue)
  primary: '#0a7ea4',
  primaryDark: '#0369A1',
  primaryLight: '#0EA5E9',
  primarySoft: '#EFF6FF',
  primaryGradient: ['#0a7ea4', '#0369A1'],
  
  // Status Colors
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  
  // Interactive States
  hover: '#F8FAFC',
  pressed: '#F1F5F9',
  focus: '#0a7ea4',
  
  // Shadows
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.15)',
  
  // Legacy aliases for backward compatibility
  sub: '#64748B',
};

export default function StudentsTablePage() {
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
        parents:parent_id(parent_name, parent_phone),
        rfid_card_assignments(rfid_cards(rfid_code))
      `)
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
      {/* left: no. badge */}
      <View style={styles.noBadge}>
        <Text style={styles.noBadgeTxt}>{item.student_id}</Text>
      </View>

      {/* center: main content */}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{item.student_name}</Text>

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Ionicons name="school-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.pillTxt}>{item.grade || '-'}</Text>
          </View>
          {item.rfid_card_assignments && item.rfid_card_assignments.length > 0 && item.rfid_card_assignments[0].rfid_cards?.rfid_code && (
            <View style={styles.pill}>
              <Ionicons name="card-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.pillTxt}>{item.rfid_card_assignments[0].rfid_cards.rfid_code.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 6 }}>
          <Text style={styles.parentLine} numberOfLines={2}>
            {item.parents?.parent_name ? item.parents.parent_name : '—'}{item.parents?.parent_phone ? ` • ${item.parents.parent_phone}` : ''}
          </Text>
        </View>
      </View>

      {/* right: chevron */}
      <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => router.push('/(tabs)/home')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>ข้อมูลนักเรียน</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/manage/students/form' as any)}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
          <Text style={styles.addBtnTxt}>เพิ่มนักเรียน</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ค้นหา ชื่อ/ชั้น/ผู้ปกครอง/เบอร์/รหัสบัตร"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {!!q && (
          <TouchableOpacity onPress={() => setQ('')} accessibilityLabel="เคลียร์คำค้น">
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ paddingTop: 24, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16 }}
          data={rows}
          keyExtractor={(it) => String(it.student_id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Ionicons name="people-outline" size={32} color="#9CA3AF" />
              <Text style={{ color: COLORS.sub, marginTop: 8 }}>ไม่พบข้อมูล</Text>
            </View>
          }
        />
      )}
    </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.card,
    ...shadow,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    width: 32, 
    height: 32, 
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  noBadgeTxt: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: COLORS.primary,
    letterSpacing: 0.1,
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
