import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { fetchSubscriptionPlans } from '../services/onboardingApi';
import type { SubscriptionPlan as ApiSubscriptionPlan } from '../services/onboardingApi';

interface SubscriptionScreenProps {
  onBack: () => void;
}

type SubscriptionPlan = ApiSubscriptionPlan & {
  durationDays?: number;
  features?: string[];
};

interface CurrentSubscription {
  userId: string;
  hasActiveSubscription: boolean;
  subscriptionCategory?: SubscriptionPlan;
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
}

export default function SubscriptionScreen({ onBack }: SubscriptionScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getAuthToken();

      if (!token) {
        throw new Error('Missing auth token');
      }

      const [subscriptionRes, plans] = await Promise.all([
        fetch(
          buildApiUrl(API_ENDPOINTS.TECHNICIANS.SUBSCRIPTION),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
        fetchSubscriptionPlans(token),
      ]);

      if (subscriptionRes.ok) {
        const data = await subscriptionRes.json();
        setSubscription(data);
      } else {
        console.warn('⚠️ Failed to load current subscription', subscriptionRes.status, subscriptionRes.statusText);
      }

      if (Array.isArray(plans)) {
        setAvailablePlans(plans as SubscriptionPlan[]);
      } else {
        console.warn('⚠️ Unexpected subscription plans payload', plans);
        setAvailablePlans([]);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planId: number) => {
    Alert.alert(
      t('subscription.confirmSubscribeTitle'),
      t('subscription.confirmSubscribeMessage'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Subscribe'),
          onPress: async () => {
            setIsSaving(true);
            try {
              const token = await storage.getAuthToken();

              const response = await fetch(
                buildApiUrl(API_ENDPOINTS.TECHNICIANS.SUBSCRIBE),
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    subscriptionCategoryId: planId,
                    durationMonths: 1,
                  }),
                }
              );

              if (response.ok) {
                Alert.alert(t('Success'), t('subscription.messages.subscribeSuccess'));
                setShowPlanModal(false);
                fetchSubscription();
              } else {
                throw new Error('Failed to subscribe');
              }
            } catch (error) {
              console.error('Error subscribing:', error);
              Alert.alert(t('Error'), t('subscription.errors.subscribeFailed'));
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      t('subscription.confirmCancelTitle'),
      t('subscription.confirmCancelMessage'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Confirm'),
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const token = await storage.getAuthToken();

              const response = await fetch(
                buildApiUrl(API_ENDPOINTS.TECHNICIANS.CANCEL_SUBSCRIPTION),
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert(t('Success'), t('subscription.messages.cancelSuccess'));
                fetchSubscription();
              } else {
                throw new Error('Failed to cancel subscription');
              }
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert(t('Error'), t('subscription.errors.cancelFailed'));
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const sortedPlans = useMemo(() => {
    return [...availablePlans].sort((a, b) => (a.finalPrice ?? a.price ?? 0) - (b.finalPrice ?? b.price ?? 0));
  }, [availablePlans]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Subscription')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Current Subscription */}
          {subscription?.hasActiveSubscription && subscription.subscriptionCategory ? (
            <Card style={[styles.card, { backgroundColor: colors.primary }]}>
              <Card.Content>
                <View style={styles.currentPlanHeader}>
                  <Ionicons name="checkmark-circle" size={32} color="#fff" />
                  <View style={styles.currentPlanInfo}>
                    <Text style={styles.currentPlanTitle}>{t('Current Plan')}</Text>
                    <Text style={styles.currentPlanName}>
                      {i18n.language === 'ar'
                        ? subscription.subscriptionCategory.nameAr
                        : subscription.subscriptionCategory.nameEn}
                    </Text>
                  </View>
                </View>

                <View style={styles.planDetails}>
                  <View style={styles.planDetailRow}>
                    <Ionicons name="calendar" size={18} color="#fff" />
                    <Text style={styles.planDetailText}>
                      {subscription.startDate && subscription.endDate
                        ? `${new Date(subscription.startDate).toLocaleDateString()} - ${new Date(subscription.endDate).toLocaleDateString()}`
                        : t('Active')}
                    </Text>
                  </View>
                  {subscription.daysRemaining !== undefined && (
                    <View style={styles.planDetailRow}>
                      <Ionicons name="time" size={18} color="#fff" />
                      <Text style={styles.planDetailText}>
                        {subscription.daysRemaining} {t('days remaining')}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: '#fff' }]}
                  onPress={handleCancelSubscription}
                  disabled={isSaving}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.primary }]}>
                    {t('Cancel Subscription')}
                  </Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          ) : (
            <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Card.Content style={styles.noSubscriptionContent}>
                <Ionicons name="close-circle" size={60} color={colors.textSecondary} />
                <Text style={[styles.noSubscriptionText, { color: colors.text }]}>
                  {t('No Active Subscription')}
                </Text>
                <Text style={[styles.noSubscriptionSubtext, { color: colors.textSecondary }]}>
                  {t('Subscribe to a plan to get started')}
                </Text>
                <TouchableOpacity
                  style={[styles.viewPlansButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowPlanModal(true)}
                >
                  <Text style={styles.viewPlansButtonText}>{t('View Plans')}</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          )}

          {/* Available Plans */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('Available Plans')}
          </Text>

          {sortedPlans.map((plan) => {
            const isCurrentPlan = subscription?.subscriptionCategory?.id === plan.id;
            const displayName = i18n.language === 'ar' && plan.nameAr ? plan.nameAr : plan.nameEn;
            const displayDescription = i18n.language === 'ar' && plan.descriptionAr
              ? plan.descriptionAr
              : plan.descriptionEn;
            const priceValue = plan.finalPrice ?? plan.price ?? 0;
            const featureList = Array.isArray(plan.features) && plan.features.length > 0
              ? plan.features
              : displayDescription
                ? displayDescription.split(/\r?\n/).filter(Boolean)
                : [];

            return (
              <Card key={plan.id} style={[styles.card, { backgroundColor: colors.cardBackground }]}> 
                <Card.Content>
                  <View style={styles.planHeader}>
                    <Text style={[styles.planName, { color: colors.text }]}>
                      {displayName}
                    </Text>
                    <View style={[styles.priceBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.priceText}>SAR {priceValue.toFixed(2)}</Text>
                      <Text style={styles.pricePeriod}>/month</Text>
                    </View>
                  </View>

                  {featureList.length > 0 ? (
                    <View style={styles.featuresList}>
                      {featureList.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {featureList.length === 0 && displayDescription ? (
                    <Text style={[styles.featureText, { color: colors.textSecondary, marginTop: 12 }]}>
                      {displayDescription}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleSubscribe(plan.id)}
                    disabled={isSaving || isCurrentPlan}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : isCurrentPlan ? (
                      <Text style={styles.subscribeButtonText}>{t('Current Plan')}</Text>
                    ) : (
                      <Text style={styles.subscribeButtonText}>{t('Subscribe')}</Text>
                    )}
                  </TouchableOpacity>
                </Card.Content>
              </Card>
            );
          })}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPlanInfo: {
    marginLeft: 12,
    flex: 1,
  },
  currentPlanTitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  planDetails: {
    marginBottom: 16,
  },
  planDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planDetailText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  noSubscriptionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noSubscriptionText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noSubscriptionSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  viewPlansButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewPlansButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  pricePeriod: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
  },
  subscribeButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

