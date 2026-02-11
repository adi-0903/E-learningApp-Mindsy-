import { useAuthStore } from '@/store/authStore';
import { Course, useCourseStore } from '@/store/courseStore';
import { useLiveClassStore } from '@/store/liveClassStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import {
  Button,
  Card,
  Snackbar,
  Text,
  TextInput
} from 'react-native-paper';

export default function CreateLiveClassScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { courses, fetchTeacherCourses } = useCourseStore();
  const { createLiveClass, isLoading } = useLiveClassStore();

  // Check if user is authenticated
  if (!user?.id) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Please log in to create live classes</Text>
      </View>
    );
  }

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [scheduledStartTime, setScheduledStartTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseMenuVisible, setCourseMenuVisible] = useState(false);
  const courseButtonRef = useRef(null);

  useEffect(() => {
    loadTeacherCourses();
  }, [user?.id]);

  const loadTeacherCourses = async () => {
    if (user?.id) {
      try {
        await fetchTeacherCourses(user.id);
      } catch (error) {
        console.error('Error loading courses:', error);
        showSnackbar(error instanceof Error ? error.message : 'Failed to load courses');
      } finally {
        setCoursesLoading(false);
      }
    } else {
      setCoursesLoading(false);
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const generateRoomId = () => {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const newDate = new Date(scheduledStartTime);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setScheduledStartTime(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const newTime = new Date(scheduledStartTime);
      newTime.setHours(selectedTime.getHours());
      newTime.setMinutes(selectedTime.getMinutes());
      setScheduledStartTime(newTime);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      showSnackbar('Please enter a class title');
      return false;
    }
    if (!selectedCourse) {
      showSnackbar('Please select a course');
      return false;
    }
    if (scheduledStartTime <= new Date()) {
      showSnackbar('Scheduled time must be in the future');
      return false;
    }
    if (maxParticipants && (isNaN(parseInt(maxParticipants)) || parseInt(maxParticipants) <= 0)) {
      showSnackbar('Maximum participants must be a positive number');
      return false;
    }
    return true;
  };

  const handleCreateLiveClass = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      const roomId = generateRoomId();
      await createLiveClass({
        course: selectedCourse!.id,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_start_time: scheduledStartTime.toISOString(),
        max_participants: maxParticipants && !isNaN(parseInt(maxParticipants)) ? parseInt(maxParticipants) : undefined,
      });

      showSnackbar('Live class created successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error creating live class:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to create live class');
    }
  };

  if (coursesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.premiumHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>✨ Create Live Class</Text>
          <Text style={styles.subtitle}>Schedule a new live session for your students</Text>
        </View>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.premiumCard}>
          <Card.Content style={styles.cardContent}>

            {/* Title Input */}
            <TextInput
              label="Class Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Mathematics Lecture - Chapter 5"
            />

            {/* Description Input */}
            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Add details about this live class"
            />

            {/* Course Selection */}
            <Text style={styles.label}>Select Course</Text>
            {courses.length > 0 ? (
              <View ref={courseButtonRef}>
                <TouchableOpacity
                  onPress={() => setCourseMenuVisible(!courseMenuVisible)}
                  style={styles.dropdownButton}
                >
                  <Text style={styles.dropdownButtonLabel}>
                    {selectedCourse?.title || 'Select a course'}
                  </Text>
                  <MaterialCommunityIcons
                    name={courseMenuVisible ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color="#667eea"
                  />
                </TouchableOpacity>

                {courseMenuVisible && (
                  <View style={styles.dropdownContainer}>
                    {courses.map((course) => (
                      <Button
                        key={course.id}
                        mode="text"
                        onPress={() => {
                          setSelectedCourse(course);
                          setCourseMenuVisible(false);
                        }}
                        style={styles.dropdownItem}
                        contentStyle={styles.dropdownItemContent}
                        labelStyle={[
                          styles.dropdownItemLabel,
                          selectedCourse?.id === course.id && styles.dropdownItemLabelActive
                        ]}
                      >
                        {course.title}
                      </Button>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Card style={styles.noCourseCard}>
                <Card.Content>
                  <Text>No courses available. Create a course first.</Text>
                </Card.Content>
              </Card>
            )}

            {/* Date Picker */}
            <Text style={styles.label}>Scheduled Start Date</Text>
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
            >
              {scheduledStartTime.toLocaleDateString()}
            </Button>
            {showDatePicker && (
              <DateTimePicker
                value={scheduledStartTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}

            {/* Time Picker */}
            <Text style={styles.label}>Scheduled Start Time</Text>
            <Button
              mode="outlined"
              onPress={() => setShowTimePicker(true)}
              style={styles.dateButton}
            >
              {scheduledStartTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Button>
            {showTimePicker && (
              <DateTimePicker
                value={scheduledStartTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.button}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateLiveClass}
                loading={isLoading}
                disabled={isLoading || courses.length === 0}
                style={styles.button}
              >
                Create Class
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  premiumCard: {
    marginHorizontal: 6,
    marginVertical: 20,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    elevation: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  title: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 16,
    color: '#fff',
    letterSpacing: 0.5,
  },
  courseButton: {
    marginBottom: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(102, 126, 234, 0.4)',
  },
  courseButtonContent: {
    justifyContent: 'flex-start',
    height: 48,
    paddingHorizontal: 16,
  },
  courseButtonLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  dropdownButton: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(102, 126, 234, 0.4)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  dropdownButtonContent: {
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
  },
  dropdownButtonLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  dropdownContainer: {
    backgroundColor: '#252541',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(102, 126, 234, 0.4)',
    marginTop: -8,
    marginBottom: 14,
    overflow: 'visible',
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 1000,
    paddingTop: 2,
  },
  dropdownItem: {
    marginHorizontal: 0,
    marginVertical: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(102, 126, 234, 0.1)',
  },
  dropdownItemContent: {
    justifyContent: 'flex-start',
    height: 48,
    paddingHorizontal: 16,
  },
  dropdownItemLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '400',
    textAlign: 'left',
  },
  dropdownItemLabelActive: {
    fontWeight: '600',
    color: '#667eea',
  },
  noCourseCard: {
    marginBottom: 16,
    backgroundColor: '#fff3cd',
  },
  dateButton: {
    marginBottom: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(102, 126, 234, 0.4)',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 126, 234, 0.2)',
  },
  button: {
    flex: 1,
    borderRadius: 12,
  },
});
