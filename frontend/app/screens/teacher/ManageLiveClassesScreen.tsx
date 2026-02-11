import { useAuthStore } from '@/store/authStore';
import { LiveClass, useLiveClassStore } from '@/store/liveClassStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  Portal,
  Snackbar,
  Text,
} from 'react-native-paper';

export default function ManageLiveClassesScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const {
    liveClasses,
    fetchTeacherLiveClasses,
    isLoading,
    startLiveClass,
    endLiveClass,
    updateLiveClass,
    deleteLiveClass,
  } = useLiveClassStore();

  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogAction, setDialogAction] = useState<'start' | 'end' | 'cancel' | 'delete' | null>(null);

  useEffect(() => {
    loadLiveClasses();
  }, []);

  const loadLiveClasses = async () => {
    if (user?.id) {
      try {
        await fetchTeacherLiveClasses(user.id);
      } catch (error) {
        console.error('Error loading live classes:', error);
        showSnackbar('Failed to load live classes');
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLiveClasses();
    setRefreshing(false);
  }, [user?.id]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleStartClass = async () => {
    if (!selectedClass) return;
    try {
      await startLiveClass(selectedClass.id);
      showSnackbar('Live class started!');
      await loadLiveClasses();
      setDialogVisible(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Error starting live class:', error);
      showSnackbar('Failed to start live class');
    }
  };

  const handleEndClass = async () => {
    if (!selectedClass) return;
    try {
      await endLiveClass(selectedClass.id);
      showSnackbar('Live class ended!');
      await loadLiveClasses();
      setDialogVisible(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Error ending live class:', error);
      showSnackbar('Failed to end live class');
    }
  };

  const handleCancelClass = async () => {
    if (!selectedClass) return;
    try {
      await updateLiveClass(selectedClass.id, { status: 'cancelled' });
      showSnackbar('Live class cancelled!');
      await loadLiveClasses();
      setDialogVisible(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Error cancelling live class:', error);
      showSnackbar('Failed to cancel live class');
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    try {
      await deleteLiveClass(selectedClass.id);
      showSnackbar('Live class deleted!');
      await loadLiveClasses();
      setDialogVisible(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Error deleting live class:', error);
      showSnackbar('Failed to delete live class');
    }
  };

  const showConfirmDialog = (action: 'start' | 'end' | 'cancel' | 'delete', liveClass: LiveClass) => {
    setSelectedClass(liveClass);
    setDialogAction(action);
    setDialogVisible(true);
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
            <View style={styles.statusContainer}>
              <Chip
                icon={getStatusIcon(item.status)}
                style={{ backgroundColor: getStatusColor(item.status), marginRight: 126 }}
                textStyle={{ color: '#fff' }}
              >
                {item.status.toUpperCase()}
              </Chip>
              <TouchableOpacity
                onPress={() => showConfirmDialog('delete', item)}
                style={styles.deleteIconContainer}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color="#F44336"
                />
              </TouchableOpacity>
            </View>
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

        <View style={styles.actionButtons}>
          {item.status === 'scheduled' && (
            <>
              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={() => showConfirmDialog('start', item)}
                  style={styles.actionButton}
                  icon="play"
                >
                  Start
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => showConfirmDialog('cancel', item)}
                  style={styles.actionButton}
                >
                  Cancel
                </Button>
              </View>
            </>
          )}
          {item.status === 'active' && (
            <>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('LiveClassRoom', { classId: item.id })}
                style={styles.actionButton}
                icon="play"
              >
                Join Room
              </Button>
              <Button
                mode="contained-tonal"
                onPress={() => showConfirmDialog('end', item)}
                style={styles.actionButton}
              >
                End Class
              </Button>
            </>
          )}
          {item.status === 'completed' && (
            <Button
              mode="text"
              onPress={() => showConfirmDialog('delete', item)}
              icon="trash-can-outline"
              textColor="#F44336"
            >
              {' '}
            </Button>
          )}
          {item.status === 'cancelled' && (
            <Button
              mode="text"
              onPress={() => showConfirmDialog('delete', item)}
              icon="trash-can-outline"
              textColor="#F44336"
            >
              {' '}
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const getDialogTitle = () => {
    switch (dialogAction) {
      case 'start':
        return 'Start Live Class?';
      case 'end':
        return 'End Live Class?';
      case 'cancel':
        return 'Cancel Live Class?';
      case 'delete':
        return 'Delete Live Class?';
      default:
        return 'Confirm Action';
    }
  };

  const getDialogMessage = () => {
    switch (dialogAction) {
      case 'start':
        return 'This will start the live class and students will be able to join.';
      case 'end':
        return 'This will end the live class and disconnect all participants.';
      case 'cancel':
        return 'This will cancel the scheduled live class.';
      case 'delete':
        return 'This action cannot be undone.';
      default:
        return 'Are you sure?';
    }
  };

  const handleDialogConfirm = async () => {
    switch (dialogAction) {
      case 'start':
        await handleStartClass();
        break;
      case 'end':
        await handleEndClass();
        break;
      case 'cancel':
        await handleCancelClass();
        break;
      case 'delete':
        await handleDeleteClass();
        break;
    }
  };

  if (isLoading && liveClasses.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.premiumHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>🎥 Live Classes</Text>
          <Text style={styles.subtitle}>Create and manage your live sessions</Text>
        </View>
      </View>
      <FlatList
        data={liveClasses}
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
                  <Text style={styles.featureText}>Real-time video streaming</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Interactive live sessions</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Student participation tracking</Text>
                </View>
              </View>
            </View>
          </View>
        }
      />
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{getDialogTitle()}</Dialog.Title>
          <Dialog.Content>
            <Text>{getDialogMessage()}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleDialogConfirm}
              textColor={dialogAction === 'delete' ? '#F44336' : '#2196F3'}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
    shadowColor: '#000',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  classTitle: {
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 18,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIconContainer: {
    padding: 4,
    borderRadius: 4,
  },
  description: {
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
    fontSize: 13,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
  },
  deleteButton: {
    paddingHorizontal: 12,
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
    color: '#484343d5',
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 28,
    textAlign: 'center',
    color: '#7a1212ff',
  },
  createButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 50,
  },
});
