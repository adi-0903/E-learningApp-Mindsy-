import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';
import { Colors, Typography, AppShadows, BorderRadius, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateToSignup: () => void;
}

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigateToSignup,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const { login, isLoading } = useAuthStore();

  const studentBreathingAnim = useRef(new Animated.Value(1)).current;
  const teacherBreathingAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const checkBiometricSettings = async () => {
      const enabled = await AsyncStorage.getItem('biometric_enabled');
      if (enabled === 'true') {
        setIsBiometricEnabled(true);
        // Optionally auto-trigger on mount for better UX
        // handleBiometricLogin(); 
      }
    };
    checkBiometricSettings();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with Biometrics',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        const savedEmail = await AsyncStorage.getItem('last_user_email');
        const savedPass = await AsyncStorage.getItem('last_user_pass');
        const savedRole = (await AsyncStorage.getItem('last_user_role')) as 'teacher' | 'student';

        if (savedEmail && savedPass) {
          setEmail(savedEmail);
          setPassword(savedPass);
          setRole(savedRole || 'student');

          await login(savedEmail, savedPass, savedRole || 'student');
          onLoginSuccess();
        } else {
          Alert.alert('Setup Required', 'Please login with your password once to link biometrics.');
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
    }
  };

  useEffect(() => {
    const startBreathingAnimation = (animValue: Animated.Value) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1.05,
            duration: 950,
            useNativeDriver: false,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 950,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    const stopAnimation = (animValue: Animated.Value) => {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 0,
        useNativeDriver: false,
      }).start();
    };

    if (role === 'student') {
      startBreathingAnimation(studentBreathingAnim);
      stopAnimation(teacherBreathingAnim);
    } else {
      startBreathingAnimation(teacherBreathingAnim);
      stopAnimation(studentBreathingAnim);
    }
  }, [role]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Unified Identity Verification Protocol
    if (role === 'student' || role === 'teacher') {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        console.log(`Initiating Biometric Identity Handshake for ${role}...`);
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Security Verification Required',
          cancelLabel: 'Cancel Sign In',
          disableDeviceFallback: false,
        });

        if (!result.success) {
          console.log('Biometric handshake failed or aborted.');
          return; // Block login if biometric verification fails
        }
        console.log('Identity verified. Proceeding with cryptographic dispatch...');
      }
    }

    try {
      await login(email, password, role);
      // If login successful, save credentials if biometrics is intended to be used
      await AsyncStorage.setItem('last_user_email', email);
      await AsyncStorage.setItem('last_user_pass', password);
      await AsyncStorage.setItem('last_user_role', role);

      onLoginSuccess();
    } catch (error) {
      Alert.alert('Login Failed', (error as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          role === 'student'
            ? [Colors.light.primaryDark, Colors.light.primary, Colors.light.secondaryLight]
            : ['#1e1b4b', '#4338ca', '#818cf8'] // Deep Indigo gradient for Teacher
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Logo and Header */}
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/Logo.png')}
                style={styles.logoImage}
              />
              <Text style={styles.title}>EduBloom</Text>
              <Text style={styles.subtitle}>Where Mentorship Meets Intelligence</Text>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              {/* Role Selection */}
              <View style={styles.roleSection}>
                <Text style={styles.roleLabel}>Role: </Text>
                <View style={styles.roleButtons}>
                  <Animated.View style={{ flex: 1, transform: [{ scale: studentBreathingAnim }] }}>
                    <TouchableOpacity
                      style={[styles.roleButton, role === 'student' && styles.roleButtonActiveStudent]}
                      onPress={() => setRole('student')}
                      disabled={isLoading}
                    >
                      <MaterialCommunityIcons
                        name="account-school"
                        size={24}
                        color={role === 'student' ? Colors.light.primary : Colors.light.textLight}
                      />
                      <Text style={[styles.roleButtonText, role === 'student' && styles.roleButtonTextActiveStudent]}>
                        Student
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View style={{ flex: 1, transform: [{ scale: teacherBreathingAnim }] }}>
                    <TouchableOpacity
                      style={[styles.roleButton, role === 'teacher' && styles.roleButtonActiveTeacher]}
                      onPress={() => setRole('teacher')}
                      disabled={isLoading}
                    >
                      <MaterialCommunityIcons
                        name="account-tie"
                        size={24}
                        color={role === 'teacher' ? '#4338ca' : Colors.light.textLight}
                      />
                      <Text style={[styles.roleButtonText, role === 'teacher' && styles.roleButtonTextActiveTeacher]}>
                        Teacher
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color={Colors.light.textLight} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  mode="flat"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  textColor={Colors.light.text}
                  selectionColor={Colors.light.primary}
                  cursorColor={Colors.light.primary}
                  placeholderTextColor={Colors.light.textLight}
                  editable={!isLoading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.light.textLight} style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="flat"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  textColor={Colors.light.text}
                  selectionColor={Colors.light.primary}
                  cursorColor={Colors.light.primary}
                  placeholderTextColor={Colors.light.textLight}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                      color={Colors.light.textLight}
                    />
                  }
                  editable={!isLoading}
                />
              </View>

              {/* Login Actions */}
              <View style={styles.loginActions}>
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={role === 'student' ? [Colors.light.primary, Colors.light.primaryDark] : ['#4338ca', '#1e1b4b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.light.white} />
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>Sign In</Text>
                        <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.light.white} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {isBiometricEnabled && (
                  <TouchableOpacity
                    style={styles.biometricBtn}
                    onPress={handleBiometricLogin}
                    disabled={isLoading}
                  >
                    <MaterialCommunityIcons
                      name="fingerprint"
                      size={36}
                      color={role === 'student' ? Colors.light.primary : '#4338ca'}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Sign Up Link */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={onNavigateToSignup} disabled={isLoading}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Decoration */}
            <View style={styles.bottomDecoration}>
              <Text style={styles.decorationText}>Secure • Fast • Reliable</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.l,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoImage: {
    width: 160,
    height: 120,
    resizeMode: 'contain',
    marginBottom: Spacing.s,
    alignSelf: 'center',
  },
  title: {
    ...Typography.h1,
    fontSize: 42,
    color: Colors.light.white,
    marginBottom: Spacing.s,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.light.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.l,
    ...AppShadows.medium,
  },
  roleSection: {
    marginBottom: Spacing.l,
  },
  roleLabel: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.m,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: Spacing.m,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.m,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    gap: 8,
  },
  roleButtonActiveStudent: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  roleButtonActiveTeacher: {
    borderColor: '#4338ca',
    backgroundColor: '#eef2ff',
  },
  roleButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.light.textLight,
  },
  roleButtonTextActiveStudent: {
    color: Colors.light.primary,
  },
  roleButtonTextActiveTeacher: {
    color: '#4338ca',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.m,
    marginBottom: Spacing.m,
    paddingHorizontal: Spacing.s,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputIcon: {
    marginRight: Spacing.s,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
  },
  loginActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
  },
  loginButton: {
    flex: 1,
    marginTop: Spacing.s,
    borderRadius: BorderRadius.m,
    overflow: 'hidden',
    ...AppShadows.light,
  },
  biometricBtn: {
    marginTop: Spacing.s,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.m,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonText: {
    color: Colors.light.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.l,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
  },
  signupLink: {
    ...Typography.bodySmall,
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
  bottomDecoration: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  decorationText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
});
