import { useAuthStore } from '@/store/authStore';
import { Course, useCourseStore } from '@/store/courseStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';

function MyCoursesScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { courses, isLoading, fetchTeacherCourses, deleteCourse } = useCourseStore();
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is authenticated
  if (!user?.id) {
    return (
      <View style={styles.centerContainer}>
        <Text>Please log in to view your courses</Text>
      </View>
    );
  }

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchTeacherCourses(user.id).catch(error => {
          console.error('Error fetching teacher courses:', error);
        });
      }
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      try {
        await fetchTeacherCourses(user.id);
      } catch (error) {
        console.error('Error refreshing courses:', error);
        Alert.alert('Error', 'Failed to refresh courses');
      }
    }
    setRefreshing(false);
  };

  const handleDeleteCourse = (courseId: string, courseTitle: string) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${courseTitle}"?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteCourse(courseId);
              Alert.alert('Success', 'Course deleted successfully');
            } catch (error) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete course');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderCourseCard = (course: Course) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <View style={styles.cardColorBar} />
        
        <Card.Content style={styles.cardContent}>
          <View style={styles.courseHeader}>
            <View style={styles.courseIconContainer}>
              <MaterialCommunityIcons name="book-multiple" size={24} color="#1976d2" />
            </View>
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle} numberOfLines={2}>
                {course.title}
              </Text>
              <Text style={styles.teacherName} numberOfLines={1}>
                by {course.teacherName || user?.name || 'Unknown Teacher'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteCourse(course.id, course.title)}
              style={styles.deleteButton}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color="#f44336"
              />
            </TouchableOpacity>
          </View>

          {course.description && (
            <Text style={styles.courseDescription} numberOfLines={2}>
              {course.description}
            </Text>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#1976d2" />
              <Text style={styles.statText}>{course.duration || 'N/A'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="calendar-today" size={16} color="#ff9800" />
              <Text style={styles.statText}>
                {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
            >
              <MaterialCommunityIcons name="eye-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonTextWhite}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonTextWhite}>Edit</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (isLoading && courses.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.premiumHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>📚 My Courses</Text>
            <Text style={styles.subtitle}>Manage all your courses</Text>
          </View>
        </View>

        {courses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="book-plus"
              size={64}
              color="#ccc"
            />
            <Text style={styles.emptyStateText}>No courses created yet</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreateCourse')}
              style={styles.createButton}
            >
              Create Your First Course
            </Button>
          </View>
        ) : (
          <View style={styles.coursesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Courses ({courses.length})</Text>
            </View>
            <FlatList
              data={courses}
              renderItem={({ item }) => renderCourseCard(item)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  coursesSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  cardContent: {
    paddingTop: 16,
  },
  cardColorBar: {
    height: 4,
    backgroundColor: '#667eea',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  teacherName: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  courseDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  viewButton: {
    backgroundColor: '#1976d2',
  },
  editButton: {
    backgroundColor: '#ff9800',
  },
  actionButtonTextWhite: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    marginTop: 16,
  },
});

export default MyCoursesScreen;
