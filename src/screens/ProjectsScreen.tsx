import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import ProjectDetailModal from './ProjectDetailModal';
import TechnicianBidsView from './TechnicianBidsView';
import BidFormModal from './BidFormModal';
import VisitRequestModal from './VisitRequestModal';
import PhaseEditingPage from './PhaseEditingPage';
import ContractSigningPage from './ContractSigningPage';
import ProjectProgressPage from './ProjectProgressPage';
import UserPhaseViewPage from './UserPhaseViewPage';
import UserPhaseReviewPage from './UserPhaseReviewPage';
import UserContractSigningPage from './UserContractSigningPage';
import UserProjectProgressPage from './UserProjectProgressPage';
import CompletedProjectViewPage from './CompletedProjectViewPage';
import TechnicianProfileView from './TechnicianProfileView';
import OwnerProjectEditScreen from './OwnerProjectEditScreen';

interface ProjectsScreenProps {
  onBack?: () => void;
  filter?: 'all' | 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers';
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onBookAppointment?: (technicianId: number, technicianName: string, projectId?: number) => void;
  onRequestVisit?: (userId: number, userName: string, projectId?: number) => void;
  onFilterChange?: (filter: 'all' | 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers') => void;
}

interface Project {
  id: number;
  description: string;
  budget: number;
  status: string;
  address: string;
  serviceNameEn: string;
  serviceNameAr: string;
  serviceId: number;
  phases?: Array<{
    id: number;
    phaseNumber: number;
    description: string;
    moneySpent: number;
    timeSpentDays: number;
  }>;
}

interface Service {
  id: number;
  nameEn: string;
  nameAr: string;
  description: string;
  imageUrl: string;
}

const CONTAINER_PADDING = 20; // Padding from listContent style
const CARD_GAP = 16; // Gap between cards in a row

export default function ProjectsScreen({ onBack, filter = 'available', onOpenChat, onViewTechnician, onBookAppointment, onRequestVisit, onFilterChange }: ProjectsScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showBidForm, setShowBidForm] = useState(false);
  const [showVisitRequest, setShowVisitRequest] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [localFilter, setLocalFilter] = useState<'all' | 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers'>(filter || 'available');
  // New pages for technicians and users
  const [currentPage, setCurrentPage] = useState<'list' | 'phase-editing' | 'contract-signing' | 'progress' | 'user-phase-view' | 'user-phase-review' | 'user-contract-signing' | 'user-progress' | 'completed-project' | 'technician-profile' | 'project-detail' | 'owner-edit'>('list');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);

  // Update local filter when prop changes
  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  // Calculate responsive breakpoints
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const columns = IS_LARGE_WEB ? 2 : 1;

  // Calculate dynamic card width based on screen size
  const cardWidth = React.useMemo(() => {
    const availableWidth = screenWidth - (CONTAINER_PADDING * 2) - CARD_GAP;
    return availableWidth / 2;
  }, [screenWidth]);

  // Handle filter change
  const handleFilterChange = (newFilter: 'all' | 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers') => {
    setLocalFilter(newFilter);
    if (onFilterChange) {
      onFilterChange(newFilter);
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDetail(false);
    setCurrentPage('owner-edit');
  };

  const handleDeleteProject = async (project: Project) => {
    Alert.alert(
      t('Delete Project'),
      t('Are you sure you want to delete this project? This action cannot be undone.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getAuthToken();
              if (!token) {
                Alert.alert(t('Error'), t('Please login again'));
                return;
              }

              const deleteUrl = buildApiUrl(API_ENDPOINTS.PROJECTS.DELETE.replace(':id', project.id.toString()));
              const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok || response.status === 204) {
                Alert.alert(t('Success'), t('Project deleted successfully'), [
                  {
                    text: t('OK'),
                    onPress: () => {
                      loadProjects();
                    },
                  },
                ]);
              } else {
                const errorText = await response.text();
                throw new Error(errorText || t('Failed to delete project'));
              }
            } catch (error: any) {
              console.error('❌ Failed to delete project:', error);
              Alert.alert(t('Error'), error.message || t('Failed to delete project'));
            }
          },
        },
      ]
    );
  };

  // Listen for screen dimension changes (especially important for web resize)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    loadUserRole();
    loadServices();
  }, []);

  // Load projects on mount and when filter changes
  useEffect(() => {
    loadProjects();
  }, [localFilter]);

  const loadUserRole = async () => {
    const role = await storage.getUserRole();
    setUserRole(role);
  };

  useEffect(() => {
    filterProjects();
  }, [selectedCategory, projects, userRole, localFilter]);

  const loadServices = async () => {
    try {
      const url = buildApiUrl(API_ENDPOINTS.SERVICES.LIST);
      console.log('🔍 Fetching services from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Services API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded services:', data);
        console.log('📊 Number of services:', data.length);
        setServices(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load services - Status:', response.status);
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading services:', error);
    }
  };

  const loadProjects = async () => {
    try {
      // Get user role to determine which endpoint to use
      const role = await storage.getUserRole();
      const token = await storage.getAuthToken();
      const isTechnician = role?.toUpperCase() === 'TECHNICIAN';
      const currentFilter = localFilter;
      
      console.log('👤 User role:', role);
      console.log('🔍 Current filter:', currentFilter);

      let url: string;
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
      };

      // Add auth token for all authenticated endpoints
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Determine API endpoint based on role and filter
      if (isTechnician) {
        // TECHNICIAN ENDPOINTS
        if (currentFilter === 'available') {
          // Look for Offers (BID NOW) - All available projects to bid on
          url = buildApiUrl(API_ENDPOINTS.PROJECTS.LIST);
          // No auth required for this endpoint
          delete headers['Authorization'];
        } else if (currentFilter === 'direct_offers') {
          // Direct Offers - Projects directly assigned to technician
          url = buildApiUrl(`${API_ENDPOINTS.PROJECTS.MY_ASSIGNED}?type=DIRECT_ASSIGNMENT`);
        } else if (currentFilter === 'running') {
          // My Assigned Projects - Projects where bid was accepted
          url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_ASSIGNED);
        } else if (currentFilter === 'bid_received') {
          // My Bids - This uses bids API, not projects API
          url = buildApiUrl(API_ENDPOINTS.BIDS.MY_BIDS);
        } else if (currentFilter === 'completed') {
          // Completed Projects - Filter from my-assigned
          url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_ASSIGNED);
        } else {
          // Default to available projects
          url = buildApiUrl(API_ENDPOINTS.PROJECTS.LIST);
          delete headers['Authorization'];
        }
      } else {
        // USER ENDPOINTS - All use /projects/my
        url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_PROJECTS);
        if (!token) {
          console.error('❌ No auth token found for /projects/my');
          setIsLoading(false);
          setRefreshing(false);
          return;
        }
      }

      console.log('🔍 Fetching from:', url);
      console.log('🎯 Filter:', currentFilter);
      console.log('🎯 Role:', role);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log('📥 API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded data:', data);
        console.log('📊 Number of items:', data.length);
        
        // For bid_received filter, we get bids, not projects
        // We'll need to transform them or handle separately
        if (currentFilter === 'bid_received' && isTechnician) {
          // Transform bids to project-like structure for display
          const bidsAsProjects = data.map((bid: any) => ({
            id: bid.projectId,
            description: bid.projectDescription || bid.comment || 'Project',
            budget: bid.projectBudget || bid.proposedBudget || 0,
            status: bid.status,
            address: '',
            serviceNameEn: 'Bid',
            serviceNameAr: 'عرض',
            serviceId: 0,
            bidId: bid.id,
            proposedBudget: bid.proposedBudget,
            comment: bid.comment,
            estimatedDurationDays: bid.estimatedDurationDays,
            createdAt: bid.createdAt,
          }));
          setProjects(bidsAsProjects);
        } else {
          setProjects(data);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load - Status:', response.status);
        console.error('❌ Error response:', errorText);
        setProjects([]);
      }
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
    loadProjects();
  };

  const handleViewTechnician = (technicianId: number) => {
    console.log('🔵 [ProjectsScreen] Viewing technician profile:', technicianId);
    setSelectedTechnicianId(technicianId);
    setCurrentPage('technician-profile');
  };

  const filterProjects = () => {
    let filtered = [...projects];
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';

    // Filter by status based on the localFilter state and role
    if (localFilter === 'available') {
      if (isTechnician) {
        // For technicians: Available Projects - show all projects from /projects endpoint
        // The API returns all available projects, so no additional filtering needed
        // Optionally filter to show only PENDING if you want to exclude other statuses
        filtered = filtered.filter(p => p.status === 'PENDING');
      } else {
        // For users: Available Projects - show PENDING and BID_RECEIVED projects
        filtered = filtered.filter(p => 
          p.status === 'PENDING' || p.status === 'BID_RECEIVED'
        );
      }
    } else if (localFilter === 'running') {
      // For technicians: Running Projects - exclude PENDING and COMPLETED
      // For users: Running Projects - filter by statuses that support phases
      if (userRole?.toUpperCase() === 'TECHNICIAN') {
        // Technician: All projects except PENDING and COMPLETED
        filtered = filtered.filter(p => {
          const status = p.status.toUpperCase();
          return status !== 'PENDING' && status !== 'COMPLETED';
        });
      } else {
        // User: Running Projects - filter by statuses that support phases
        const runningStatuses = [
          'APPROVED',              // Technician can plan phases
          'PHASE_PLANNING',        // User reviewing phases
          'PHASE_PLANNING_APPROVED', // Phases approved, contract signing
          'CONTRACT_SIGNING',      // Contract signing phase
          'IN_PROGRESS'            // Work in progress
        ];
        filtered = filtered.filter(p => 
          runningStatuses.includes(p.status.toUpperCase())
        );
      }
    } else if (localFilter === 'completed') {
      // Completed Projects - filter by COMPLETED status
      filtered = filtered.filter(p => 
        p.status.toUpperCase() === 'COMPLETED'
      );
    } else if (localFilter === 'bid_received') {
      // My Bids - for technicians, these are already bids transformed to projects
      // Show all bids (they're already filtered by the API)
      filtered = filtered; // No additional filtering needed
    } else if (localFilter === 'direct_offers') {
      // Direct Offers - for technicians
      // The API /projects/my-assigned?type=DIRECT_ASSIGNMENT already filters correctly
      filtered = filtered; // No additional filtering needed
    }

    // Filter by service category
    if (selectedCategory !== 'All') {
      const serviceId = parseInt(selectedCategory);
      if (!isNaN(serviceId)) {
        filtered = filtered.filter(p => p.serviceId === serviceId);
      }
    }

    setFilteredProjects(filtered);
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#FFA500';
      case 'IN_PROGRESS':
      case 'ACCEPTED':
        return '#4CAF50';
      case 'COMPLETED':
        return '#2196F3';
      default:
        return colors.textSecondary;
    }
  };

  const riyalLogo = theme === 'dark'
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  const getStatusLabel = (status: string) => {
    if (!status) return t('Unknown');
    return status
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const computePhaseMetrics = (phases: Project['phases']) => {
    if (!phases || phases.length === 0) {
      return {
        totalPercent: 0,
        totalSpent: 0,
        percentData: [],
        budgetData: [],
      };
    }

    const totalBudget = phases.reduce((sum, phase) => sum + (phase.moneySpent || 0), 0);
    const percentData = phases.map((phase) => ({
      name: `${t('Phase')} ${phase.phaseNumber}`,
      value: Math.max(1, Math.round((phase.moneySpent / totalBudget) * 100)),
    }));

    const budgetData = phases.map((phase) => ({
      label: `${t('P')} ${phase.phaseNumber}`,
      value: phase.moneySpent,
    }));

    return {
      totalPercent: 100,
      totalSpent: totalBudget,
      percentData,
      budgetData,
    };
  };

  const renderProjectCard = ({ item }: { item: Project }) => {
    const serviceName = i18n.language === 'ar' ? item.serviceNameAr : item.serviceNameEn;
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
    const phasesCount =
      Array.isArray(item.phases) && item.phases.length > 0
        ? item.phases.length
        : (item as any)?.phaseCount ?? 0;
    const statusLabel = getStatusLabel(item.status || '');
    const phaseMetrics = computePhaseMetrics(item.phases);

    return (
      <View
        style={[
          styles.projectCard,
          columns > 1 ? styles.projectCardLargeWeb : styles.projectCardFullWidth,
          { backgroundColor: colors.cardBackground },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            const status = item.status?.toUpperCase();
            const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
            
            // For technicians in running projects, navigate to specific pages based on status
            if (isTechnician && localFilter === 'running') {
              console.log('🔵 [ProjectsScreen] Technician clicked on running project');
              console.log('🔵 [ProjectsScreen] Project Status:', status);
              setSelectedProject(item);
              
              if (status === 'APPROVED' || status === 'PHASE_PLANNING') {
                console.log('🔵 [ProjectsScreen] Navigating to PhaseEditingPage');
                setCurrentPage('phase-editing');
              } else if (status === 'CONTRACT_SIGNING') {
                console.log('🔵 [ProjectsScreen] Navigating to ContractSigningPage');
                setCurrentPage('contract-signing');
              } else if (status === 'IN_PROGRESS') {
                console.log('🔵 [ProjectsScreen] Navigating to ProjectProgressPage');
                setCurrentPage('progress');
              } else {
                // Fallback to ProjectDetailModal for other statuses
                setShowProjectDetail(true);
              }
            } 
            // For users in running projects, navigate to specific pages based on status
            else if (!isTechnician && localFilter === 'running') {
              console.log('🔵 [ProjectsScreen] User clicked on running project');
              console.log('🔵 [ProjectsScreen] Project Status:', status);
              setSelectedProject(item);
              
              if (status === 'APPROVED') {
                console.log('🔵 [ProjectsScreen] Navigating to UserPhaseViewPage');
                setCurrentPage('user-phase-view');
              } else if (status === 'PHASE_PLANNING') {
                console.log('🔵 [ProjectsScreen] Navigating to UserPhaseReviewPage');
                setCurrentPage('user-phase-review');
              } else if (status === 'CONTRACT_SIGNING') {
                console.log('🔵 [ProjectsScreen] Navigating to UserContractSigningPage');
                setCurrentPage('user-contract-signing');
              } else if (status === 'IN_PROGRESS') {
                console.log('🔵 [ProjectsScreen] Navigating to UserProjectProgressPage');
                setCurrentPage('user-progress');
              } else {
                // For other statuses, use ProjectDetailModal
                setShowProjectDetail(true);
              }
            }
            // For users in completed projects, navigate to CompletedProjectViewPage
            else if (!isTechnician && (localFilter === 'completed' || status === 'COMPLETED')) {
              console.log('🔵 [ProjectsScreen] User clicked on completed project');
              console.log('🔵 [ProjectsScreen] Project Status:', status);
              setSelectedProject(item);
              setCurrentPage('completed-project');
            }
            // For other filters or cases, use ProjectDetailModal
            else {
              setSelectedProject(item);
              setShowProjectDetail(true);
            }
          }}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                {serviceName || t('Project')}
              </Text>
              {item.status && (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {statusLabel}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.metaItem}>
              <Image source={riyalLogo} style={styles.riyalLogo} resizeMode="contain" />
              <Text style={[styles.budgetText, { color: colors.primary }]}>
                {formatBudget(item.budget)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {item.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3} ellipsizeMode="tail">
              {item.description}
            </Text>
          ) : null}

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="briefcase-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {serviceName}
              </Text>
            </View>
            {phasesCount > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {t('Phases')}: {phasesCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Technician Action Buttons */}
        {isTechnician && localFilter === 'available' && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.primary }]}
              onPress={() => {
                setSelectedProject(item);
                setShowVisitRequest(true);
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
                {t('Ask for Visit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setSelectedProject(item);
                setShowBidForm(true);
              }}
            >
              <Ionicons name="cash-outline" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]} numberOfLines={1} ellipsizeMode="tail">
                {t('Bid Now')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User Action Buttons - Edit and Delete for available projects */}
        {!isTechnician && localFilter === 'available' && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary, flex: 1 }]}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleEditProject(item);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]} numberOfLines={1} ellipsizeMode="tail">
                {t('Edit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error, flex: 1, marginLeft: 8 }]}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleDeleteProject(item);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]} numberOfLines={1} ellipsizeMode="tail">
                {t('Delete')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          {onBack ? (
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {localFilter === 'available' ? (isTechnician ? t('Look for Offers') : t('Available Projects')) : 
             localFilter === 'running' ? (isTechnician ? t('My Assigned Projects') : t('Running Projects')) : 
             localFilter === 'bid_received' ? t('My Bids') :
             localFilter === 'direct_offers' ? t('Direct Offers') :
             localFilter === 'completed' ? t('Completed Projects') :
             t('Projects')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // If showing a specific page, render only that page
  if (currentPage !== 'list' && selectedProject && currentPage !== 'technician-profile') {
    // Pages will be rendered below in the return statement
    // Return early to prevent rendering the list
  }
  
  if (currentPage === 'technician-profile' && selectedTechnicianId) {
    // Technician profile page will be rendered below
    // Return early to prevent rendering the list
  }

  return (
    <>
      {/* New Pages for Technicians in Running Projects */}
      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       localFilter === 'running' && 
       selectedProject && 
       currentPage === 'phase-editing' && (
        <PhaseEditingPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from PhaseEditingPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] PhaseEditingPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       localFilter === 'running' && 
       selectedProject && 
       currentPage === 'contract-signing' && (
        <ContractSigningPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from ContractSigningPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ContractSigningPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       localFilter === 'running' && 
       selectedProject && 
       currentPage === 'progress' && (
        <ProjectProgressPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from ProjectProgressPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onRequestVisit={onRequestVisit}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ProjectProgressPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {/* User Pages for Running Projects */}
      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       localFilter === 'running' && 
       selectedProject && 
       currentPage === 'user-phase-view' && (
        <UserPhaseViewPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from UserPhaseViewPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] UserPhaseViewPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       localFilter === 'running' && 
       selectedProject && 
       currentPage === 'user-phase-review' && (
        <UserPhaseReviewPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from UserPhaseReviewPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] UserPhaseReviewPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       localFilter === 'running' && 
       selectedProject && 
       currentPage === 'user-contract-signing' && (
        <UserContractSigningPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from UserContractSigningPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] UserContractSigningPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       localFilter === 'running' && 
       selectedProject && 
       currentPage === 'user-progress' && (
        <UserProjectProgressPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from UserProjectProgressPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onBookAppointment={onBookAppointment}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] UserProjectProgressPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       selectedProject && 
       currentPage === 'completed-project' && (
        <CompletedProjectViewPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from CompletedProjectViewPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] CompletedProjectViewPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() !== 'TECHNICIAN' &&
       selectedProject &&
       currentPage === 'owner-edit' && (
        <OwnerProjectEditScreen
          projectId={selectedProject.id}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from OwnerProjectEditScreen');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] OwnerProjectEditScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}
 
      {/* Technician Profile View */}
      {currentPage === 'technician-profile' && selectedTechnicianId && (
        <TechnicianProfileView
          technicianId={selectedTechnicianId}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from TechnicianProfileView');
            setCurrentPage('list');
            setSelectedTechnicianId(null);
          }}
        />
      )}

      {/* Projects List - Only show if not on a specific page */}
      {currentPage === 'list' && (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      {!IS_LARGE_WEB && (() => {
        const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
        return (
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
            {onBack ? (
              <TouchableOpacity onPress={onBack}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {localFilter === 'available' ? (isTechnician ? t('Look for Offers') : t('Available Projects')) : 
               localFilter === 'running' ? (isTechnician ? t('My Assigned Projects') : t('Running Projects')) : 
               localFilter === 'bid_received' ? t('My Bids') :
               localFilter === 'direct_offers' ? t('Direct Offers') :
               localFilter === 'completed' ? t('Completed Projects') :
               t('Projects')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
        );
      })()}

      {/* Tabs for Large Web Screens */}
      {IS_LARGE_WEB && (() => {
        const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
        return (
          <View style={[styles.tabsContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { borderBottomColor: localFilter === 'available' ? colors.primary : 'transparent' }
                ]}
                onPress={() => handleFilterChange('available')}
              >
                <Text style={[
                  styles.tabButtonText,
                  localFilter === 'available' && styles.tabButtonActive,
                  { color: localFilter === 'available' ? colors.primary : colors.textSecondary }
                ]}>
                  {t('Available')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { borderBottomColor: localFilter === 'running' ? colors.primary : 'transparent' }
                ]}
                onPress={() => handleFilterChange('running')}
              >
                <Text style={[
                  styles.tabButtonText,
                  localFilter === 'running' && styles.tabButtonActive,
                  { color: localFilter === 'running' ? colors.primary : colors.textSecondary }
                ]}>
                  {t('Running')}
                </Text>
              </TouchableOpacity>
              {isTechnician && (
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    { borderBottomColor: localFilter === 'direct_offers' ? colors.primary : 'transparent' }
                  ]}
                  onPress={() => handleFilterChange('direct_offers')}
                >
                  <Text style={[
                    styles.tabButtonText,
                    localFilter === 'direct_offers' && styles.tabButtonActive,
                    { color: localFilter === 'direct_offers' ? colors.primary : colors.textSecondary }
                  ]}>
                    {t('Direct Offers')}
                  </Text>
                </TouchableOpacity>
              )}
              {isTechnician && (
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    { borderBottomColor: localFilter === 'bid_received' ? colors.primary : 'transparent' }
                  ]}
                  onPress={() => handleFilterChange('bid_received')}
                >
                  <Text style={[
                    styles.tabButtonText,
                    localFilter === 'bid_received' && styles.tabButtonActive,
                    { color: localFilter === 'bid_received' ? colors.primary : colors.textSecondary }
                  ]}>
                    {t('My Bids')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { borderBottomColor: localFilter === 'completed' ? colors.primary : 'transparent' }
                ]}
                onPress={() => handleFilterChange('completed')}
              >
                <Text style={[
                  styles.tabButtonText,
                  localFilter === 'completed' && styles.tabButtonActive,
                  { color: localFilter === 'completed' ? colors.primary : colors.textSecondary }
                ]}>
                  {t('Completed')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* Category Filter */}
      <View style={[styles.categoryFilterWrapper, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
        <TouchableOpacity
          key="All"
          style={[
            styles.categoryButton,
            { 
              backgroundColor: selectedCategory === 'All' ? colors.primary : colors.border,
              borderWidth: 0,
            }
          ]}
          onPress={() => setSelectedCategory('All')}
        >
          <Text
            style={[
              styles.categoryButtonText,
              { 
                color: selectedCategory === 'All' ? '#FFFFFF' : colors.text,
                fontWeight: selectedCategory === 'All' ? 'bold' : 'normal',
              }
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.categoryButton,
              { 
                backgroundColor: selectedCategory === service.id.toString() ? colors.primary : colors.border,
                borderWidth: 0,
              }
            ]}
            onPress={() => setSelectedCategory(service.id.toString())}
          >
            <Text
              style={[
                styles.categoryButtonText,
                { 
                  color: selectedCategory === service.id.toString() ? '#FFFFFF' : colors.text,
                  fontWeight: selectedCategory === service.id.toString() ? 'bold' : 'normal',
                }
              ]}
              numberOfLines={1}
            >
              {i18n.language === 'ar' ? service.nameAr : service.nameEn}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No projects found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          renderItem={renderProjectCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          removeClippedSubviews={false}
          key={`flatlist-${screenWidth}`} // Force re-render on width change
          {...(Platform.OS === 'web' && {
            style: { width: '100%' },
          })}
        />
      )}

      {/* Project Detail Modal - Show different modal based on user role and project status */}
      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       selectedProject && 
       (selectedProject.status?.toUpperCase() === 'PENDING' || localFilter === 'available') ? (
        // TECHNICIAN: Show TechnicianBidsView for available/pending projects (bids and visit requests)
        <TechnicianBidsView
          visible={showProjectDetail}
          project={selectedProject}
          onClose={() => {
            setShowProjectDetail(false);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            // Reload projects after bid withdrawal or visit request
            loadProjects();
          }}
        />
      ) : (
        // USER/HOMEOWNER OR TECHNICIAN (for non-running projects): Show ProjectDetailModal
        // This includes phase planning, approval, contract signing, and payment
        <ProjectDetailModal
          visible={showProjectDetail && currentPage === 'list'}
          project={selectedProject}
          onClose={() => {
            setShowProjectDetail(false);
            setSelectedProject(null);
          }}
          onOpenChat={onOpenChat}
          onViewTechnician={handleViewTechnician}
          onBookAppointment={onBookAppointment}
          onSuccess={() => {
            // Reload projects after phase approval, contract signing, or any update
            loadProjects();
          }}
        />
      )}

      {/* Bid Form Modal - Only show for technicians */}
      {selectedProject && userRole?.toUpperCase() === 'TECHNICIAN' && (
        <BidFormModal
          visible={showBidForm}
          project={selectedProject}
          onClose={() => {
            setShowBidForm(false);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            setShowBidForm(false);
            loadProjects(); // Refresh projects after successful bid
          }}
        />
      )}

      {/* Visit Request Modal - Only show for technicians */}
      {selectedProject && userRole?.toUpperCase() === 'TECHNICIAN' && (
        <VisitRequestModal
          visible={showVisitRequest}
          project={selectedProject}
          onClose={() => {
            setShowVisitRequest(false);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            setShowVisitRequest(false);
            loadProjects(); // Refresh projects after successful visit request
          }}
        />
      )}
    </View>
      )}
    </>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryFilterWrapper: {
    width: '100%',
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        display: 'flex' as any,
      },
    }),
  },
  categoryScroll: {
    width: '100%',
    ...Platform.select({
      web: {
        overflowX: 'auto' as any,
        overflowY: 'hidden' as any,
        WebkitOverflowScrolling: 'touch' as any,
      },
    }),
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    height: 60,
    ...Platform.select({
      web: {
        display: 'flex' as any,
        flexDirection: 'row' as any,
        flexWrap: 'nowrap' as any,
        minWidth: 'max-content' as any,
      },
    }),
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    height: 36,
    justifyContent: 'center' as any,
    alignItems: 'center' as any,
    ...Platform.select({
      web: {
        flexShrink: 0 as any,
        whiteSpace: 'nowrap' as any,
        display: 'inline-flex' as any,
      },
    }),
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap' as any,
      },
    }),
  },
  listContent: {
    padding: CONTAINER_PADDING,
    ...(Platform.OS === 'web' && {
      maxWidth: '100%',
      boxSizing: 'border-box' as any,
    } as any),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
    gap: CARD_GAP,
  },
  projectCard: {
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    flex: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden', // Ensure content doesn't overflow
    ...(Platform.OS === 'web' && {
      boxSizing: 'border-box' as any,
    } as any),
  },
  projectCardLargeWeb: {
    ...(Platform.OS === 'web' && {
      flexBasis: '48%',
      maxWidth: 'calc(50% - 8px)',
    } as any),
  },
  projectCardFullWidth: {
    ...(Platform.OS === 'web'
      ? {
          width: '100%',
          maxWidth: '100%',
        }
      : {}),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 20,
    flexShrink: 1,
    overflow: 'hidden',
    width: '100%',
    ...(Platform.OS === 'web' && {
      wordBreak: 'break-word' as any,
      overflowWrap: 'break-word' as any,
    } as any),
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riyalLogo: {
    width: 16,
    height: 16,
  },
  budgetText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eyeIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    flexShrink: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    minWidth: 0, // Allow button to shrink
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
    ...(Platform.OS === 'web' && {
      whiteSpace: 'nowrap' as any,
      overflow: 'hidden' as any,
      textOverflow: 'ellipsis' as any,
    } as any),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  tabsContainer: {
    paddingHorizontal: 40,
    paddingTop: 20,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' as any,
      },
    }),
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 0,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: '100%',
        overflowX: 'auto' as any,
      },
    }),
  },
  tabButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 3,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        flexShrink: 0 as any,
        cursor: 'pointer' as any,
        userSelect: 'none' as any,
      },
    }),
  },
  tabButtonActive: {
    fontWeight: '700',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap' as any,
      },
    }),
  },
});

