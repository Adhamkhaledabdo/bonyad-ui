import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { storage } from '../utils/storage';

interface ProjectData {
  id: string;
  region: string;
  lat: number;
  lng: number;
  status: 'Active' | 'Completed';
  count: number;
}

interface ProjectsMapScreenProps {
  onBack: () => void;
}

export default function ProjectsMapScreen({ onBack }: ProjectsMapScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [projectData, setProjectData] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  // Use different map library based on platform
  const MapView = Platform.OS === 'web' 
    ? null // Will use placeholder for web
    : require('react-native-maps').default;
  const Marker = Platform.OS === 'web' 
    ? null 
    : require('react-native-maps').Marker;

  const loadMapData = async () => {
    setIsLoading(true);
    
    try {
      const token = await storage.getAuthToken();

      // Fetch project data
      const projectsResponse = await fetch(buildApiUrl(API_ENDPOINTS.AI.MAP_PROJECTS), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        
        // Transform data to match our interface
        const transformedData = projectsData.regions.map((region: any, index: number) => ({
          id: index.toString(),
          region: region.region,
          lat: region.lat,
          lng: region.lng,
          status: 'Active' as const, // Could be more sophisticated
          count: region.active || 0,
        }));
        
        setProjectData(transformedData);
      }

      // Fetch AI summary
      const summaryResponse = await fetch(buildApiUrl(API_ENDPOINTS.AI.MAP_SUMMARIZE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          timeRange: 'month',
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setAiSummary(summaryData.summary || '');
      }
    } catch (error: any) {
      console.error('Map Data API Error:', error);
      // Show fallback message if API fails
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to load map data. Showing sample data.' : 'فشل تحميل بيانات الخريطة. عرض بيانات تجريبية.'
      );
      // Fallback to default data
      setProjectData([
        { id: '1', region: 'Riyadh', lat: 24.7136, lng: 46.6753, status: 'Active', count: 32 },
        { id: '2', region: 'Jeddah', lat: 21.4858, lng: 39.1925, status: 'Active', count: 21 },
        { id: '3', region: 'Dammam', lat: 26.4207, lng: 50.0888, status: 'Completed', count: 15 },
        { id: '4', region: 'Mecca', lat: 21.3891, lng: 39.8579, status: 'Active', count: 18 },
      ]);
      setAiSummary(i18n.language === 'en' 
        ? 'Riyadh leads with 32 ongoing projects this week, followed by Jeddah with 21 active renovations.' 
        : 'الرياض تتصدر بـ 32 مشروعًا جارياً هذا الأسبوع، تليها جدة بـ 21 تجديد نشط.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  const getMarkerColor = (status: string) => {
    return status === 'Active' ? '#4CAF50' : '#FF9800';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={i18n.language === 'ar' ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {i18n.language === 'en' ? 'Projects Map' : 'خريطة المشاريع'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* AI Summary */}
          {aiSummary && (
            <View style={[styles.aiSummaryContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={[styles.aiSummaryText, { color: colors.text }]}>{aiSummary}</Text>
            </View>
          )}

          {/* Map */}
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="map" size={80} color={colors.primary} />
                <Text style={[styles.mapPlaceholderText, { color: colors.textSecondary }]}>
                  {i18n.language === 'en' ? 'Map coming soon on web' : 'الخريطة قريباً على الويب'}
                </Text>
              </View>
            ) : MapView ? (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: 24.7136,
                  longitude: 46.6753,
                  latitudeDelta: 8,
                  longitudeDelta: 8,
                }}
              >
                {projectData.map((project) => (
                  <Marker
                    key={project.id}
                    coordinate={{ latitude: project.lat, longitude: project.lng }}
                    title={project.region}
                    description={`${project.count} ${project.status} projects`}
                  >
                    <View style={[styles.markerContainer, { backgroundColor: getMarkerColor(project.status) }]}>
                      <Text style={styles.markerText}>{project.count}</Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
            ) : null}
          </View>

          {/* Stats Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
            {projectData.map((project) => (
              <View
                key={project.id}
                style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              >
                <View style={[styles.statIconContainer, { backgroundColor: getMarkerColor(project.status) + '20' }]}>
                  <Ionicons 
                    name="business-outline" 
                    size={30} 
                    color={getMarkerColor(project.status)} 
                  />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{project.count}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {project.status === 'Active' 
                    ? (i18n.language === 'en' ? 'Active Projects' : 'مشاريع نشطة') 
                    : (i18n.language === 'en' ? 'Completed' : 'مكتملة')}
                </Text>
                <Text style={[styles.statCity, { color: colors.text }]}>{project.region}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Legend */}
          <View style={[styles.legendContainer, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.legendTitle, { color: colors.text }]}>
              {i18n.language === 'en' ? 'Legend' : 'المفتاح'}
            </Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  {i18n.language === 'en' ? 'Active Projects' : 'مشاريع نشطة'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  {i18n.language === 'en' ? 'Completed Projects' : 'مشاريع مكتملة'}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  aiSummaryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  mapContainer: {
    flex: 1,
    height: 300,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapPlaceholderText: {
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  statsContainer: {
    maxHeight: 200,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statCard: {
    width: 150,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  statCity: {
    fontSize: 16,
    fontWeight: '600',
  },
  legendContainer: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  legendItems: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
  },
});

