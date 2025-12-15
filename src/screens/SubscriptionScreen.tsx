import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
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
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

interface SubscriptionScreenProps {
  onBack: () => void;
}

type SubscriptionPlan = ApiSubscriptionPlan & {
  durationDays?: number;
  features?: string[];
};

interface CurrentSubscription {
  userId?: string;
  hasActiveSubscription?: boolean;
  subscriptionCategory?: SubscriptionPlan;
  subscriptionCategoryId?: number;
  subscriptionCategoryNameEn?: string;
  subscriptionCategoryNameAr?: string;
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
  // Some backends return flat structure
  price?: number;
}

interface BidQuotaInfo {
  hasActiveSubscription: boolean;
  subscriptionCategoryId?: number;
  subscriptionCategoryNameEn?: string;
  subscriptionCategoryNameAr?: string;
  weeklyQuota?: number;
  bidsRemaining?: number;
  lastResetAt?: string;
  nextResetAt?: string;
  secondsUntilReset?: number;
  message?: string;
}

export default function SubscriptionScreen({ onBack }: SubscriptionScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [bidQuota, setBidQuota] = useState<BidQuotaInfo | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  // Custom popup hooks
  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

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

      // Fetch subscription and plans first (required)
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
        console.log('📊 Subscription data:', data);
        setSubscription(data);
      } else {
        console.warn('⚠️ Failed to load current subscription', subscriptionRes.status, subscriptionRes.statusText);
        setSubscription(null);
      }

      if (Array.isArray(plans)) {
        setAvailablePlans(plans as SubscriptionPlan[]);
      } else {
        console.warn('⚠️ Unexpected subscription plans payload', plans);
        setAvailablePlans([]);
      }

      // Fetch bid quota separately (optional - don't break if it fails)
      try {
        const bidsRes = await fetch(
          buildApiUrl(API_ENDPOINTS.TECHNICIANS.SUBSCRIPTION_BIDS),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (bidsRes.ok) {
          const bidsData = await bidsRes.json();
          console.log('📊 Bid quota data:', bidsData);
          setBidQuota(bidsData);
        } else {
          console.warn('⚠️ Failed to load bid quota', bidsRes.status, bidsRes.statusText);
          setBidQuota(null);
        }
      } catch (bidError) {
        console.warn('⚠️ Bid quota endpoint error (non-critical):', bidError);
        setBidQuota(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planId: number) => {
    const doSubscribe = async () => {
      setIsSaving(true);
      try {
        const token = await storage.getAuthToken();
        console.log('🔄 Subscribing to plan:', planId);

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
            }),
          }
        );

        console.log('📊 Subscribe response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Subscribe success:', data);
          showSuccess(t('subscription.messages.subscribeSuccess'), t('Success'));
          setShowPlanModal(false);
          fetchSubscription();
        } else {
          const errorText = await response.text();
          console.error('❌ Subscribe failed:', response.status, errorText);
          throw new Error(`Failed to subscribe: ${response.status}`);
        }
      } catch (error) {
        console.error('Error subscribing:', error);
        showError(t('subscription.errors.subscribeFailed'), t('Error'));
      } finally {
        setIsSaving(false);
      }
    };

    showConfirmation(
      t('subscription.confirmSubscribeTitle'),
      t('subscription.confirmSubscribeMessage'),
      doSubscribe,
      {
        type: 'info',
        confirmText: t('Subscribe'),
        icon: 'card-outline',
      }
    );
  };

  const handleCancelSubscription = async () => {
    const doCancel = async () => {
      setIsSaving(true);
      try {
        const token = await storage.getAuthToken();
        console.log('🔄 Cancelling subscription...');

        const response = await fetch(
          buildApiUrl(API_ENDPOINTS.TECHNICIANS.CANCEL_SUBSCRIPTION),
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        console.log('📊 Cancel response status:', response.status);

        if (response.ok) {
          console.log('✅ Subscription cancelled');
          showSuccess(t('subscription.messages.cancelSuccess'), t('Success'));
          fetchSubscription();
        } else {
          const errorText = await response.text();
          console.error('❌ Cancel failed:', response.status, errorText);
          throw new Error(`Failed to cancel subscription: ${response.status}`);
        }
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        showError(t('subscription.errors.cancelFailed'), t('Error'));
      } finally {
        setIsSaving(false);
      }
    };

    showConfirmation(
      t('subscription.confirmCancelTitle'),
      t('subscription.confirmCancelMessage'),
      doCancel,
      {
        type: 'danger',
        confirmText: t('Confirm'),
        confirmStyle: 'destructive',
        icon: 'close-circle-outline',
      }
    );
  };

  const formatTimeUntilReset = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}${t('subscription.bidQuota.daysShort')} ${hours}${t('subscription.bidQuota.hoursShort')}`;
    } else if (hours > 0) {
      return `${hours}${t('subscription.bidQuota.hoursShort')} ${minutes}${t('subscription.bidQuota.minutesShort')}`;
    } else {
      return `${minutes}${t('subscription.bidQuota.minutesShort')}`;
    }
  };

  const getBidQuotaPercentage = (): number => {
    if (!bidQuota?.weeklyQuota || !bidQuota?.bidsRemaining) return 0;
    return (bidQuota.bidsRemaining / bidQuota.weeklyQuota) * 100;
  };

  const getBidQuotaColor = (): string => {
    const percentage = getBidQuotaPercentage();
    if (percentage > 50) return '#22C55E'; // Green
    if (percentage > 25) return '#F59E0B'; // Yellow/Orange
    return '#EF4444'; // Red
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
          {/* Current Subscription - Use bidQuota data as primary source since it's more reliable */}
          {(() => {
            // Determine if user has active subscription from either source
            const hasActive = bidQuota?.hasActiveSubscription || 
                              subscription?.hasActiveSubscription || 
                              !!subscription?.subscriptionCategoryId;
            
            // Get subscription name from available sources
            const subscriptionName = i18n.language === 'ar'
              ? (bidQuota?.subscriptionCategoryNameAr || 
                 subscription?.subscriptionCategoryNameAr || 
                 subscription?.subscriptionCategory?.nameAr)
              : (bidQuota?.subscriptionCategoryNameEn || 
                 subscription?.subscriptionCategoryNameEn || 
                 subscription?.subscriptionCategory?.nameEn);

            // Get dates from subscription data
            const startDate = subscription?.startDate;
            const endDate = subscription?.endDate;
            const daysRemaining = subscription?.daysRemaining;

            if (hasActive && subscriptionName) {
              return (
                <Card style={[styles.card, { backgroundColor: colors.primary }]}>
                  <Card.Content>
                    <View style={styles.currentPlanHeader}>
                      <Ionicons name="checkmark-circle" size={32} color="#fff" />
                      <View style={styles.currentPlanInfo}>
                        <Text style={styles.currentPlanTitle}>{t('Current Plan')}</Text>
                        <Text style={styles.currentPlanName}>{subscriptionName}</Text>
                      </View>
                    </View>

                    <View style={styles.planDetails}>
                      <View style={styles.planDetailRow}>
                        <Ionicons name="calendar" size={18} color="#fff" />
                        <Text style={styles.planDetailText}>
                          {startDate && endDate
                            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                            : t('Active')}
                        </Text>
                      </View>
                      {daysRemaining !== undefined && (
                        <View style={styles.planDetailRow}>
                          <Ionicons name="time" size={18} color="#fff" />
                          <Text style={styles.planDetailText}>
                            {daysRemaining} {t('days remaining')}
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
              );
            } else {
              return (
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
              );
            }
          })()}

          {/* Bid Quota Section */}
          {bidQuota?.hasActiveSubscription && (
            <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Card.Content>
                <View style={styles.bidQuotaHeader}>
                  <Ionicons name="trending-up" size={24} color={colors.primary} />
                  <Text style={[styles.bidQuotaSectionTitle, { color: colors.text }]}>
                    {t('subscription.bidQuota.title')}
                  </Text>
                </View>

                {/* Bid Counter */}
                <View style={styles.bidCounterContainer}>
                  <View style={styles.bidCounterMain}>
                    <Text style={[styles.bidCounterNumber, { color: getBidQuotaColor() }]}>
                      {bidQuota.bidsRemaining ?? 0}
                    </Text>
                    <Text style={[styles.bidCounterDivider, { color: colors.textSecondary }]}>/</Text>
                    <Text style={[styles.bidCounterTotal, { color: colors.textSecondary }]}>
                      {bidQuota.weeklyQuota ?? 0}
                    </Text>
                  </View>
                  <Text style={[styles.bidCounterLabel, { color: colors.textSecondary }]}>
                    {t('subscription.bidQuota.bidsRemaining')}
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: getBidQuotaColor(),
                        width: `${getBidQuotaPercentage()}%`,
                      },
                    ]}
                  />
                </View>

                {/* Reset Timer */}
                <View style={styles.resetTimerContainer}>
                  <Ionicons name="refresh-circle" size={20} color={colors.textSecondary} />
                  <Text style={[styles.resetTimerText, { color: colors.textSecondary }]}>
                    {t('subscription.bidQuota.resetsIn')}{' '}
                    <Text style={{ fontWeight: '600', color: colors.text }}>
                      {bidQuota.secondsUntilReset
                        ? formatTimeUntilReset(bidQuota.secondsUntilReset)
                        : t('subscription.bidQuota.soon')}
                    </Text>
                  </Text>
                </View>

                {/* Quick Stats */}
                <View style={styles.bidStatsRow}>
                  <View style={[styles.bidStatItem, { backgroundColor: colors.background }]}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={[styles.bidStatValue, { color: colors.text }]}>
                      {bidQuota.weeklyQuota ?? 0}
                    </Text>
                    <Text style={[styles.bidStatLabel, { color: colors.textSecondary }]}>
                      {t('subscription.bidQuota.weeklyQuota')}
                    </Text>
                  </View>
                  <View style={[styles.bidStatItem, { backgroundColor: colors.background }]}>
                    <Ionicons name="checkmark-done" size={18} color="#22C55E" />
                    <Text style={[styles.bidStatValue, { color: colors.text }]}>
                      {(bidQuota.weeklyQuota ?? 0) - (bidQuota.bidsRemaining ?? 0)}
                    </Text>
                    <Text style={[styles.bidStatLabel, { color: colors.textSecondary }]}>
                      {t('subscription.bidQuota.bidsUsed')}
                    </Text>
                  </View>
                </View>

                {/* Warning if low bids */}
                {bidQuota.bidsRemaining !== undefined && bidQuota.bidsRemaining <= 2 && (
                  <View style={[styles.warningBanner, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="warning" size={18} color="#D97706" />
                    <Text style={[styles.warningText, { color: '#92400E' }]}>
                      {bidQuota.bidsRemaining === 0
                        ? t('subscription.bidQuota.noBidsLeft')
                        : t('subscription.bidQuota.lowBidsWarning')}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Available Plans */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('Available Plans')}
          </Text>

          {sortedPlans.map((plan) => {
            // Check if this is the current plan using multiple sources
            const currentPlanId = bidQuota?.subscriptionCategoryId || 
                                  subscription?.subscriptionCategoryId || 
                                  subscription?.subscriptionCategory?.id;
            const isCurrentPlan = currentPlanId === plan.id;
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
  // Bid Quota Styles
  bidQuotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bidQuotaSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  bidCounterContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bidCounterMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bidCounterNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  bidCounterDivider: {
    fontSize: 32,
    fontWeight: '300',
    marginHorizontal: 4,
  },
  bidCounterTotal: {
    fontSize: 24,
    fontWeight: '500',
  },
  bidCounterLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  resetTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resetTimerText: {
    fontSize: 14,
    marginLeft: 6,
  },
  bidStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bidStatItem: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bidStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  bidStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
