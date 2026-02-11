import { Lesson, useCourseStore } from '@/store/courseStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';

// Video Player Component
function VideoPlayerView({ source, style }: { source: { uri: string }; style: any }) {
  const player = useVideoPlayer(source, player => {
    player.play();
  });

  return (
    <VideoView
      style={style}
      player={player}
      allowsPictureInPicture
      nativeControls={true}
    />
  );
}

// Using existing Lesson interface from courseStore

export default function StudentVideoLecturesScreen({ route, navigation }: any) {
  const { courseId, courseTitle } = route?.params || {};
  
  // Validate route parameters
  if (!courseId) {
    return (
      <View style={styles.centerContainer}>
        <Text>Invalid course ID</Text>
      </View>
    );
  }
  
  const { lessons, isLoading, fetchLessons } = useCourseStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);

  useEffect(() => {
    if (courseId) {
      loadLessons();
    }
  }, [courseId]);

  const loadLessons = async () => {
    if (!courseId) {
      Alert.alert('Error', 'Invalid course ID');
      return;
    }
    
    try {
      await fetchLessons(courseId.toString());
    } catch (error) {
      console.error('Error loading lessons:', error);
      Alert.alert('Error', 'Failed to load video lectures');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLessons();
    setRefreshing(false);
  };

  const handlePlayVideo = (lesson: Lesson) => {
    if (!lesson.videoUrl) {
      Alert.alert('Error', 'No video available for this lesson');
      return;
    }
    setSelectedLesson(lesson);
    setVideoModalVisible(true);
  };

  const handleCloseVideo = () => {
    setVideoModalVisible(false);
    setSelectedLesson(null);
  };

  // Download functionality removed for simplicity

  const renderLessonCard = (lesson: Lesson) => (
    <Card style={styles.videoCard} key={lesson.id}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.videoHeader}>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {lesson.title}
            </Text>
            
            {lesson.description && (
              <Text style={styles.videoDescription} numberOfLines={2}>
                {lesson.description}
              </Text>
            )}
            
            <View style={styles.videoMeta}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#ccc" />
                <Text style={styles.metaText}>{lesson.duration ? `${lesson.duration} min` : 'No duration'}</Text>
              </View>
              {lesson.videoUrl && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="video" size={16} color="#ccc" />
                  <Text style={styles.metaText}>Video Available</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handlePlayVideo(lesson)}
              style={styles.playButton}
              disabled={!lesson.videoUrl}
            >
              <MaterialCommunityIcons 
                name={lesson.videoUrl ? "play-circle" : "play-circle-outline"} 
                size={40} 
                color={lesson.videoUrl ? "#667eea" : "#ccc"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Video Lectures</Text>
          <Text style={styles.headerSubtitle}>{courseTitle}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="video" size={20} color="#667eea" />
          <Text style={styles.statText}>{lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#667eea" />
          <Text style={styles.statText}>
            {lessons.reduce((total: number, lesson: Lesson) => total + (lesson.duration || 0), 0)} min total
          </Text>
        </View>
      </View>

      {lessons.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="video-off" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No video lectures available</Text>
          <Text style={styles.emptySubtext}>Check back later for new videos</Text>
        </View>
      ) : (
        <FlatList
          data={lessons}
          renderItem={({ item }) => renderLessonCard(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.videosList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
      
      {/* Video Player Modal */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseVideo}
      >
        <StatusBar style="light" />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseVideo} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedLesson?.title || 'Video Player'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          {selectedLesson && (
            <View style={styles.videoContainer}>
              {selectedLesson.videoUrl ? (
                <VideoPlayerView
                  source={{ uri: selectedLesson.videoUrl }}
                  style={styles.videoPlayer}
                />
              ) : (
                <View style={styles.noVideoContainer}>
                  <MaterialCommunityIcons name="video-off" size={64} color="#ccc" />
                  <Text style={styles.noVideoText}>No video available for this lesson</Text>
                </View>
              )}
              
              <View style={styles.videoInfoContainer}>
                <Text style={styles.videoInfoTitle}>{selectedLesson.title}</Text>
                {selectedLesson.description && (
                  <Text style={styles.videoInfoDescription}>{selectedLesson.description}</Text>
                )}
                <Text style={styles.videoInfoMeta}>
                  Duration: {selectedLesson.duration ? `${selectedLesson.duration} min` : 'Not specified'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Removed unused Dimensions and thumbnailWidth variables

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  videosList: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 100,
  },
  videoCard: {
    marginBottom: 16,
    backgroundColor: '#2c3e50',
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#9e4242ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#34495e',
  },
  cardContent: {
    padding: 20,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  videoInfo: {
    flex: 1,
    marginRight: 12,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    lineHeight: 26,
  },
  videoDescription: {
    fontSize: 15,
    color: '#bdc3c7',
    marginBottom: 14,
    lineHeight: 22,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#34495e',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#95a5a6',
    fontWeight: '600',
  },
  playButton: {
    padding: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 30,
  },
  actionButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  // Removed unused downloadButton style
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 16,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
  },
  videoPlayer: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
  },
  videoInfoContainer: {
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  videoInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  videoInfoDescription: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 12,
    lineHeight: 22,
  },
  videoInfoMeta: {
    fontSize: 14,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  noVideoText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 16,
    textAlign: 'center',
  },
});

