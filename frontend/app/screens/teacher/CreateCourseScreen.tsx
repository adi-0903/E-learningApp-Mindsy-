import { useAuthStore } from '@/store/authStore';
import { useCourseStore } from '@/store/courseStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

function CreateCourseScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { createCourse, fetchTeacherCourses } = useCourseStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateCourse = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter a course title');
      return;
    }

    if (!user?.id) return;

    setIsLoading(true);
    try {
      await createCourse({
        title,
        description,
        duration,
        is_published: isPublished,
      });

      await fetchTeacherCourses(user.id);
      Alert.alert('Success', 'Course created successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create course');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>Create Course</Text>
          <Text style={styles.headerSubtitle}>Add a new course to your collection</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>

        <View style={styles.content}>
          <TextInput
            label="Course Title *"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
            textColor="#333"
            editable={!isLoading}
          />

          <TextInput
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
            textColor="#333"
            editable={!isLoading}
          />

          <TextInput
            label="Duration"
            value={duration}
            onChangeText={setDuration}
            mode="outlined"
            style={styles.input}
            textColor="#333"
            editable={!isLoading}
          />

          {/* Publish Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Publish Course</Text>
              <Text style={styles.toggleDescription}>
                {isPublished ? 'Course will be visible to students immediately' : 'Course will be saved as draft'}
              </Text>
            </View>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              disabled={isLoading}
              trackColor={{ false: '#767577', true: '#667eea' }}
              thumbColor={isPublished ? '#fff' : '#f4f3f4'}
            />
          </View>

          <Button
            mode="contained"
            onPress={handleCreateCourse}
            loading={isLoading}
            disabled={isLoading}
            style={styles.createButton}
          >
            {isPublished ? 'Create & Publish Course' : 'Create Course (Draft)'}
          </Button>
        </View>
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
  headerBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  createButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666',
  },
});

export default CreateCourseScreen;
