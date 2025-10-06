import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllAvailableRfidCards, AvailableRfidCard } from '../../src/services/rfidService';

const COLORS = {
  bg: '#F8FAFC',
  bgSecondary: '#F1F5F9',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderAccent: '#CBD5E1',
  primary: '#021C8B',
  primaryLight: '#1E40AF',
  primarySoft: '#EFF6FF',
  success: '#059669',
  successSoft: '#ECFDF5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  accent: '#6366F1',
  accentSoft: '#F0F9FF',
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowMedium: 'rgba(15, 23, 42, 0.12)',
  shadowDark: 'rgba(15, 23, 42, 0.15)',
  shadowHeavy: 'rgba(15, 23, 42, 0.25)',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

interface RfidCardSelectorProps {
  onSelect: (card: AvailableRfidCard) => void;
  selectedCardId?: number | null;
  placeholder?: string;
  value?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function RfidCardSelector({ 
  onSelect, 
  selectedCardId,
  placeholder = "เลือกบัตร RFID",
  value = ""
}: RfidCardSelectorProps) {
  const [cards, setCards] = useState<AvailableRfidCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredCards, setFilteredCards] = useState<AvailableRfidCard[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // โหลดข้อมูลบัตร RFID เมื่อเปิด dropdown
  useEffect(() => {
    if (isOpen && cards.length === 0) {
      loadCards();
    }
  }, [isOpen]);

  // กรองข้อมูลตามการค้นหา
  useEffect(() => {
    if (searchText.trim()) {
      const filtered = cards.filter(card => 
        card.rfid_code.toLowerCase().includes(searchText.toLowerCase()) ||
        card.card_id.toString().includes(searchText.toLowerCase())
      );
      setFilteredCards(filtered);
    } else {
      setFilteredCards(cards);
    }
  }, [cards, searchText]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const availableCards = await getAllAvailableRfidCards();
      setCards(availableCards);
    } catch (error) {
      console.error('Failed to load RFID cards:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (card: AvailableRfidCard) => {
    onSelect(card);
    setIsOpen(false);
    setSearchText('');
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchText('');
    }
  };

  const renderCard = ({ item }: { item: AvailableRfidCard }) => {
    const isSelected = selectedCardId === item.card_id;
    
    return (
      <TouchableOpacity
        style={[
          styles.dropdownItem,
          isSelected && styles.dropdownItemSelected
        ]}
        onPress={() => handleSelect(item)}
      >
        <View style={[
          styles.cardIcon,
          isSelected && styles.cardIconSelected
        ]}>
          <Ionicons 
            name="card-outline" 
            size={16} 
            color={isSelected ? COLORS.primary : COLORS.textMuted} 
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[
            styles.cardCode,
            isSelected && styles.cardCodeSelected
          ]}>
            {item.rfid_code}
          </Text>
          <Text style={styles.cardId}>
            ID: {item.card_id}
          </Text>
        </View>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={18} 
            color={COLORS.success} 
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Dropdown Trigger */}
      <TouchableOpacity
        style={[styles.trigger, isOpen && styles.triggerOpen]}
        onPress={toggleDropdown}
      >
        <View style={styles.triggerContent}>
          <Ionicons 
            name="card-outline" 
            size={18} 
            color={value ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[
            styles.triggerText,
            value ? styles.triggerTextSelected : styles.triggerTextPlaceholder
          ]}>
            {value || placeholder}
          </Text>
        </View>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={COLORS.textMuted} 
        />
      </TouchableOpacity>

      {/* Modal Dropdown */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <TouchableOpacity 
            style={styles.modal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>เลือกบัตร RFID</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="ค้นหารหัสบัตร..."
                placeholderTextColor={COLORS.textMuted}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
              ) : filteredCards.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="card-outline" size={24} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {searchText ? 'ไม่พบบัตรที่ค้นหา' : 'ไม่พบบัตรว่าง'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchText 
                      ? 'ลองค้นหาด้วยรหัสอื่น' 
                      : 'บัตร RFID ทั้งหมดถูกใช้งานแล้ว'
                    }
                  </Text>
                  {searchText && (
                    <TouchableOpacity 
                      style={styles.clearSearchButton}
                      onPress={() => setSearchText('')}
                    >
                      <Text style={styles.clearSearchText}>ล้างการค้นหา</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <ScrollView 
                  style={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredCards.map((item) => (
                    <TouchableOpacity
                      key={item.card_id}
                      style={[
                        styles.cardItem,
                        selectedCardId === item.card_id && styles.cardItemSelected
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <View style={styles.cardContent}>
                        <View style={[
                          styles.cardIcon,
                          selectedCardId === item.card_id && styles.cardIconSelected
                        ]}>
                          <Ionicons 
                            name="card-outline" 
                            size={20} 
                            color={selectedCardId === item.card_id ? COLORS.primary : COLORS.textMuted} 
                          />
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={[
                            styles.cardCode,
                            selectedCardId === item.card_id && styles.cardCodeSelected
                          ]}>
                            {item.rfid_code}
                          </Text>
                          <Text style={styles.cardId}>
                            ID: {item.card_id}
                          </Text>
                        </View>
                        {selectedCardId === item.card_id && (
                          <Ionicons 
                            name="checkmark-circle" 
                            size={24} 
                            color={COLORS.success} 
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Footer */}
            {!loading && filteredCards.length > 0 && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  พบบัตรว่าง {filteredCards.length} ใบ
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const shadowCard = Platform.select({
  ios: {
    shadowColor: COLORS.shadowMedium,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  android: { elevation: 4 },
});

const shadowCardSelected = Platform.select({
  ios: {
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 8 },
});

const shadowElevated = Platform.select({
  ios: {
    shadowColor: COLORS.shadowHeavy,
    shadowOpacity: 1,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
  },
  android: { elevation: 20 },
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48,
    ...shadowCard,
  },
  triggerOpen: {
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    ...shadowCardSelected,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  triggerText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  triggerTextSelected: {
    color: COLORS.text,
  },
  triggerTextPlaceholder: {
    color: COLORS.textMuted,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: isTablet ? 28 : 20,
    marginBottom: isTablet ? 16 : 8,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    paddingVertical: 4,
  },
  dropdownContent: {
    maxHeight: 200,
  },
  list: {
    paddingHorizontal: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.primarySoft,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardIconSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardCodeSelected: {
    color: COLORS.primary,
  },
  cardId: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    padding: isTablet ? 28 : 20,
    paddingTop: isTablet ? 20 : 16,
    paddingBottom: isTablet ? 28 : 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // Legacy styles (keeping for compatibility)
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: isTablet ? 'center' : 'flex-end',
    alignItems: 'center',
    padding: isTablet ? 48 : 0,
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: isTablet ? 28 : 24,
    borderBottomLeftRadius: isTablet ? 28 : 0,
    borderBottomRightRadius: isTablet ? 28 : 0,
    width: '100%',
    maxWidth: isTablet ? 600 : '100%',
    height: isTablet ? 'auto' : '85%',
    maxHeight: isTablet ? 600 : '85%',
    overflow: 'hidden',
    ...shadowElevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isTablet ? 28 : 24,
    paddingBottom: isTablet ? 20 : 16,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: isTablet ? 22 : 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowCard,
  },
  content: {
    flex: 1,
    minHeight: isTablet ? 200 : 300,
    backgroundColor: COLORS.bg,
  },
  clearSearchButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  clearSearchText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: isTablet ? 28 : 20,
    paddingTop: isTablet ? 16 : 8,
  },
  cardItem: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...shadowCard,
  },
  cardItemSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
    borderWidth: 2,
    ...shadowCardSelected,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
});