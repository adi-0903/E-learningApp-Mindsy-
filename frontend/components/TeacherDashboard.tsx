import { useAuthStore } from '@/store/authStore';
import { Course, useCourseStore } from '@/store/courseStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';

interface TeacherDashboardProps {
  onCoursePress: (courseId: string) => void;
  onCreateCoursePress: () => void;
  onCreateAnnouncementPress?: () => void;
  onManageLiveClassesPress?: () => void;
  onMyCoursesPress?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onCoursePress,
  onCreateCoursePress,
  onCreateAnnouncementPress,
  onManageLiveClassesPress,
  onMyCoursesPress,
}) => {
  const { user } = useAuthStore();
  const { courses, isLoading, fetchTeacherCourses, deleteCourse } = useCourseStore();
  const [refreshing, setRefreshing] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  // Check if user is authenticated
  if (!user?.id) {
    return (
      <View style={styles.centerContainer}>
        <Text>Please log in to view your dashboard</Text>
      </View>
    );
  }

  useEffect(() => {
    if (user?.id) {
      fetchTeacherCourses(user.id).catch(error => {
        console.error('Error fetching teacher courses:', error);
      });
      // Note: totalStudents calculation would need to be implemented with progress store
      // For now, we'll use a placeholder calculation
      setTotalStudents(0);
    }
  }, [user?.id]);

  const fetchTotalStudents = async () => {
    try {
      if (!user?.id) return;
      // Note: This would need to be implemented with progress store
      // For now, using a placeholder calculation
      setTotalStudents(0);
    } catch (error) {
      console.error('Error fetching total students:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      try {
        await fetchTeacherCourses(user.id);
        await fetchTotalStudents();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }
    setRefreshing(false);
  };

  const handleDeleteCourse = (courseId: string, courseTitle: string) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteCourse(courseId);
              if (user?.id) {
                await fetchTeacherCourses(user.id);
              }
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
      key={course.id}
      onPress={() => onCoursePress(course.id)}
      style={styles.courseCardContainer}
      activeOpacity={0.7}
    >
      <Card style={styles.courseCard}>
        <View style={styles.cardColorBar} />
        
        <Card.Content>
          <View style={styles.courseHeader}>
            <View style={styles.courseIconContainer}>
              <MaterialCommunityIcons name="book-multiple" size={24} color="#1976d2" />
            </View>
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle} numberOfLines={2}>
                {course.title || 'Untitled Course'}
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
              onPress={() => onCoursePress(course.id)}
            >
              <MaterialCommunityIcons name="eye-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonTextWhite}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => onCoursePress(course.id)}
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
            <Text style={styles.greeting}>👨‍🏫 Welcome, {user?.name || 'Teacher'}!</Text>
            <Text style={styles.subtitle}>Manage your courses and track student progress</Text>
          </View>
        </View>

        <View style={styles.statsSection}>
          <TouchableOpacity onPress={onMyCoursesPress} style={styles.statCard}>
            <View style={styles.statContent}>
              <MaterialCommunityIcons
                name="book-multiple"
                size={32}
                color="#1976d2"
              />
              <View style={styles.statInfo}>
                <Text style={styles.statNumber}>{courses.length}</Text>
                <Text style={styles.statLabel}>Courses</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <MaterialCommunityIcons
                name="account-multiple"
                size={32}
                color="#ff9800"
              />
              <View style={styles.statInfo}>
                <Text style={styles.statNumber}>{totalStudents}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={onManageLiveClassesPress}
            >
              <MaterialCommunityIcons name="video" size={28} color="#fff" />
              <Text style={styles.quickActionLabel}>Live Classes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={onCreateAnnouncementPress}
            >
              <MaterialCommunityIcons name="bell" size={28} color="#fff" />
              <Text style={styles.quickActionLabel}>Announcement</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={onCreateCoursePress}
            >
              <MaterialCommunityIcons name="plus" size={28} color="#fff" />
              <Text style={styles.quickActionLabel}>New Course</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

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

  },
  headerContent: {
    flex: 1,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  statCard: {
    width: '50%',
    elevation: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  statInfo: {
    alignItems: 'flex-start',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#4f0505ff',
    marginTop: 2,
    fontWeight: '700',
  },
  headerBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    backgroundColor: '#1976d2',
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
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
  coursesSection: {
    padding: 16,
    paddingBottom: 200,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  courseCardContainer: {
    marginBottom: 12,
  },
  courseCard: {
    elevation: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardColorBar: {
    height: 4,
    backgroundColor: '#1976d2',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  courseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  courseCategory: {
    fontSize: 12,
    color: '#999',
  },
  courseDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  courseFooter: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
  },
  chipText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  chip: {
    height: 28,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewButton: {
    backgroundColor: '#1976d2',
  },
  editButton: {
    backgroundColor: '#ff9800',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  actionButtonTextWhite: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    opacity: 0.85,
    color: '#fff',
  },
  fabAnnouncement: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 85,
    opacity: 0.85,
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  quickActionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default TeacherDashboard;
