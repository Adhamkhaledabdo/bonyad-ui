import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, StyleProp, ViewStyle, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

type ProjectCreationStepKey =
  | 'CREATING'
  | 'PENDING'
  | 'BID_RECEIVED'
  | 'APPROVED'
  | 'CONTRACT_SIGNING'
  | 'IN_PROGRESS'
  | 'COMPLETED';

interface ProjectCreationFlowProps {
  /**
   * Current status in the creation flow. All steps up to and including this one
   * will be highlighted in the primary color to indicate completion.
   */
  currentStep?: ProjectCreationStepKey;
  containerStyle?: StyleProp<ViewStyle>;
}

interface StepConfig {
  key: ProjectCreationStepKey;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PRIMARY_FIGMA_BLUE = '#005DAC';
const TEXT_BODY = '#383838';
const TEXT_SECONDARY = '#A3A3A3';

const STEPS: StepConfig[] = [
  { key: 'CREATING', labelKey: 'projectFlow.creating', icon: 'add-circle-outline' },
  { key: 'PENDING', labelKey: 'projectFlow.pending', icon: 'time-outline' },
  { key: 'BID_RECEIVED', labelKey: 'projectFlow.bidReceived', icon: 'cash-outline' },
  { key: 'APPROVED', labelKey: 'projectFlow.approved', icon: 'checkmark-circle-outline' },
  { key: 'CONTRACT_SIGNING', labelKey: 'projectFlow.contractSigning', icon: 'document-text-outline' },
  { key: 'IN_PROGRESS', labelKey: 'projectFlow.inProgress', icon: 'time-outline' },
  { key: 'COMPLETED', labelKey: 'projectFlow.completed', icon: 'checkmark-done-outline' },
];

// Step width constants for scrolling calculation (Android/small web)
const INACTIVE_STEP_WIDTH = 50; // Width of inactive step (icon only)
const ACTIVE_STEP_WIDTH = 100; // Estimated width of active step with text
const CONNECTOR_WIDTH = 36; // Width of connector between steps

export default function ProjectCreationFlow({
  currentStep = 'PENDING',
  containerStyle,
}: ProjectCreationFlowProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);

  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const IS_SCROLLABLE = !IS_LARGE_WEB; // Android and small web are scrollable

  const activeIndex = Math.max(
    STEPS.findIndex((step) => step.key === currentStep),
    0,
  );

  const primaryColor = (colors?.primary as string) || PRIMARY_FIGMA_BLUE;
  const inactiveColor = colors?.textSecondary || TEXT_SECONDARY;
  const completedColor = primaryColor;

  // Auto-scroll to active step when it changes
  useEffect(() => {
    if (IS_SCROLLABLE && scrollViewRef.current) {
      // Calculate the scroll position to center the active step
      // All steps before active are inactive width, active step has larger width
      const stepPosition = activeIndex * (INACTIVE_STEP_WIDTH + CONNECTOR_WIDTH);
      const scrollToX = Math.max(0, stepPosition - (screenWidth / 2) + (ACTIVE_STEP_WIDTH / 2));
      
      // Small delay to ensure layout is complete
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
      }, 100);
    }
  }, [activeIndex, IS_SCROLLABLE, screenWidth]);

  const renderSteps = () => (
    <View style={[
      styles.stepsContainer,
      IS_SCROLLABLE && styles.stepsContainerScrollable,
      !IS_SCROLLABLE && styles.stepsContainerNonScrollable,
    ]}>
      {STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isActive = index === activeIndex;
        
        // Determine colors
        const iconColor = isCompleted || isActive ? completedColor : inactiveColor;
        const connectorColor = isCompleted ? completedColor : inactiveColor;
        
        // For Android and small web: all icons same size (the larger active size)
        // For large web: keep the original behavior (active is larger)
        const iconSize = IS_LARGE_WEB
          ? (isActive ? 48 : 32)
          : Platform.select({
              android: 22, // All same size (larger)
              ios: 22,     // All same size (larger)
              default: 24, // Small web - all same size (larger)
            });

        return (
          <React.Fragment key={step.key}>
            <View style={[
              styles.step,
              IS_SCROLLABLE && styles.stepScrollable,
              isActive && styles.activeStep,
              isActive && IS_SCROLLABLE && styles.activeStepScrollable,
            ]}>
              <View style={[
                styles.iconContainer,
                isActive && styles.activeIconContainer,
              ]}>
                <Ionicons name={step.icon} size={iconSize} color={iconColor} />
              </View>
              
              {/* Only show label for active step */}
              {isActive && (
                <Text
                  style={[
                    styles.label,
                    { color: primaryColor },
                  ]}
                  numberOfLines={1}
                >
                  {t(step.labelKey)}
                </Text>
              )}
              
              {/* Active indicator bar */}
              {isActive && (
                <View style={[styles.activeBar, { backgroundColor: primaryColor }]} />
              )}
            </View>

            {/* Connector between steps */}
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.connector,
                  IS_SCROLLABLE && styles.connectorScrollable,
                  IS_LARGE_WEB && styles.connectorLargeWeb,
                  {
                    borderColor: connectorColor,
                    ...(Platform.OS === 'web'
                      ? { borderStyle: 'dashed' as const }
                      : {}),
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // For Android and small web: wrap in ScrollView
  if (IS_SCROLLABLE) {
    return (
      <View style={[styles.scrollContainer, containerStyle]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {renderSteps()}
    </ScrollView>
      </View>
    );
  }

  // For large web: no scroll, original behavior
  return (
    <View style={[styles.container, containerStyle]}>
      {renderSteps()}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container for scrollable version
  scrollContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Container for non-scrollable (large web)
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  // Steps container (inner wrapper)
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepsContainerScrollable: {
    // Extended width for scrollable content
    paddingRight: 16,
  },
  stepsContainerNonScrollable: {
    justifyContent: 'space-between',
    width: '100%',
  },
  step: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
  },
  stepScrollable: {
    // Fixed width for inactive scrollable steps (icon only)
    width: INACTIVE_STEP_WIDTH,
    minWidth: INACTIVE_STEP_WIDTH,
  },
  activeStep: {
    flex: 1,
    maxWidth: Platform.select({ android: 65, ios: 70, default: 80 }),
  },
  activeStepScrollable: {
    // Allow active step to expand to fit text naturally
    flex: 0,
    width: 'auto',
    minWidth: ACTIVE_STEP_WIDTH,
    maxWidth: 150, // Max width to prevent too wide
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: Platform.select({ android: 11, ios: 12, default: 12 }),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    flexShrink: 0, // Prevent text from shrinking
  },
  activeBar: {
    marginTop: Platform.select({ android: 4, default: 5 }),
    height: 2,
    width: '100%',
    borderRadius: 12,
  },
  connector: {
    flex: 1,
    maxWidth: 40,
    minWidth: 16,
    borderBottomWidth: 1,
    marginHorizontal: 4,
  },
  connectorScrollable: {
    // Fixed width for scrollable connectors
    flex: 0,
    width: CONNECTOR_WIDTH,
    minWidth: CONNECTOR_WIDTH,
    maxWidth: CONNECTOR_WIDTH,
    marginHorizontal: 6,
  },
  connectorLargeWeb: {
    borderBottomWidth: 2,
    maxWidth: 60,
    minWidth: 24,
    marginHorizontal: 8,
  },
});
