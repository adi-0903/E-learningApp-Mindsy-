import { useAuthStore } from '@/store/authStore';
import { useCourseStore } from '@/store/courseStore';
import { LiveClass, useLiveClassStore } from '@/store/liveClassStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Snackbar,
  Text
} from 'react-native-paper';

export default function BrowseLiveClassesScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { fetchActiveLiveClasses, fetchAllLiveClasses, activeClasses, liveClasses, isLoading } = useLiveClassStore();
  const { fetchEnrolledCourses, courses } = useCourseStore();

  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'scheduled'>('active');
  const [filteredClasses, setFilteredClasses] = useState<LiveClass[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterClasses();
  }, [activeTab, activeClasses, liveClasses]);

  const loadData = async () => {
    if (user?.id) {
      try {
        await Promise.all([
          fetchActiveLiveClasses(),
          fetchAllLiveClasses(),
          fetchEnrolledCourses(user.id),
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        showSnackbar('Failed to load live classes');
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user?.id]);

  const filterClasses = () => {
    let data = activeTab === 'active' ? activeClasses : liveClasses;

    // Filter by scheduled status if not active tab
    if (activeTab === 'scheduled') {
      data = data.filter((c) => c.status === 'scheduled');
    }

    // Show all live classes (not filtering by enrolled courses)
    // Students can join any live class regardless of course enrollment
    setFilteredClasses(data);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleJoinClass = (liveClass: LiveClass) => {
    if (liveClass.status !== 'active') {
      showSnackbar('This class is not currently active');
      return;
    }

    Alert.alert(
      'Join Live Class',
      `Join "${liveClass.title}" by ${liveClass.teacherName}?`,
      [
        { text: 'Cancel', onPress: () => { } },
        {
          text: 'Join',
          onPress: () => {
            navigation.navigate('StudentLiveClassRoom', { classId: liveClass.id });
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'scheduled':
        return '#2196F3';
      case 'completed':
        return '#9E9E9E';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'play-circle';
      case 'scheduled':
        return 'calendar-clock';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderLiveClassCard = ({ item }: { item: LiveClass }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text variant="titleMedium" style={styles.classTitle}>
              {item.title}
            </Text>
            <Text variant="bodySmall" style={styles.teacherName}>
              by {item.teacherName}
            </Text>
            <Chip
              icon={getStatusIcon(item.status)}
              style={{ backgroundColor: getStatusColor(item.status), marginTop: 8 }}
              textStyle={{ color: '#fff' }}
            >
              {item.status.toUpperCase()}
            </Chip>
          </View>
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={32}
            color={getStatusColor(item.status)}
          />
        </View>

        {item.description && (
          <Text variant="bodySmall" style={styles.description}>
            {item.description}
          </Text>
        )}

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color="#666" />
            <Text style={styles.detailText}>
              {format(new Date(item.scheduledStartTime || new Date()), 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock" size={16} color="#666" />
            <Text style={styles.detailText}>
              {format(new Date(item.scheduledStartTime || new Date()), 'HH:mm')}
            </Text>
          </View>
          {item.participantCount !== undefined && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account-multiple" size={16} color="#666" />
              <Text style={styles.detailText}>
                {item.participantCount} participant{item.participantCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionContainer}>
          {item.status === 'active' ? (
            <Button
              mode="contained"
              onPress={() => handleJoinClass(item)}
              style={styles.joinButton}
              icon="video"
            >
              Join Now
            </Button>
          ) : item.status === 'scheduled' ? (
            <View style={styles.scheduledInfo}>
              <MaterialCommunityIcons name="information" size={20} color="#2196F3" />
              <Text style={styles.scheduledText}>
                Starts {format(new Date(item.scheduledStartTime || new Date()), 'MMM dd, HH:mm')}
              </Text>
            </View>
          ) : (
            <Button mode="outlined" disabled>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.premiumHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>🎥 Live Classes</Text>
          <Text style={styles.subtitle}>Join live sessions with your teachers</Text>
        </View>
      </View>

      {/* <View style={styles.tabContainer}>
        <Button
          mode={activeTab === 'active' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('active')}
          style={styles.tabButton}
        >
          Live Now
        </Button>
        <Button
          mode={activeTab === 'scheduled' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('scheduled')}
          style={styles.tabButton}
        >
          Scheduled
        </Button>
      </View> */}

      {isLoading && filteredClasses.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredClasses}
          renderItem={renderLiveClassCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.comingSoonCard}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={64}
                  color="#667eea"
                />
                <Text variant="headlineMedium" style={styles.comingSoonTitle}>
                  Coming Soon
                </Text>
                <Text variant="bodyMedium" style={styles.comingSoonSubtitle}>
                  Live class streaming feature is being prepared for you
                </Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>Join live classes with teachers</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>Real-time interaction</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>Learn from anywhere</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>Access recorded live lectures</Text>
                  </View>
                </View>
              </View>
            </View>
          }
        />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  premiumHeader: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    gap: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    margin: 0,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 20,
    paddingTop: 28,
    gap: 8,
    backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1,
  },
  tabs: {
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  classTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teacherName: {
    color: '#666',
    marginBottom: 8,
  },
  description: {
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  detailsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    color: '#666',
  },
  actionContainer: {
    marginTop: 12,
  },
  joinButton: {
    borderRadius: 8,
  },
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  scheduledText: {
    marginLeft: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  comingSoonCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  comingSoonTitle: {
    marginTop: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    marginTop: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  featureList: {
    marginTop: 24,
    width: '100%',
    gap: 16,
    paddingHorizontal: 0,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 0,
    width: '100%',
  },
  featureText: {
    fontSize: 13,
    color: '#746d6dd5',
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    color: '#999',
  },
});
