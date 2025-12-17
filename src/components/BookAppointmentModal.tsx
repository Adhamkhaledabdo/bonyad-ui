import React from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import BookingScreen from '../screens/BookingScreen';

interface BookAppointmentModalProps {
  visible: boolean;
  technicianId: number;
  technicianName: string;
  projectId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookAppointmentModal({
  visible,
  technicianId,
  technicianName,
  projectId,
  onClose,
  onSuccess,
}: BookAppointmentModalProps) {
  const { colors } = useTheme();

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  if (Platform.OS === 'web') {
    // For web, render as a full screen overlay
    if (!visible) return null;
    
    return (
      <View style={styles.webOverlay}>
        <View style={[styles.webModal, { backgroundColor: colors.background }]}>
          <BookingScreen
            technicianId={technicianId}
            technicianName={technicianName}
            projectId={projectId}
            onBack={onClose}
            onSuccess={handleSuccess}
          />
        </View>
      </View>
    );
  }

  // For mobile, use Modal
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <BookingScreen
        technicianId={technicianId}
        technicianName={technicianName}
        projectId={projectId}
        onBack={onClose}
        onSuccess={handleSuccess}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webModal: {
    width: '90%',
    maxWidth: 800,
    height: '90%',
    maxHeight: 900,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

