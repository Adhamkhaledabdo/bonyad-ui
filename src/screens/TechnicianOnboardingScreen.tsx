import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import onboardingStorage from '../services/onboardingStorage';
import {
  markOnboardingComplete,
  fetchServices,
  fetchSubscriptionPlans,
  saveAvailability,
  saveServices,
  subscribeToPlan,
  Service,
  SubscriptionPlan,
} from '../services/onboardingApi';

type Step = 1 | 2 | 3 | 4;

type AvailabilityStatus = 'AVAILABLE_ANYTIME' | 'FIXED_TIMES';

interface AvailabilitySlot {
  day: string;
  start: string;
  end: string;
}

export interface TechnicianOnboardingScreenProps {
  token: string;
  userId: number;
  onFinished: () => void;
}

const WEEK_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const dayKey = (day: string) => day.toLowerCase();

const DEFAULT_SLOTS: AvailabilitySlot[] = [
  { day: 'Sunday', start: '09:00', end: '17:00' },
  { day: 'Monday', start: '09:00', end: '17:00' },
  { day: 'Tuesday', start: '09:00', end: '17:00' },
];

const TechnicianOnboardingScreen: React.FC<TechnicianOnboardingScreenProps> = ({ token, userId, onFinished }) => {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();

  const [step, setStep] = useState<Step>(1);
  const [isLoadingStep, setIsLoadingStep] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [stateInitialized, setStateInitialized] = useState(false);

  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('FIXED_TIMES');
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>(DEFAULT_SLOTS);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const selectedServices = useMemo(
    () => services.filter(service => selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds]
  );

  const selectedPlan = useMemo(
    () => plans.find(plan => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const persistStep = useCallback((next: Step) => {
    setStep(next);
    onboardingStorage.set('currentStep', String(next));
  }, []);

  const loadPersistedState = useCallback(async () => {
    try {
      const [storedStep, storedStatus, storedSlots, storedServices, storedPlan] = await Promise.all([
        onboardingStorage.get('currentStep'),
        onboardingStorage.get('availabilityStatus'),
        onboardingStorage.get('availabilitySlots'),
        onboardingStorage.get('selectedServices'),
        onboardingStorage.get('selectedPlan'),
      ]);

      if (storedStep) {
        const parsed = parseInt(storedStep, 10);
        if (parsed >= 1 && parsed <= 4) {
          setStep(parsed as Step);
        }
      }

      if (storedStatus === 'AVAILABLE_ANYTIME' || storedStatus === 'FIXED_TIMES') {
        setAvailabilityStatus(storedStatus);
      }

      if (storedSlots) {
        try {
          const parsedSlots = JSON.parse(storedSlots) as AvailabilitySlot[];
          if (Array.isArray(parsedSlots) && parsedSlots.length > 0) {
            setAvailabilitySlots(parsedSlots);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse stored availability slots', error);
        }
      }

      if (storedServices) {
        try {
          const parsed = JSON.parse(storedServices) as number[];
          if (Array.isArray(parsed)) {
            setSelectedServiceIds(parsed);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse stored services', error);
        }
      }

      if (storedPlan) {
        const numeric = parseInt(storedPlan, 10);
        if (!Number.isNaN(numeric)) {
          setSelectedPlanId(numeric);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load onboarding state', error);
    } finally {
      setStateInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadPersistedState();
  }, [loadPersistedState]);

  useEffect(() => {
    if (!stateInitialized) return;
    onboardingStorage.set('availabilityStatus', availabilityStatus);
  }, [availabilityStatus, stateInitialized]);

  useEffect(() => {
    if (!stateInitialized) return;
    onboardingStorage.set('availabilitySlots', JSON.stringify(availabilitySlots));
  }, [availabilitySlots, stateInitialized]);

  useEffect(() => {
    if (!stateInitialized) return;
    onboardingStorage.set('selectedServices', JSON.stringify(selectedServiceIds));
  }, [selectedServiceIds, stateInitialized]);

  useEffect(() => {
    if (!stateInitialized) return;
    onboardingStorage.set('selectedPlan', selectedPlanId !== null ? selectedPlanId.toString() : '');
  }, [selectedPlanId, stateInitialized]);

  const addAvailabilitySlot = useCallback((day: string) => {
    setAvailabilitySlots(prev => [
      ...prev,
      { day, start: '09:00', end: '17:00' },
    ]);
  }, []);

  const updateAvailabilitySlot = useCallback((day: string, slotIndex: number, field: 'start' | 'end', value: string) => {
    const formatted = value.replace(/[^0-9:]/g, '').slice(0, 5);
    setAvailabilitySlots(prev => {
      let occurrence = -1;
      return prev.map(slot => {
        if (dayKey(slot.day) === dayKey(day)) {
          occurrence += 1;
          if (occurrence === slotIndex) {
            return { ...slot, [field]: formatted };
          }
        }
        return slot;
      });
    });
  }, []);

  const removeAvailabilitySlot = useCallback((day: string, slotIndex: number) => {
    setAvailabilitySlots(prev => {
      let occurrence = -1;
      return prev.filter(slot => {
        if (dayKey(slot.day) === dayKey(day)) {
          occurrence += 1;
          return occurrence !== slotIndex;
        }
        return true;
      });
    });
  }, []);

  const loadServices = useCallback(async () => {
    setIsLoadingStep(true);
    try {
      const response = await fetchServices(token);
      setServices(response);
    } catch (error: any) {
      Alert.alert(t('Error'), error?.message || t('onboarding.errors.loadServices'));
    } finally {
      setIsLoadingStep(false);
    }
  }, [token]);

  const loadPlans = useCallback(async () => {
    setIsLoadingStep(true);
    try {
      const response = await fetchSubscriptionPlans(token);
      setPlans(response);
    } catch (error: any) {
      Alert.alert(t('Error'), error?.message || t('onboarding.errors.loadPlans'));
    } finally {
      setIsLoadingStep(false);
    }
  }, [token]);

  useEffect(() => {
    if (step === 2 && services.length === 0) {
      loadServices();
    }
    if (step === 3 && plans.length === 0) {
      loadPlans();
    }
  }, [step, services.length, plans.length, loadServices, loadPlans]);

  const toggleServiceSelection = (id: number) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleAvailabilityNext = () => {
    if (availabilityStatus === 'FIXED_TIMES' && availabilitySlots.length === 0) {
      Alert.alert(t('onboarding.alerts.availabilityTitle'), t('onboarding.alerts.addSlot'));
      return;
    }

    persistStep(2);
  };

  const handleServicesNext = () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert(t('onboarding.alerts.servicesTitle'), t('onboarding.alerts.selectService'));
      return;
    }

    persistStep(3);
  };

  const handlePlanNext = () => {
    if (!selectedPlanId) {
      Alert.alert(t('onboarding.alerts.subscriptionTitle'), t('onboarding.alerts.selectSubscription'));
      return;
    }

    persistStep(4);
  };

  const parseTime = (time: string): number | null => {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return null;
    }
    const [hoursStr, minutesStr] = time.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    return hours * 60 + minutes;
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const hasValidAvailability = () => {
    if (availabilityStatus === 'AVAILABLE_ANYTIME') {
      return true;
    }
    if (availabilitySlots.length === 0) {
      return false;
    }
    return availabilitySlots.every(slot => {
      const normalizedDay = (WEEK_DAYS.find(d => dayKey(d) === dayKey(slot.day)) || slot.day || '').replace(/\s+/g, '').toUpperCase();
      const start = parseTime(slot.start);
      const end = parseTime(slot.end);
      return Boolean(normalizedDay) && start !== null && end !== null && start < end;
    });
  };

  const buildAvailabilityPayload = () => {
    if (availabilityStatus === 'AVAILABLE_ANYTIME') {
      return [];
    }
    const orderMap = new Map<string, number>();
    WEEK_DAYS.forEach((day, index) => orderMap.set(dayKey(day), index));
    return availabilitySlots
      .map(slot => {
        const normalizedDay = (WEEK_DAYS.find(d => dayKey(d) === dayKey(slot.day)) || slot.day || '').replace(/\s+/g, '').toUpperCase();
        const startMinutes = parseTime(slot.start);
        const endMinutes = parseTime(slot.end);
        if (!normalizedDay || startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
          return null;
        }
        return {
          dayOfWeek: normalizedDay,
          startTime: formatMinutes(startMinutes),
          endTime: formatMinutes(endMinutes),
        };
      })
      .filter((slot): slot is { dayOfWeek: string; startTime: string; endTime: string } => Boolean(slot))
      .sort((a, b) => {
        const dayDiff = (orderMap.get(dayKey(a.dayOfWeek)) ?? 0) - (orderMap.get(dayKey(b.dayOfWeek)) ?? 0);
        if (dayDiff !== 0) return dayDiff;
        const startDiff = (parseTime(a.startTime) ?? 0) - (parseTime(b.startTime) ?? 0);
        if (startDiff !== 0) return startDiff;
        return (parseTime(a.endTime) ?? 0) - (parseTime(b.endTime) ?? 0);
      });
  };

  const handleFinishOnboarding = async () => {
    if (availabilityStatus === 'FIXED_TIMES' && !hasValidAvailability()) {
      Alert.alert(t('onboarding.alerts.availabilityTitle'), t('onboarding.alerts.invalidTimes'));
      persistStep(1);
      return;
    }

    if (selectedServiceIds.length === 0) {
      Alert.alert(t('onboarding.alerts.servicesTitle'), t('onboarding.alerts.selectService'));
      persistStep(2);
      return;
    }

    if (!selectedPlanId) {
      Alert.alert(t('onboarding.alerts.subscriptionTitle'), t('onboarding.alerts.selectSubscription'));
      persistStep(3);
      return;
    }

    setIsCompleting(true);
    try {
      if (availabilityStatus === 'AVAILABLE_ANYTIME') {
        console.log('📤 [Onboarding] Submitting availability payload:', { status: availabilityStatus });
        await saveAvailability(token, { status: availabilityStatus });
      } else {
        const payloadSlots = buildAvailabilityPayload();
        console.log('📤 [Onboarding] Submitting availability payload:', { status: availabilityStatus, slots: payloadSlots });
        await saveAvailability(token, { status: availabilityStatus, slots: payloadSlots });
      }

      await saveServices(token, selectedServiceIds);
      await subscribeToPlan(token, selectedPlanId, 1);
      await markOnboardingComplete(token, userId);
      await onboardingStorage.clear();
      onFinished();
    } catch (error: any) {
      Alert.alert(t('Error'), error?.message || t('onboarding.errors.finalize'));
    } finally {
      setIsCompleting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <AvailabilityStep
            status={availabilityStatus}
            slots={availabilitySlots}
            onChangeStatus={setAvailabilityStatus}
            onAddSlot={addAvailabilitySlot}
            onUpdateSlot={updateAvailabilitySlot}
            onRemoveSlot={removeAvailabilitySlot}
            onNext={handleAvailabilityNext}
            t={t}
            language={i18n.language}
            colors={colors}
          />
        );
      case 2:
        return (
          <ServicesStep
            services={services}
            selectedServiceIds={selectedServiceIds}
            onToggleService={toggleServiceSelection}
            refreshing={isLoadingStep && services.length === 0}
            onRefresh={loadServices}
            onNext={handleServicesNext}
            onBack={() => persistStep(1)}
            t={t}
            language={i18n.language}
            colors={colors}
          />
        );
      case 3:
        return (
          <SubscriptionStep
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelectPlan={setSelectedPlanId}
            refreshing={isLoadingStep && plans.length === 0}
            onRefresh={loadPlans}
            onNext={handlePlanNext}
            onBack={() => persistStep(2)}
            t={t}
            language={i18n.language}
            colors={colors}
          />
        );
      case 4:
      default:
        return (
          <ConfirmationStep
            availabilityStatus={availabilityStatus}
            slots={availabilitySlots}
            services={selectedServices}
            subscription={selectedPlan}
            onEditStep={(target) => persistStep(target as Step)}
            onBack={() => persistStep(3)}
            onFinish={handleFinishOnboarding}
            loading={isCompleting}
            t={t}
            language={i18n.language}
            colors={colors}
          />
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.technicianTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('onboarding.subtitle')}</Text>
      </View>

      <OnboardingProgress current={step} colors={colors} t={t} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>
    </View>
  );
};

interface StepProps {
  colors: any;
  t: TFunction;
  language: string;
}

interface AvailabilityStepProps extends StepProps {
  status: AvailabilityStatus;
  slots: AvailabilitySlot[];
  onChangeStatus: (value: AvailabilityStatus) => void;
  onAddSlot: (day: string) => void;
  onUpdateSlot: (day: string, slotIndex: number, field: 'start' | 'end', value: string) => void;
  onRemoveSlot: (day: string, slotIndex: number) => void;
  onNext: () => void;
  onBack?: () => void;
}

const AvailabilityStep: React.FC<AvailabilityStepProps> = ({
  status,
  slots,
  onChangeStatus,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  onNext,
  onBack,
  colors,
  t,
}) => {
  const primaryColor = (colors.primary as string) || '#0080E0';

  const groupedSlots = useMemo(() => {
    return WEEK_DAYS.map(day => ({
      day,
      slots: slots.filter(slot => dayKey(slot.day) === dayKey(day)),
    }));
  }, [slots]);

  const canProceed = status === 'AVAILABLE_ANYTIME' || (slots.length > 0 && slots.every(slot => slot.start.trim().length === 5 && slot.end.trim().length === 5));

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }] }>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('onboarding.steps.availability')}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }] }>
        {t('onboarding.availability.description')}
      </Text>

      <View style={styles.toggleGroup}>
        <SelectableCard
          title={t('onboarding.availability.anytimeTitle')}
          description={t('onboarding.availability.anytimeDescription')}
          active={status === 'AVAILABLE_ANYTIME'}
          onPress={() => onChangeStatus('AVAILABLE_ANYTIME')}
          colors={colors}
        />
        <SelectableCard
          title={t('onboarding.availability.fixedTitle')}
          description={t('onboarding.availability.fixedDescription')}
          active={status === 'FIXED_TIMES'}
          onPress={() => onChangeStatus('FIXED_TIMES')}
          colors={colors}
        />
      </View>

      {status === 'FIXED_TIMES' && (
        <View style={styles.slotEditorWrapper}>
          <Text style={styles.slotEditorTitle}>{t('onboarding.availability.weeklyLabel')}</Text>
          {groupedSlots.map(({ day, slots: daySlots }) => (
            <View
              key={day}
              style={[
                styles.slotDayContainer,
                {
                  borderColor: colors.border || '#E4E7EC',
                  backgroundColor: colors.surface || colors.cardBackground,
                },
              ]}
            >
              <View style={styles.slotDayHeader}>
                <Text style={[styles.slotDayLabel, { color: colors.text }]}>
                  {t(`days.${dayKey(day)}`, day)}
                </Text>
                <TouchableOpacity style={styles.addSlotButton} onPress={() => onAddSlot(day)}>
                  <Ionicons name="add-circle-outline" size={18} color={primaryColor} />
                  <Text style={[styles.addSlotButtonText, { color: primaryColor }]}>{t('onboarding.availability.addSlot')}</Text>
                </TouchableOpacity>
              </View>
              {daySlots.length === 0 ? (
                <Text style={[styles.slotEmptyText, { color: colors.textSecondary }]}>{t('onboarding.availability.noSlots')}</Text>
              ) : (
                daySlots.map((slot, index) => (
                  <View
                    key={`${day}-${index}`}
                    style={[
                      styles.slotRow,
                      {
                        borderColor: colors.border || '#E4E7EC',
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <View style={styles.slotInputs}>
                      <TextInput
                        value={slot.start}
                        onChangeText={(value) => onUpdateSlot(day, index, 'start', value)}
                        style={[
                          styles.timeInput,
                          {
                            color: colors.text,
                            borderColor: colors.border || '#D0D5DD',
                            backgroundColor: colors.surface || colors.cardBackground,
                          },
                        ]}
                        keyboardType="numeric"
                        placeholder="09:00"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={5}
                      />
                      <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>{t('onboarding.availability.to')}</Text>
                      <TextInput
                        value={slot.end}
                        onChangeText={(value) => onUpdateSlot(day, index, 'end', value)}
                        style={[
                          styles.timeInput,
                          {
                            color: colors.text,
                            borderColor: colors.border || '#D0D5DD',
                            backgroundColor: colors.surface || colors.cardBackground,
                          },
                        ]}
                        keyboardType="numeric"
                        placeholder="17:00"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity onPress={() => onRemoveSlot(day, index)} style={styles.slotRemoveButton}>
                      <Ionicons name="trash-outline" size={18} color={colors.error || '#F44336'} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.buttonRow}>
        {onBack ? (
          <SecondaryButton label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
        ) : null}
        <PrimaryButton
          label={t('onboarding.buttons.next')}
          onPress={onNext}
          disabled={!canProceed}
          colors={colors}
        />
      </View>
    </View>
  );
};

interface ServicesStepProps extends StepProps {
  services: Service[];
  selectedServiceIds: number[];
  onToggleService: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onNext: () => void;
  onBack: () => void;
}

const ServicesStep: React.FC<ServicesStepProps> = ({
  services,
  selectedServiceIds,
  onToggleService,
  refreshing,
  onRefresh,
  onNext,
  onBack,
  colors,
  t,
  language,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }] }>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('onboarding.services.title')}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }] }>
        {t('onboarding.services.subtitle')}
      </Text>

      {refreshing && services.length === 0 ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
      ) : (
        <View style={styles.serviceList}>
          {services.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>{t('onboarding.services.noServices')}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                <Text style={[styles.retryButtonText, { color: (colors.primary as string) || '#0080E0' }]}>{t('onboarding.services.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            services.map(item => {
              const isActive = selectedServiceIds.includes(item.id);
              const serviceName = language === 'ar' && item.nameAr ? item.nameAr : item.nameEn;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.serviceCard,
                    {
                      backgroundColor: colors.surface || colors.cardBackground,
                      borderColor: colors.border || 'transparent',
                    },
                    isActive && { borderColor: (colors.primary as string) || '#0080E0' },
                  ]}
                  onPress={() => onToggleService(item.id)}
                >
                  <View style={styles.serviceHeader}>
                    <Text style={[styles.serviceTitle, { color: colors.text }]}>{serviceName}</Text>
                    <Ionicons
                      name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isActive ? (colors.primary as string) || '#0080E0' : colors.textSecondary}
                    />
                  </View>
                  {item.description ? (
                    <Text style={[styles.serviceDescription, { color: colors.textSecondary }]}>
                      {item.description}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <View style={styles.buttonRow}>
        <SecondaryButton label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
        <PrimaryButton
          label={t('onboarding.buttons.next')}
          onPress={onNext}
          disabled={selectedServiceIds.length === 0}
          colors={colors}
        />
      </View>
    </View>
  );
};

interface SubscriptionStepProps extends StepProps {
  plans: SubscriptionPlan[];
  selectedPlanId: number | null;
  onSelectPlan: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onNext: () => void;
  onBack: () => void;
}

const SubscriptionStep: React.FC<SubscriptionStepProps> = ({
  plans,
  selectedPlanId,
  onSelectPlan,
  refreshing,
  onRefresh,
  onNext,
  onBack,
  colors,
  t,
  language,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }] }>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('onboarding.subscription.title')}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }] }>
        {t('onboarding.subscription.subtitle')}
      </Text>

      {refreshing && plans.length === 0 ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
      ) : (
        <View style={styles.planList}>
          {plans.map(plan => {
            const isActive = selectedPlanId === plan.id;
            const planName = language === 'ar' && plan.nameAr ? plan.nameAr : plan.nameEn;
            const planDescription = language === 'ar' && plan.descriptionAr ? plan.descriptionAr : plan.descriptionEn;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.surface || colors.cardBackground,
                    borderColor: colors.border || 'transparent',
                  },
                  isActive && { borderColor: colors.primary },
                ]}
                onPress={() => onSelectPlan(plan.id)}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planTitle, { color: colors.text }]}>{planName}</Text>
                  <Ionicons
                    name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                </View>
                {planDescription ? (
                  <Text style={[styles.planDescription, { color: colors.textSecondary }]}> 
                    {planDescription}
                  </Text>
                ) : null}
                <View style={styles.planPriceRow}>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>SAR {plan.finalPrice.toFixed(2)}</Text>
                  {plan.hasActiveDiscount && plan.price > plan.finalPrice ? (
                    <Text style={styles.planOriginalPrice}>SAR {plan.price.toFixed(2)}</Text>
                  ) : null}
                </View>
                {plan.hasLimitedTimeDiscount && plan.discountTimeRemainingSeconds ? (
                  <Text style={styles.planBadge}>
                    {t('onboarding.subscription.limitedOffer', {
                      hours: Math.ceil(plan.discountTimeRemainingSeconds / 3600),
                    })}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {plans.length === 0 && !refreshing ? (
        <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
          <Text style={[styles.retryButtonText, { color: (colors.primary as string) || '#0080E0' }]}>{t('onboarding.subscription.reloadPlans')}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.buttonRow}>
        <SecondaryButton label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
        <PrimaryButton
          label={t('onboarding.buttons.next')}
          onPress={onNext}
          disabled={!selectedPlanId}
          colors={colors}
        />
      </View>
    </View>
  );
};

interface ConfirmationStepProps extends StepProps {
  availabilityStatus: AvailabilityStatus;
  slots: AvailabilitySlot[];
  services: Service[];
  subscription: SubscriptionPlan | null;
  onEditStep: (step: Step) => void;
  onBack: () => void;
  onFinish: () => void;
  loading: boolean;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  availabilityStatus,
  slots,
  services,
  subscription,
  onEditStep,
  onBack,
  onFinish,
  loading,
  colors,
  t,
  language,
}) => {
  const groupedSlots = useMemo(() => {
    return WEEK_DAYS.map(day => ({
      day,
      slots: slots.filter(slot => dayKey(slot.day) === dayKey(day)).sort((a, b) => a.start.localeCompare(b.start)),
    })).filter(group => group.slots.length > 0);
  }, [slots]);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }] }>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('onboarding.summary.title')}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }] }>
        {t('onboarding.summary.subtitle')}
      </Text>

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface || colors.cardBackground,
            borderColor: colors.border || '#E4E7EC',
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>{t('onboarding.summary.availabilityTitle')}</Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              {availabilityStatus === 'AVAILABLE_ANYTIME'
                ? t('onboarding.summary.availabilityDescriptionAnytime')
                : t('onboarding.summary.availabilityDescriptionFixed', { count: slots.length })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEditStep(1)}>
            <Text style={[styles.editLink, { color: colors.primary }]}>{t('onboarding.summary.edit')}</Text>
          </TouchableOpacity>
        </View>
        {availabilityStatus === 'FIXED_TIMES' ? (
          <View style={styles.summaryList}>
            {groupedSlots.map(group => (
              <View key={group.day} style={styles.summaryListGroup}>
                <Text style={[styles.summaryListGroupTitle, { color: colors.text }]}>
                  {t(`days.${dayKey(group.day)}`, group.day)}
                </Text>
                {group.slots.map((slot, index) => (
                  <Text key={`${group.day}-${index}`} style={[styles.summaryListItem, { color: colors.textSecondary }]}>
                    {slot.start} - {slot.end}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface || colors.cardBackground,
            borderColor: colors.border || '#E4E7EC',
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>{t('onboarding.summary.servicesTitle')}</Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              {services.length === 0
                ? t('onboarding.summary.servicesEmpty')
                : t('onboarding.summary.servicesDescription', { count: services.length })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEditStep(2)}>
            <Text style={[styles.editLink, { color: colors.primary }]}>{t('onboarding.summary.edit')}</Text>
          </TouchableOpacity>
        </View>
        {services.length > 0 ? (
          <View style={styles.summaryList}>
            {services.map(service => {
              const serviceName = language === 'ar' && service.nameAr ? service.nameAr : service.nameEn;
              return (
                <Text key={service.id} style={[styles.summaryListItem, { color: colors.textSecondary }]}>
                  {serviceName}
                </Text>
              );
            })}
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface || colors.cardBackground,
            borderColor: colors.border || '#E4E7EC',
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>{t('onboarding.summary.subscriptionTitle')}</Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              {subscription
                ? (language === 'ar' && subscription.nameAr ? subscription.nameAr : subscription.nameEn)
                : t('onboarding.summary.subscriptionEmpty')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEditStep(3)}>
            <Text style={[styles.editLink, { color: colors.primary }]}>{t('onboarding.summary.edit')}</Text>
          </TouchableOpacity>
        </View>
        {subscription ? (
          <Text style={[styles.summaryListItem, { color: colors.textSecondary }]}>
            {t('onboarding.summary.subscriptionPrice', { price: subscription.finalPrice.toFixed(2) })}
          </Text>
        ) : null}
      </View>

      <View style={styles.buttonRow}>
        <SecondaryButton label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
        <PrimaryButton
          label={loading ? t('onboarding.buttons.finishing') : t('onboarding.buttons.finish')}
          onPress={onFinish}
          disabled={loading || !subscription}
          colors={colors}
        />
      </View>
    </View>
  );
};

interface SelectableCardProps {
  title: string;
  description: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}

const SelectableCard: React.FC<SelectableCardProps> = ({ title, description, active, onPress, colors }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.selectableCard,
      {
        backgroundColor: colors.surface || colors.cardBackground,
        borderColor: colors.border || 'transparent',
      },
      active && {
        borderColor: (colors.primary as string) || '#0080E0',
        backgroundColor: `${(colors.primary as string) || '#0080E0'}15`,
      },
    ]}
  >
    <View style={styles.selectableCardHeader}>
      <Text style={[styles.selectableCardTitle, { color: colors.text }]}>{title}</Text>
      <Ionicons
        name={active ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={active ? (colors.primary as string) || '#0080E0' : colors.textSecondary}
      />
    </View>
    <Text style={[styles.selectableCardDescription, { color: colors.textSecondary }]}>{description}</Text>
  </TouchableOpacity>
);

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  colors: any;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ label, onPress, disabled, colors }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[styles.primaryButtonWrapper, disabled && styles.primaryButtonWrapperDisabled]}
  >
    <View
      style={[styles.primaryButton, { backgroundColor: disabled ? '#9E9E9E' : (colors.primary as string) || '#0080E0' }]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </View>
  </TouchableOpacity>
);

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  colors: any;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({ label, onPress, colors }) => {
  const primaryColor = (colors.primary as string) || '#0080E0';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.secondaryButton,
        {
          borderColor: primaryColor,
          backgroundColor: colors.surface || colors.cardBackground,
        },
      ]}
    > 
      <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

interface OnboardingProgressProps {
  current: Step;
  colors: any;
  t: TFunction;
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ current, colors, t }) => {
  const primaryColor = (colors.primary as string) || '#0080E0';
  const steps = [
    { id: 1, label: t('onboarding.steps.availability') },
    { id: 2, label: t('onboarding.steps.services') },
    { id: 3, label: t('onboarding.steps.subscription') },
    { id: 4, label: t('onboarding.steps.summary') },
  ];

  return (
    <View style={styles.progressContainer}>
      {steps.map((stepItem, index) => {
        const isCompleted = current > stepItem.id;
        const isActive = current === stepItem.id;
        const nextItem = steps[index + 1];
        const circleStyles = isActive || isCompleted
          ? { backgroundColor: primaryColor, borderColor: primaryColor }
          : { backgroundColor: colors.surface || colors.cardBackground, borderColor: colors.border || '#D0D5DD' };
        const circleTextColor = isActive || isCompleted ? '#FFFFFF' : (colors.text as string) || '#101828';
        return (
          <React.Fragment key={stepItem.id}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  circleStyles,
                ]}
              >
                <Text style={[styles.progressCircleText, { color: circleTextColor }]}>{stepItem.id}</Text>
              </View>
              <Text style={[styles.progressLabel, { color: isActive || isCompleted ? primaryColor : colors.textSecondary }]}>
                {stepItem.label}
              </Text>
            </View>
            {nextItem ? (
              <View
                style={[
                  styles.progressLine,
                  { backgroundColor: colors.border || '#D0D5DD' },
                  (current > stepItem.id) && { backgroundColor: primaryColor },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleText: {
    fontWeight: '600',
  },
  progressLabel: {
    marginTop: 6,
    fontSize: 12,
    maxWidth: 100,
    textAlign: 'center',
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    backgroundColor: '#D0D5DD',
  },
  content: {
    paddingBottom: 80,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  toggleGroup: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  selectableCard: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'transparent',
  },
  selectableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectableCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectableCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  slotEditorWrapper: {
    marginBottom: 16,
  },
  slotEditorTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  slotDayContainer: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  slotDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotDayLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  addSlotButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  slotEmptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: 'transparent',
    gap: 10,
  },
  slotInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  timeInput: {
    width: 70,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 10,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: '600',
  },
  slotRemoveButton: {
    padding: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    flexWrap: 'wrap',
  },
  primaryButtonWrapper: {
    minWidth: 140,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonWrapperDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceList: {
    gap: 12,
  },
  serviceCard: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  retryButtonText: {
    fontWeight: '600',
  },
  planList: {
    gap: 12,
  },
  planCard: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 14,
    padding: 18,
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  planDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  planOriginalPrice: {
    fontSize: 14,
    color: '#F44336',
    textDecorationLine: 'line-through',
  },
  planBadge: {
    marginTop: 10,
    fontSize: 12,
    color: '#F28A00',
    fontWeight: '600',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryContent: {
    flex: 1,
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summarySubtitle: {
    fontSize: 13,
  },
  summaryList: {
    marginTop: 8,
    gap: 6,
  },
  summaryListGroup: {
    marginBottom: 8,
  },
  summaryListGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryListItem: {
    fontSize: 13,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TechnicianOnboardingScreen;

