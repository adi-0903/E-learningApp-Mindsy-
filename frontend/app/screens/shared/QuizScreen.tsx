import { useAuthStore } from '@/store/authStore';
import { Quiz, useQuizStore } from '@/store/quizStore';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Card, RadioButton, Text } from 'react-native-paper';

function QuizScreen({ route, navigation }: any) {
  const { quizId, courseId } = route?.params || {};
  const { user } = useAuthStore();
  const { getQuizById, fetchQuizQuestions, quizQuestions, submitQuizAttempt } = useQuizStore();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    if (!quizId) {
      Alert.alert('Error', 'Invalid quiz ID');
      setIsLoading(false);
      return;
    }

    try {
      const quizData = await getQuizById(quizId);
      setQuiz(quizData);
      await fetchQuizQuestions(quizId);
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!user?.id || !quiz) {
      Alert.alert('Error', 'Missing user or quiz information');
      return;
    }

    Alert.alert(
      'Submit Quiz',
      'Are you sure you want to submit? You cannot change your answers after submission.',
      [
        { text: 'Cancel', onPress: () => { }, style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              // Submit all answers to the API at once
              await submitQuizAttempt(quizId, answers);

              // Calculate score locally for display
              let correctCount = 0;
              for (const question of quizQuestions) {
                const studentAnswer = question.id ? (answers[question.id] || '') : '';
                if (studentAnswer === question.correctAnswer) correctCount++;
              }

              const score = quizQuestions.length > 0
                ? (correctCount / quizQuestions.length) * 100
                : 0;

              navigation.navigate('QuizResult', {
                quizId,
                courseId,
                score,
                correctAnswers: correctCount,
                totalQuestions: quizQuestions.length,
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to submit quiz');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!quiz || quizQuestions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>Quiz not found</Text>
      </View>
    );
  }

  // Ensure currentQuestionIndex is within bounds
  if (currentQuestionIndex >= quizQuestions.length) {
    setCurrentQuestionIndex(0);
    return null;
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];
  let options: string[] = [];
  try {
    options = currentQuestion.options ? JSON.parse(currentQuestion.options) : [];
  } catch (error) {
    console.error('Error parsing question options:', error);
    options = [];
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{quiz.title}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {quizQuestions.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <Card style={styles.questionCard}>
          <Card.Content>
            <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

            {currentQuestion.questionType === 'multiple_choice' && (
              <View style={styles.optionsContainer}>
                {options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionItem}
                    onPress={() => currentQuestion.id && handleAnswerChange(currentQuestion.id, option)}
                  >
                    <RadioButton
                      value={option}
                      status={
                        currentQuestion.id && answers[currentQuestion.id] === option ? 'checked' : 'unchecked'
                      }
                      onPress={() => currentQuestion.id && handleAnswerChange(currentQuestion.id, option)}
                    />
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {currentQuestion.questionType === 'true_false' && (
              <View style={styles.optionsContainer}>
                {['True', 'False'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.optionItem}
                    onPress={() => currentQuestion.id && handleAnswerChange(currentQuestion.id, option)}
                  >
                    <RadioButton
                      value={option}
                      status={
                        currentQuestion.id && answers[currentQuestion.id] === option ? 'checked' : 'unchecked'
                      }
                      onPress={() => currentQuestion.id && handleAnswerChange(currentQuestion.id, option)}
                    />
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.navigationButtons}>
          <Button
            mode="outlined"
            onPress={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            style={styles.navButton}
          >
            Previous
          </Button>

          {currentQuestionIndex === quizQuestions.length - 1 ? (
            <Button
              mode="contained"
              onPress={handleSubmitQuiz}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.navButton}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              style={styles.navButton}
            >
              Next
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: '#1976d2',
    padding: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976d2',
  },
  questionCard: {
    marginBottom: 20,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  navButton: {
    flex: 1,
  },
});

export default QuizScreen;
