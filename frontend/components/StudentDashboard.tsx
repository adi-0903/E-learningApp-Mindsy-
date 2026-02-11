import { useAuthStore } from '@/store/authStore';
import { Course, useCourseStore } from '@/store/courseStore';
import { useProgressStore } from '@/store/progressStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Card, ProgressBar, Text } from 'react-native-paper';

interface StudentDashboardProps {
  onCoursePress: (courseId: string) => void;
  onBrowseCoursesPress: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onCoursePress,
  onBrowseCoursesPress,
}) => {
  const { user } = useAuthStore();
  const { courses, isLoading, fetchEnrolledCourses } = useCourseStore();
  const { enrollments } = useProgressStore();
  const [refreshing, setRefreshing] = useState(false);

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
      fetchEnrolledCourses(user.id).catch(error => {
        console.error('Error fetching enrolled courses:', error);
      });
    }
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      try {
        await fetchEnrolledCourses(user.id);
      } catch (error) {
        console.error('Error refreshing courses:', error);
      }
    }
    setRefreshing(false);
  };

  const getProgressPercentage = (courseId: string) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    return enrollment?.completionPercentage || 0;
  };

  const renderCourseCard = (course: Course) => {
    const progress = getProgressPercentage(course.id);
    const isCompleted = progress >= 100;

    return (
      <TouchableOpacity
        key={course.id}
        onPress={() => onCoursePress(course.id)}
        style={styles.courseCardContainer}
      >
        <Card style={styles.courseCard}>
          <Card.Content>
            <View style={styles.courseHeader}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle} numberOfLines={2}>
                  {course.title || 'Untitled Course'}
                </Text>
                <Text style={styles.courseCategory}>{course.category || 'General'}</Text>
                {course.teacherName && (
                  <Text style={styles.teacherName}>by {course.teacherName}</Text>
                )}
              </View>
              <View style={styles.courseHeaderRight}>
                {course.createdAt && (
                  <Text style={styles.courseDate}>
                    {new Date(course.createdAt).toLocaleDateString()}
                  </Text>
                )}
                {isCompleted && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color="#4caf50"
                  />
                )}
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
              </View>
              <ProgressBar
                progress={progress / 100}
                style={styles.progressBar}
                color={isCompleted ? '#4caf50' : '#1976d2'}
              />
            </View>

            <View style={styles.courseFooter}>
              {course.duration && <Text style={styles.chipText}>⏱ {course.duration}</Text>}
              {course.level && <Text style={styles.chipText}>📊 {course.level}</Text>}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading && courses.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.premiumHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>👨‍🎓 Welcome, {user?.name || 'Student'}!</Text>
          <Text style={styles.subtitle}>Continue your learning journey</Text>
        </View>
      </View>

      {/* Stats Section - Always visible at top */}
      <View style={styles.statsSection}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="book-multiple"
              size={32}
              color="#1976d2"
            />
            <View style={styles.statInfo}>
              <Text style={styles.statNumber}>{courses.length}</Text>
              <Text style={styles.statLabel}>Courses Enrolled</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="check-circle"
              size={32}
              color="#4caf50"
            />
            <View style={styles.statInfo}>
              <Text style={styles.statNumber}>
                {courses.filter(c => getProgressPercentage(c.id) >= 100).length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Courses Section */}
      {courses.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="book-open-variant"
            size={64}
            color="#ccc"
          />
          <Text style={styles.emptyStateText}>No courses enrolled yet</Text>
        </View>
      ) : (
        <View style={styles.coursesSection}>
          <Text style={styles.sectionTitle}>My Courses</Text>
          <FlatList
            data={courses}
            renderItem={({ item }) => renderCourseCard(item)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Browse Courses Button - At bottom */}
      <View style={styles.browseSection}>
        <Button
          mode="contained"
          onPress={onBrowseCoursesPress}
          style={styles.browseButton}
        >
          Browse More Courses
        </Button>
      </View>
    </ScrollView>
  );
};

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
  premiumHeader: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerBadge: {
    fontSize: 20,
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
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    marginTop: 16,
  },
  coursesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  browseSection: {
    padding: 16,
    paddingBottom: 24,
  },
  courseCardContainer: {
    marginBottom: 12,
  },
  courseCard: {
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
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
    
  },
  courseCategory: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
    marginBottom: 2,
  },
  teacherName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  courseDate: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
    textAlign: 'right',
  },
  progressSection: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  courseFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  chipText: {
    fontSize: 12,
    color: '#667eea',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  statsSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    elevation: 2,
    backgroundColor: '#fff',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default StudentDashboard;