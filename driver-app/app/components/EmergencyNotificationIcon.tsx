import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmergency } from '../../src/contexts/EmergencyContext';
import { router } from 'expo-router';

const COLORS = {
  primary: '#021C8B',
  danger: '#EF4444',
  surface: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
};

interface EmergencyNotificationIconProps {
  size?: number;
  color?: string;
  showBadge?: boolean;
}

const EmergencyNotificationIcon: React.FC<EmergencyNotificationIconProps> = ({
  size = 24,
  color = COLORS.text,
  showBadge = true,
}) => {
  const { unreadCount } = useEmergency();

  const handlePress = () => {
    router.push('/emergency-history');
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name="notifications" 
          size={size} 
          color={color} 
        />
        
        {showBadge && unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default EmergencyNotificationIcon;