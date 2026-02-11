import { Lesson, useCourseStore } from '@/store/courseStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, FAB, Text, TextInput } from 'react-native-paper';

// Using existing Lesson interface from courseStore

export default function ManageVideoLecturesScreen({ route, navigation }: any) {
  const { courseId } = route?.params || {};
  
  // Validate route parameters
  if (!courseId) {
    return (
      <View style={styles.centerContainer}>
        <Text>Invalid course ID</Text>
      </View>
    );
  }
  
  const { lessons, isLoading, fetchLessons, deleteLesson } = useCourseStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoFile: null as any,
    duration: '',
  });

  useEffect(() => {
    if (courseId) {
      fetchLessons(courseId).catch(error => {
        console.error('Error fetching lessons:', error);
        Alert.alert('Error', 'Failed to load video lectures');
      });
    }
  }, [courseId]);

  // Removed loadVideos function - now using course store

  const pickVideoFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*', 'image/*', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Check if the selected file is a video
        const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v'];
        const fileName = file.name.toLowerCase();
        const isVideo = videoExtensions.some(ext => fileName.endsWith(ext)) || 
                       file.mimeType?.startsWith('video/');
        
        if (!isVideo) {
          Alert.alert('Invalid File', 'Please select a video file (MP4, AVI, MOV, etc.)');
          return;
        }
        
        setFormData({ ...formData, videoFile: file });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video file');
    }
  };

  const handleAddVideo = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    try {
      // Note: Video file upload would need to be implemented with Firebase Storage
      // For now, we'll create a lesson entry with the video file info
      const videoUrl = formData.videoFile?.uri || '';
      
      // This would need to be implemented based on the course store's createLesson method
      // For now, showing the structure
      Alert.alert('Info', 'Video upload functionality needs to be implemented with Firebase Storage');
      
      setFormData({ title: '', description: '', videoFile: null, duration: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding video:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add video lecture');
    }
  };

  const handleDeleteVideo = async (lessonId: string) => {
    Alert.alert('Delete Video', 'Are you sure you want to delete this video?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteLesson(lessonId);
            await fetchLessons(courseId);
            Alert.alert('Success', 'Video deleted successfully');
          } catch (error) {
            console.error('Error deleting video:', error);
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete video');
          }
        },
      },
    ]);
  };

  const renderVideoItem = (lesson: Lesson) => (
    <View key={lesson.id} style={styles.videoCard}>
      <View style={styles.videoContent}>
        <View style={styles.videoHeader}>
          <View style={styles.videoHeaderLeft}>
            <View style={styles.videoIconContainer}>
              <MaterialCommunityIcons name="video" size={20} color="#667eea" />
            </View>
            <View style={styles.videoTitleContainer}>
              <Text style={styles.videoTitle} numberOfLines={2}>{lesson.title}</Text>
              <Text style={styles.videoDuration}>{lesson.duration || 'N/A'} min</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteVideo(lesson.id)}
            style={styles.deleteButton}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
        
        {lesson.description && (
          <Text style={styles.videoDescription} numberOfLines={2}>
            {lesson.description}
          </Text>
        )}
        
        <View style={styles.videoMetaContainer}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="calendar" size={14} color="#999" />
            <Text style={styles.metaText}>
              {lesson.createdAt ? new Date(lesson.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="folder" size={14} color="#999" />
            <Text style={styles.metaText}>Video Lecture</Text>
          </View>
        </View>
      </View>
    </View>
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
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumHeader}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Manage Video Lectures</Text>
          <Text style={styles.headerSubtitle}>Upload and manage lecture videos</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={lessons}
        renderItem={({ item }) => renderVideoItem(item)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="video-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No video lectures yet</Text>
          </View>
        }
      />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeaderGradient}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalHeaderIcon}>
                  <MaterialCommunityIcons name="video-plus" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Add Video Lecture</Text>
                  <Text style={styles.modalSubtitle}>Upload a new lecture video</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setShowForm(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabel}>
                    <MaterialCommunityIcons name="text" size={16} color="#667eea" />
                    <Text style={styles.inputLabelText}>Video Title</Text>
                  </View>
                  <TextInput
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                    style={styles.input}
                    mode="outlined"
                    placeholder="Enter video title"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputLabel}>
                    <MaterialCommunityIcons name="text-box" size={16} color="#667eea" />
                    <Text style={styles.inputLabelText}>Description</Text>
                  </View>
                  <TextInput
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    style={[styles.input, styles.textArea]}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    placeholder="Describe the video content"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputLabel}>
                    <MaterialCommunityIcons name="file-video" size={16} color="#667eea" />
                    <Text style={styles.inputLabelText}>Video File</Text>
                  </View>
                  <TouchableOpacity
                    onPress={pickVideoFile}
                    style={styles.filePickerCard}
                  >
                    <View style={styles.filePickerContent}>
                      <View style={styles.filePickerIcon}>
                        <MaterialCommunityIcons 
                          name={formData.videoFile ? "check-circle" : "cloud-upload"} 
                          size={32} 
                          color={formData.videoFile ? "#4caf50" : "#667eea"} 
                        />
                      </View>
                      <View style={styles.filePickerText}>
                        <Text style={styles.filePickerTitle}>
                          {formData.videoFile ? formData.videoFile.name : 'Choose Video File'}
                        </Text>
                        <Text style={styles.filePickerSubtitle}>
                          {formData.videoFile ? 'File selected' : 'Tap to select from device'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons 
                        name="chevron-right" 
                        size={20} 
                        color="#999" 
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputLabel}>
                    <MaterialCommunityIcons name="clock" size={16} color="#667eea" />
                    <Text style={styles.inputLabelText}>Duration (minutes)</Text>
                  </View>
                  <TextInput
                    value={formData.duration}
                    onChangeText={(text) => setFormData({ ...formData, duration: text })}
                    style={styles.input}
                    mode="outlined"
                    placeholder="e.g., 15"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowForm(false);
                  setFormData({ title: '', description: '', videoFile: null, duration: '' });
                }}
                style={styles.cancelButton}
                contentStyle={styles.buttonContent}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAddVideo}
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
                disabled={!formData.title.trim() || !formData.videoFile}
              >
                <MaterialCommunityIcons name="upload" size={18} color="#fff" />
                <Text style={styles.submitButtonText}> Upload Video</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <FAB
        icon="plus"
        label="Add Video"
        onPress={() => setShowForm(true)}
        style={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumHeader: {
    paddingTop: 50,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
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
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  listContent: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  videoContent: {
    padding: 16,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  videoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  videoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  videoTitleContainer: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 22,
  },
  videoDuration: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  videoMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalHeaderGradient: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  formSection: {
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
  },
  filePickerCard: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filePickerIcon: {
    marginRight: 16,
  },
  filePickerText: {
    flex: 1,
  },
  filePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  filePickerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#667eea',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
