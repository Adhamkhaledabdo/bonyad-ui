import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReadReceiptProps {
  isRead: boolean;
}

export default function ReadReceipt({ isRead }: ReadReceiptProps) {
  return (
    <View style={styles.container}>
      {/* First checkmark (always visible) */}
      <Ionicons name="checkmark" size={10} color={isRead ? '#2196F3' : '#999'} style={styles.firstCheck} />
      
      {/* Second checkmark (visible when read) */}
      <Ionicons
        name="checkmark"
        size={10}
        color={isRead ? '#2196F3' : '#999'}
        style={[styles.secondCheck, { opacity: isRead ? 1.0 : 0.4 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  firstCheck: {
    marginRight: -4,
  },
  secondCheck: {
    marginLeft: -4,
  },
});

// Indicators:
// ✓  (gray) = Sent
// ✓✓ (blue) = Read

