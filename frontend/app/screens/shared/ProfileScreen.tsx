import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/authStore';
import { Course, useCourseStore } from '@/store/courseStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Enrollment, useProgressStore } from '@/store/progressStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Modal, Portal, Text, TextInput } from 'react-native-paper';

function ProfileScreen({ navigation }: any) {
  const { user, logout, updateProfile, requestPhoneOTP, verifyPhoneOTP, isLoading } = useAuthStore();
  const { unreadCount, loadSettings, resetUnreadCount } = useNotificationStore();
  const { courses, fetchEnrolledCourses } = useCourseStore();
  const { enrollments, fetchStudentEnrollments } = useProgressStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Update state when user changes
  useEffect(() => {
    setName(user?.name || '');
    setBio(user?.bio || '');
    setPhone(user?.phoneNumber || '');
    setProfileImage(user?.profileImage || '');
  }, [user?.name, user?.bio, user?.phoneNumber, user?.profileImage]);

  useEffect(() => {
    if (user?.id) {
      loadSettings(user.id).catch(console.error);
      fetchEnrolledCourses().catch(console.error);
      fetchStudentEnrollments().catch(console.error);
    }
  }, [user?.id]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      const selectedUri = result.assets[0].uri;
      setUploadingImage(true);
      try {
        await updateProfile(name, bio, phone, selectedUri);
        setProfileImage(selectedUri);
        Alert.alert('Success', 'Avatar updated successfully!');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to sync avatar');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'User not logged in');
      return;
    }
    try {
      console.log('Saving profile...', { name, bio, phone });
      await updateProfile(name, bio, phone);
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Profile update error:', error);
      const message = error.message || 'Failed to update profile. Please try again.';
      Alert.alert('Error', message);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => { }, style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
          Alert.alert('Logged Out', 'You have been successfully logged out.');
        },
        style: 'destructive',
      },
    ]);
  };



  const handleRequestOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    setOtpLoading(true);
    try {
      const result = await requestPhoneOTP(phone);
      if (result.success) {
        setOtpModalVisible(true);
        // DEVELOPMENT ONLY: Show OTP in alert so user doesn't have to check console
        if (result.data?.otp) {
          setTimeout(() => {
            Alert.alert('Development OTP', `Your code is: ${result.data.otp}\n\n(This is shown for testing purposes)`);
          }, 500);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit OTP');
      return;
    }
    setOtpLoading(true);
    try {
      // In Expo Go, we use our backend simulation
      const result = await verifyPhoneOTP(otp);
      if (result.success) {
        setOtpModalVisible(false);
        setOtp('');
        Alert.alert('Success', 'Phone number verified successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed');
    } finally {
      setOtpLoading(false);
    }
  };


  // Show loading state while user is being loaded
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#06201f', '#064e3b', '#065f46']}
          style={styles.premiumHeader}
        >
          <View style={styles.profileHeaderContent}>
            <Text style={styles.userName}>Loading...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }


  const headerColors = user.role === 'student'
    ? ['#06201f', '#064e3b', '#065f46'] as readonly [string, string, ...string[]]
    : ['#0f172a', '#1e1b4b', '#312e81'] as readonly [string, string, ...string[]];

  const accentColor = user.role === 'student' ? '#10b981' : '#4f46e5';
  const darkerAccent = user.role === 'student' ? '#065f46' : '#4338ca';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Premium Dynamic Header */}
      <LinearGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumHeader}
      >
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />

        <View style={styles.profileHeaderContent}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            <View style={styles.avatarHalo} />
            <View style={styles.avatarInner}>
              {uploadingImage ? (
                <ActivityIndicator color={accentColor} size="small" />
              ) : profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarLargeText, { color: accentColor }]}>
                  {user?.name?.charAt(0) || 'S'}
                </Text>
              )}
            </View>
            <View style={[styles.imageEditBadge, { backgroundColor: accentColor }]}>
              <MaterialCommunityIcons name="camera" size={12} color="#fff" />
            </View>
            <View style={[styles.onlineIndicator, { backgroundColor: '#10b981' }]} />
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <TouchableOpacity
            style={styles.editBadge}
            onPress={() => setIsEditing(!isEditing)}
          >
            <MaterialCommunityIcons
              name={isEditing ? "close" : "pencil"}
              size={14}
              color={accentColor}
            />
            <Text style={styles.editBadgeText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.contentBody}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{courses.length}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {enrollments.filter((e: Enrollment) => e.completionPercentage >= 100).length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {courses.length > 0 ? Math.round(enrollments.reduce((acc: number, curr: Enrollment) => acc + curr.completionPercentage, 0) / courses.length) : 0}%
            </Text>
            <Text style={styles.statLabel}>Avg %</Text>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionHeader}>About Me</Text>
          <View style={styles.bioContainer}>
            {isEditing ? (
              <View style={styles.editForm}>
                <View style={styles.editFieldWrapper}>
                  <View style={styles.fieldHeader}>
                    <MaterialCommunityIcons name="account-outline" size={18} color="#6366f1" />
                    <Text style={styles.fieldLabelText}>Full Name</Text>
                  </View>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={styles.fieldInput}
                    activeOutlineColor="#6366f1"
                    outlineColor="#e2e8f0"
                    textColor="#1e293b"
                    selectionColor="#6366f1"
                    cursorColor="#6366f1"
                    placeholder="Enter your name"
                  />
                </View>

                <View style={styles.editFieldWrapper}>
                  <View style={styles.fieldHeader}>
                    <MaterialCommunityIcons name="phone-outline" size={18} color="#6366f1" />
                    <Text style={styles.fieldLabelText}>Phone Number</Text>
                  </View>
                  <View style={styles.phoneInputContainer}>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      mode="outlined"
                      keyboardType="phone-pad"
                      style={styles.fieldInputPhone}
                      activeOutlineColor="#6366f1"
                      outlineColor="#e2e8f0"
                      textColor="#1e293b"
                      selectionColor="#6366f1"
                      cursorColor="#6366f1"
                      placeholder="Add your phone"
                    />
                    {phone !== user?.phoneNumber && phone.trim().length >= 10 ? (
                      <TouchableOpacity
                        onPress={handleRequestOTP}
                        style={[styles.inlineVerifyAction, { backgroundColor: accentColor }]}
                      >
                        <MaterialCommunityIcons name="send" size={14} color="#fff" />
                        <Text style={styles.inlineVerifyActionText}>Verify</Text>
                      </TouchableOpacity>
                    ) : user?.isPhoneVerified && phone === user.phoneNumber ? (
                      <View style={[styles.inlineVerifyAction, { backgroundColor: '#dcfce7' }]}>
                        <MaterialCommunityIcons name="check-decagram" size={14} color="#16a34a" />
                        <Text style={[styles.inlineVerifyActionText, { color: '#16a34a' }]}>Verified</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.editFieldWrapper}>
                  <View style={styles.fieldHeader}>
                    <MaterialCommunityIcons name="text-account" size={18} color={accentColor} />
                    <Text style={styles.fieldLabelText}>About Me / Bio</Text>
                  </View>
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us your story..."
                    multiline
                    mode="outlined"
                    style={styles.bioField}
                    activeOutlineColor={accentColor}
                    outlineColor="#e2e8f0"
                    textColor="#1e293b"
                    selectionColor={accentColor}
                    cursorColor={accentColor}
                  />
                </View>

                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={isLoading}
                  disabled={isLoading}
                  style={[styles.premiumSaveBtn, { backgroundColor: accentColor }]}
                  contentStyle={styles.premiumSaveBtnContent}
                  labelStyle={styles.premiumSaveBtnLabel}
                >
                  Confirm & Save Changes
                </Button>
              </View>
            ) : (
              <>
                <Text style={styles.bioText}>
                  {user?.bio || "No description set yet. Click edit to add your story!"}
                </Text>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <MaterialCommunityIcons name="email-outline" size={18} color={accentColor} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Primary Account (Login)</Text>
                    <View style={styles.phoneValueRow}>
                      <Text style={styles.infoValue}>{user?.email}</Text>
                      {user?.isEmailVerified && (
                        <View style={[styles.verifyStatus, { backgroundColor: '#f0fdf4' }]}>
                          <MaterialCommunityIcons name="check-decagram" size={12} color="#16a34a" />
                          <Text style={[styles.verifyText, { color: "#16a34a" }]}>Verified</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.infoIconWrapper}>
                    <MaterialCommunityIcons name="phone-outline" size={18} color={accentColor} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone Number</Text>
                    <View style={styles.phoneValueRow}>
                      <Text style={styles.infoValue}>{user?.phoneNumber || 'Not added yet'}</Text>
                      {user?.phoneNumber && (
                        <View style={[styles.verifyStatus, { backgroundColor: user.isPhoneVerified ? '#f0fdf4' : '#fef2f2' }]}>
                          <MaterialCommunityIcons
                            name={user.isPhoneVerified ? "check-decagram" : "alert-circle-outline"}
                            size={12}
                            color={user.isPhoneVerified ? "#16a34a" : "#ef4444"}
                          />
                          <Text style={[styles.verifyText, { color: user.isPhoneVerified ? "#16a34a" : "#ef4444" }]}>
                            {user.isPhoneVerified ? 'Verified' : 'Unverified'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {!user?.isPhoneVerified && user?.phoneNumber && (
                    <TouchableOpacity onPress={handleRequestOTP} style={styles.verifyAction}>
                      <Text style={[styles.verifyActionText, { color: accentColor }]}>Verify</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionHeader}>Account Settings</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => navigation.navigate('NotificationSettings')}
            >
              <View style={[styles.settingIcon, { backgroundColor: user.role === 'student' ? '#f0fdfa' : '#eef2ff' }]}>
                <MaterialCommunityIcons name="bell-outline" size={20} color={accentColor} />
              </View>
              <Text style={styles.settingLabel}>Notifications</Text>
              {unreadCount > 0 && <View style={styles.miniBadge} />}
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.cardDivider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => navigation.navigate('Security')}
            >
              <View style={[styles.settingIcon, { backgroundColor: '#f0fdf4' }]}>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color="#16a34a" />
              </View>
              <Text style={styles.settingLabel}>Security</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.cardDivider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('About')}>
              <View style={[styles.settingIcon, { backgroundColor: '#fff7ed' }]}>
                <MaterialCommunityIcons name="information-outline" size={20} color="#ea580c" />
              </View>
              <Text style={styles.settingLabel}>App Info</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutAction}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>EduBloom • Version 1.2.0</Text>
          <Text style={styles.footerSub}>Proudly Made In INDIA 🇮🇳</Text>
        </View>
      </View>

      {/* OTP Verification Modal */}
      <Portal>
        <Modal
          visible={otpModalVisible}
          onDismiss={() => setOtpModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.otpHeader}>
            <View style={styles.otpIconCircle}>
              <MaterialCommunityIcons name="shield-lock-outline" size={32} color="#6366f1" />
            </View>
            <Text style={styles.otpTitle}>Verify Phone</Text>
            <Text style={styles.otpSubtitle}>Enter the 4-digit code sent to {phone}</Text>
          </View>

          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="0 0 0 0"
            keyboardType="number-pad"
            maxLength={4}
            style={styles.otpInput}
            mode="outlined"
            outlineColor="#e2e8f0"
            activeOutlineColor="#6366f1"
            selectionColor="#6366f1"
            cursorColor="#6366f1"
          />

          <Button
            mode="contained"
            onPress={handleVerifyOTP}
            loading={otpLoading}
            disabled={otpLoading || otp.length !== 4}
            style={styles.verifyBtn}
            contentStyle={{ height: 50 }}
          >
            Verify OTP
          </Button>

          <TouchableOpacity
            onPress={() => setOtpModalVisible(false)}
            style={styles.closeModalBtn}
          >
            <Text style={styles.closeModalText}>Cancel</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  premiumHeader: {
    paddingTop: 60,
    paddingBottom: 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  headerDecoration1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: -60,
    right: -60,
  },
  headerDecoration2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -40,
    left: -30,
  },
  profileHeaderContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  avatarWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  avatarHalo: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  avatarLargeText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#6366f1',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imageEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 20,
    backgroundColor: '#6366f1',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    borderWidth: 4,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4f46e5',
    textTransform: 'uppercase',
  },
  contentBody: {
    flex: 1,
    marginTop: -30,
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingVertical: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
  },
  sectionWrapper: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bioText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 20,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bioContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  editForm: {
    paddingTop: 8,
  },
  editFieldWrapper: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  fieldLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: '#fff',
    fontSize: 15,
    borderRadius: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldInputPhone: {
    backgroundColor: '#fff',
    fontSize: 15,
    borderRadius: 12,
    flex: 1,
  },
  inlineVerifyAction: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 12,
    gap: 4,
    marginTop: -8, // Compensate for TextInput label/margin
  },
  inlineVerifyActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  verifyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifyText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bioField: {
    backgroundColor: '#fff',
    minHeight: 120,
    fontSize: 15,
    borderRadius: 12,
  },
  premiumSaveBtn: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    elevation: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumSaveBtnContent: {
    height: 56,
  },
  premiumSaveBtnLabel: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  verifyAction: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifyActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 24,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  otpIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  otpInput: {
    width: '100%',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#fff',
    marginBottom: 24,
    letterSpacing: 4,
  },
  verifyBtn: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#6366f1',
  },
  closeModalBtn: {
    marginTop: 16,
  },
  closeModalText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  phoneValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  miniBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  saveAction: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    marginBottom: 16,
  },
  logoutAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fee2e2',
    borderRadius: 20,
    height: 54,
    gap: 10,
    marginBottom: 32,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94a3b8',
  },
  footerSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
});

export default ProfileScreen;
