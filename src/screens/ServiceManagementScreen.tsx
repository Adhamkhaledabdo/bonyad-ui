import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

interface ServiceManagementScreenProps {
  onBack: () => void;
}

interface Service {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  imageUrl?: string;
}

export default function ServiceManagementScreen({ onBack }: ServiceManagementScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  
  // Custom popup hooks
  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getAuthToken();

      // Fetch my services and all available services in parallel
      const [myServicesRes, allServicesRes] = await Promise.all([
        fetch(
          buildApiUrl(API_ENDPOINTS.TECHNICIANS.SERVICES),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        ),
        fetch(
          buildApiUrl(API_ENDPOINTS.SERVICES.LIST),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        ),
      ]);

      if (myServicesRes.ok) {
        const data = await myServicesRes.json();
        setMyServices(data || []);
      }

      if (allServicesRes.ok) {
        const data = await allServicesRes.json();
        setAllServices(data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      showError(t('Failed to load services'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServices = async (serviceIds: number[]) => {
    setIsSaving(true);
    try {
      const token = await storage.getAuthToken();

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.TECHNICIANS.ADD_SERVICES),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ serviceIds }),
        }
      );

      if (response.ok) {
        showSuccess(t('Services added successfully'), t('Success'));
        setShowAddModal(false);
        setSelectedServices([]);
        fetchServices();
      } else {
        throw new Error('Failed to add services');
      }
    } catch (error) {
      console.error('Error adding services:', error);
      showError(t('Failed to add services'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveService = async (serviceId: number) => {
    console.log('[ServiceManagement] Delete icon tapped for service', serviceId);

    const confirmRemove = async () => {
      try {
        console.log('[ServiceManagement] Remove confirm for service', serviceId);
        const token = await storage.getAuthToken();

        const response = await fetch(
          buildApiUrlWithParams(API_ENDPOINTS.TECHNICIANS.REMOVE_SERVICE, { serviceId }),
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          showSuccess(t('Service removed successfully'), t('Success'));
          fetchServices();
        } else {
          const errorText = await response.text();
          console.error('Error response removing service:', response.status, errorText);
          throw new Error(errorText || 'Failed to remove service');
        }
      } catch (error) {
        console.error('Error removing service:', error);
        showError((error as Error)?.message || t('Failed to remove service'), t('Error'));
      }
    };

    showDeleteConfirmation(
      t('Remove Service'),
      t('Are you sure you want to remove this service?'),
      confirmRemove,
      t('Remove')
    );
  };

  const toggleServiceSelection = (serviceId: number) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handleSaveSelection = () => {
    if (selectedServices.length === 0) {
      showError(t('Please select at least one service'), t('Error'));
      return;
    }
    handleAddServices(selectedServices);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const availableServices = allServices.filter(
    service => !myServices.some(myService => myService.id === service.id)
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Service Management')}</Text>
        {availableServices.length > 0 && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* My Services */}
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(16) }]}>
            {t('My Services')} ({myServices.length})
          </Text>

          {myServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="construct" size={60} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(18) }]}>
                {t('No services added yet')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                {t('Add services to show what you can do')}
              </Text>
            </View>
          ) : (
            myServices.map((service) => (
              <Card key={service.id} style={[styles.serviceCard, { backgroundColor: colors.cardBackground }]}>
                <Card.Content style={styles.serviceCardContent}>
                  {service.imageUrl && (
                    <Image
                      source={{
                        uri: service.imageUrl.startsWith('http')
                          ? service.imageUrl
                          : `${API_BASE_URL.replace('/api', '')}${service.imageUrl}`,
                      }}
                      style={styles.serviceImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceName, { color: colors.text, fontSize: scaledSize(16) }]}>
                      {i18n.language === 'ar' ? service.nameAr : service.nameEn}
                    </Text>
                    {service.description && (
                      <Text style={[styles.serviceDescription, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                        {service.description}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveService(service.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash" size={20} color={colors.error} />
                  </TouchableOpacity>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Services Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Add Services')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {availableServices.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceOption,
                    { backgroundColor: colors.cardBackground },
                    selectedServices.includes(service.id) && { borderColor: colors.primary },
                  ]}
                  onPress={() => toggleServiceSelection(service.id)}
                >
                  {selectedServices.includes(service.id) && (
                    <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                  <Text style={[styles.serviceOptionText, { color: colors.text }]}>
                    {i18n.language === 'ar' ? service.nameAr : service.nameEn}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveSelection}
                disabled={isSaving || selectedServices.length === 0}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {t('Add')} ({selectedServices.length})
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Card>
        </View>
      </Modal>
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  serviceCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalScrollView: {
    padding: 20,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceOptionText: {
    fontSize: 16,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


