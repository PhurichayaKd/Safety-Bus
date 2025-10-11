// app/driver-info/index.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#FAFBFC',
  bgSecondary: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  primary: '#059669',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

export default function DriverInfoScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>ข้อมูลคนขับ</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/driver-info/bus-form')}
        >
          <Ionicons name="bus" size={24} color={COLORS.primary} />
          <Text style={styles.menuText}>ฟอร์มข้อมูลคนขับ</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
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
    paddingHorizontal: 16,
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

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.bg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 15,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
});