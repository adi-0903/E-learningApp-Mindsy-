import { TeacherDashboard } from '@/components/TeacherDashboard';
import { useAuthStore } from '@/store/authStore';
import { useCourseStore } from '@/store/courseStore';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

function TeacherHomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { fetchTeacherCourses } = useCourseStore();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchTeacherCourses(user.id);
      }
    }, [user?.id])
  );

  return (
    <View style={styles.container}>
      <TeacherDashboard
        onCoursePress={(courseId) =>
          navigation.navigate('CourseDetail', { courseId })
        }
        onCreateCoursePress={() => navigation.navigate('CreateCourse')}
        onCreateAnnouncementPress={() => navigation.navigate('CreateAnnouncement')}
        onManageLiveClassesPress={() => navigation.navigate('ManageLiveClasses')}
        onMyCoursesPress={() => navigation.navigate('MyCourses')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TeacherHomeScreen;
