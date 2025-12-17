import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { storage } from '../utils/storage';

interface Project {
  id: number;
  userId: number;
  userName: string;
  description: string;
  status: string;
  budget: number;
  address: string;
  createdAt: string;
  assignedTechnician: {
    id: number;
    name: string;
  } | null;
  phases: any[];
}

interface Bid {
  id: number;
  technicianId: number;
  technicianName: string;
  projectId: number;
  amount: number;
  status: string;
  createdAt: string;
}

interface VisitRequest {
  id: number;
  projectId: number;
  projectDescription: string;
  technicianId: number;
  technicianName: string;
  status: string;
  requestedDate: string;
  createdAt: string;
}

interface ProjectWithCounts extends Project {
  bidCount: number;
  visitRequestCount: number;
}

interface ProjectCardsProps {
  authToken?: string;
}

export default function ProjectCards({ authToken }: ProjectCardsProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [authToken]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = authToken || await storage.getAuthToken();
      if (!token) {
        setError(t('Please login to view projects'));
        setLoading(false);
        return;
      }

      // Fetch projects
      const projectsUrl = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_PROJECTS);
      console.log('📥 Fetching projects from:', projectsUrl);

      const projectsResponse = await fetch(projectsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!projectsResponse.ok) {
        throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
      }

      const projectsData: Project[] = await projectsResponse.json();
      console.log('✅ Loaded projects:', projectsData.length);

      // Fetch visit requests (all at once)
      // Note: This endpoint is documented in get-projects.md but not in API_ENDPOINTS
      const visitRequestsUrl = buildApiUrl('/visit-requests/for-me');
      console.log('📥 Fetching visit requests from:', visitRequestsUrl);

      const visitRequestsResponse = await fetch(visitRequestsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let visitRequests: VisitRequest[] = [];
      if (visitRequestsResponse.ok) {
        visitRequests = await visitRequestsResponse.json();
        console.log('✅ Loaded visit requests:', visitRequests.length);
      } else {
        console.warn('⚠️ Failed to fetch visit requests:', visitRequestsResponse.status);
      }

      // Group visit requests by project ID
      const visitRequestsByProject: Record<number, number> = {};
      visitRequests.forEach((vr) => {
        visitRequestsByProject[vr.projectId] = (visitRequestsByProject[vr.projectId] || 0) + 1;
      });

      // Fetch bids for each project and combine with visit requests
      const projectsWithCounts: ProjectWithCounts[] = await Promise.all(
        projectsData.map(async (project) => {
          try {
            const bidsUrl = buildApiUrl(API_ENDPOINTS.BIDS.LIST.replace(':projectId', project.id.toString()));
            const bidsResponse = await fetch(bidsUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            let bidCount = 0;
            if (bidsResponse.ok) {
              const bids: Bid[] = await bidsResponse.json();
              bidCount = bids.length;
            }

            return {
              ...project,
              bidCount,
              visitRequestCount: visitRequestsByProject[project.id] || 0,
            };
          } catch (error) {
            console.error(`❌ Error fetching bids for project ${project.id}:`, error);
            return {
              ...project,
              bidCount: 0,
              visitRequestCount: visitRequestsByProject[project.id] || 0,
            };
          }
        })
      );

      setProjects(projectsWithCounts);
      console.log('✅ Projects with counts loaded:', projectsWithCounts.length);
    } catch (err: any) {
      console.error('❌ Error loading projects:', err);
      setError(err.message || t('Failed to load projects'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper.includes('PENDING') || statusUpper.includes('BID_RECEIVED')) {
      return '#FF9500';
    } else if (statusUpper.includes('ACCEPTED') || statusUpper.includes('IN_PROGRESS')) {
      return '#4CAF50';
    } else if (statusUpper.includes('COMPLETED')) {
      return '#2196F3';
    }
    return colors.textSecondary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('Loading projects...')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error || '#FF3B30'} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadProjects}
        >
          <Text style={styles.retryButtonText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('No projects yet')}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {t('Create your first project to get started')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('My Projects')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('{{count}} projects', { count: projects.length })}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.cardBackground,
                borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
            activeOpacity={0.7}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={[styles.projectId, { color: colors.textSecondary }]}>
                  #{project.id}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(project.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(project.status) },
                    ]}
                  >
                    {project.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Project Description */}
            <Text
              style={[styles.description, { color: colors.text }]}
              numberOfLines={2}
            >
              {project.description}
            </Text>

            {/* Project Details */}
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {project.address}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {formatCurrency(project.budget)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {formatDate(project.createdAt)}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.statItem, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="hand-left-outline" size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {project.bidCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('Bids')}
                </Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#FF9500' + '15' }]}>
                <Ionicons name="calendar-outline" size={18} color="#FF9500" />
                <Text style={[styles.statValue, { color: '#FF9500' }]}>
                  {project.visitRequestCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('Visits')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  scrollView: {
    marginHorizontal: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  card: {
    width: 320,
    marginRight: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectId: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    minHeight: 44,
  },
  details: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});

