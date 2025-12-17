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
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
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
  const { fontFamily, scaledSize } = useFontFamily();
  
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
      const dayText = days === 1 ? (t('Day') || 'day') : (t('Days') || 'days');
      const hourText = hours === 1 ? 'hour' : 'hours';
      return `${days} ${dayText}, ${hours} ${hourText}`;
    } else if (hours > 0) {
      const hourText = hours === 1 ? 'hour' : 'hours';
      const minuteText = minutes === 1 ? 'minute' : 'minutes';
      return `${hours} ${hourText}, ${minutes} ${minuteText}`;
    } else {
      const minuteText = minutes === 1 ? 'minute' : 'minutes';
      return `${minutes} ${minuteText}`;
    }
  };

  const formatDateDDMMYYYY = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
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
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#FFFFFF' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00549B" />
        </View>
      </View>
    );
  }

  // Determine if user has active subscription
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

  // Get subscription price
  const subscriptionPrice = subscription?.price || 
                            subscription?.subscriptionCategory?.price ||
                            subscription?.subscriptionCategory?.finalPrice;

  // Get dates from subscription data
  const startDate = subscription?.startDate;
  const endDate = subscription?.endDate;
  const daysRemaining = subscription?.daysRemaining;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#FFFFFF' }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#003867" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaledSize(18) }]}>{t('Active Subscription') || 'Active Subscription'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Current Subscription Card */}
          {hasActive && subscriptionName ? (
            <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#D9D9D9' }]}>
              <View style={styles.cardContent}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { fontSize: scaledSize(20) }]}>{subscriptionName}</Text>
                  {subscriptionPrice !== undefined && (
                    <Text style={[styles.cardPrice, { fontSize: scaledSize(18) }]}>SAR {subscriptionPrice.toFixed(0)}</Text>
                  )}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Details List */}
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { fontSize: scaledSize(14) }]}>{t('Start Date')}</Text>
                    <Text style={[styles.detailValue, { fontSize: scaledSize(14) }]}>{formatDateDDMMYYYY(startDate)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { fontSize: scaledSize(14) }]}>{t('End Date')}</Text>
                    <Text style={[styles.detailValue, { fontSize: scaledSize(14) }]}>{formatDateDDMMYYYY(endDate)}</Text>
                  </View>
                  {daysRemaining !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontSize: scaledSize(14) }]}>{t('Days Remaining')}</Text>
                      <Text style={[styles.detailValue, { fontSize: scaledSize(14) }]}>{daysRemaining}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { fontSize: scaledSize(14) }]}>{t('Status')}</Text>
                    <Text style={[styles.detailValue, { fontSize: scaledSize(14) }]}>{t('Active')}</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#D9D9D9' }]}>
              <View style={[styles.cardContent, styles.noSubscriptionContent]}>
                <Ionicons name="close-circle" size={60} color="#A3A3A3" />
                <Text style={[styles.noSubscriptionText, { fontSize: scaledSize(18) }]}>
                  {t('No Active Subscription') || 'No Active Subscription'}
                </Text>
                <Text style={[styles.noSubscriptionSubtext, { fontSize: scaledSize(14) }]}>
                  {t('Subscribe to a plan to get started') || 'Subscribe to a plan to get started'}
                </Text>
              </View>
            </View>
          )}

          {/* Bid Usage Card */}
          {bidQuota?.hasActiveSubscription && (
            <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#D9D9D9' }]}>
              <View style={styles.cardContent}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t('subscription.bidQuota.title') || 'Bid Usage'}</Text>
                  <Text style={styles.cardPrice}>{subscriptionName}</Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Details List */}
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('subscription.bidQuota.weeklyQuota') || 'Weekly Quota'}</Text>
                    <Text style={styles.detailValue}>{bidQuota.weeklyQuota ?? 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('subscription.bidQuota.bidsRemaining') || 'Bids Remaining'}</Text>
                    <Text style={styles.detailValue}>{bidQuota.bidsRemaining ?? 0}</Text>
                  </View>
                  {bidQuota.lastResetAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('Last Reset') || 'Last Reset'}</Text>
                      <Text style={styles.detailValue}>{formatDateDDMMYYYY(bidQuota.lastResetAt)}</Text>
                    </View>
                  )}
                  {bidQuota.nextResetAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('Next Reset') || 'Next Reset'}</Text>
                      <Text style={styles.detailValue}>{formatDateDDMMYYYY(bidQuota.nextResetAt)}</Text>
                    </View>
                  )}
                  {bidQuota.secondsUntilReset !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('subscription.bidQuota.resetsIn') || 'Resets In'}</Text>
                      <Text style={styles.detailValue}>
                        {formatTimeUntilReset(bidQuota.secondsUntilReset)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Divider */}
                <View style={styles.divider} />
              </View>
            </View>
          )}

          {/* Cancel Subscription Button */}
          {hasActive && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSubscription}
              disabled={isSaving}
            >
              <Ionicons name="close-circle" size={24} color="#6A0DAD" />
              <Text style={styles.cancelButtonText}>{t('subscription.confirmCancelTitle') || 'Cancel Subscription'}</Text>
            </TouchableOpacity>
          )}

          {/* Available Plans - Only show if no active subscription */}
          {!hasActive && (
            <>
              <Text style={styles.sectionTitle}>
                {t('Available Plans')}
              </Text>

              {sortedPlans.map((plan) => {
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
                  <View key={plan.id} style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#D9D9D9' }]}>
                    <View style={styles.cardContent}>
                      <View style={styles.planHeader}>
                        <Text style={styles.planName}>
                          {displayName}
                        </Text>
                        <View style={styles.priceBadge}>
                          <Text style={styles.priceText}>SAR {priceValue.toFixed(2)}</Text>
                          <Text style={styles.pricePeriod}>/month</Text>
                        </View>
                      </View>

                      {featureList.length > 0 ? (
                        <View style={styles.featuresList}>
                          {featureList.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                              <Ionicons name="checkmark" size={16} color="#00549B" />
                              <Text style={styles.featureText}>
                                {feature}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {featureList.length === 0 && displayDescription ? (
                        <Text style={styles.featureText}>
                          {displayDescription}
                        </Text>
                      ) : null}

                      <TouchableOpacity
                        style={styles.subscribeButton}
                        onPress={() => handleSubscribe(plan.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.subscribeButtonText}>{t('Subscribe')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 40 }} /> 
            </>
          )}
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '400',
    flex: 1,
    textAlign: 'center',
    color: '#003867',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderWidth: 0.5,
    borderRadius: 6,
    marginBottom: 24,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00549B',
    textAlign: 'right',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#D9D9D9',
    marginVertical: 16,
  },
  detailsList: {
    // gap handled by marginBottom on detailRow
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A3A3A3',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400',
    color: '#383838',
    textAlign: 'right',
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
    color: '#333333',
  },
  noSubscriptionSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#6E6E6E',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 6,
    backgroundColor: '#EFE6F5',
    borderWidth: 0.5,
    borderColor: '#6A0DAD',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6A0DAD',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
    color: '#333333',
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
    color: '#333333',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#00549B',
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
    color: '#6E6E6E',
  },
  subscribeButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#00549B',
    marginTop: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
