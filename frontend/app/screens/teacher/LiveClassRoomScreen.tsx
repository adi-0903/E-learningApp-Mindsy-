import { useLiveClassStore } from '@/store/liveClassStore';
import { useLiveClassChatStore } from '@/store/liveClassChatStore';
import { useAuthStore } from '@/store/authStore';
import { getJitsiMeetUrl } from '@/constants/JitsiConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  Card,
  Chip,
  IconButton,
  Text,
} from 'react-native-paper';
import { WebView } from 'react-native-webview';

export default function LiveClassRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const classId = params.id;

  const { user } = useAuthStore();
  const { currentLiveClass, startLiveClass, endLiveClass } = useLiveClassStore();
  const { messages, fetchChatMessages, sendChatMessage } = useLiveClassChatStore();

  const [isLoading, setIsLoading] = useState(true);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!classId) return;
    initClass();
  }, [classId]);

  const initClass = async () => {
    try {
      setIsLoading(true);
      const result = await startLiveClass(classId!);
      const url = result.meetingUrl || getJitsiMeetUrl(result.channelName || result.roomId || `class_${classId}`);
      setMeetingUrl(url);
      await fetchChatMessages(classId!);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start live class');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndClass = useCallback(() => {
    Alert.alert('End Class', 'Are you sure you want to end this live class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Class',
        style: 'destructive',
        onPress: async () => {
          try {
            await endLiveClass(classId!);
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to end class');
          }
        },
      },
    ]);
  }, [classId]);

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !user) return;
    try {
      await sendChatMessage(classId!, String(user.id), user.name, chatMessage.trim());
      setChatMessage('');
      chatListRef.current?.scrollToEnd({ animated: true });
    } catch {
      // Handled in store
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Starting live class...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={currentLiveClass?.title || 'Live Class'}
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action icon="chat" onPress={() => setShowChat(!showChat)} />
        <Appbar.Action icon="stop-circle" color="#f44336" onPress={handleEndClass} />
      </Appbar.Header>

      {/* Live indicator */}
      <View style={styles.liveBar}>
        <Chip icon="circle" style={styles.liveChip} textStyle={styles.liveChipText}>
          LIVE
        </Chip>
        <Text style={styles.liveLabel}>You are the host</Text>
      </View>

      {/* Jitsi WebView */}
      <View style={styles.videoContainer}>
        {meetingUrl ? (
          <WebView
            source={{ uri: meetingUrl }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
          />
        ) : (
          <View style={styles.noVideo}>
            <Text>Unable to load video room</Text>
          </View>
        )}
      </View>

      {/* Chat panel */}
      {showChat && (
        <KeyboardAvoidingView
          style={styles.chatPanel}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Card style={styles.chatCard}>
            <Card.Title title="Chat" right={() => (
              <IconButton icon="close" onPress={() => setShowChat(false)} />
            )} />
            <Card.Content style={styles.chatContent}>
              <FlatList
                ref={chatListRef}
                data={messages}
                keyExtractor={(item) => String(item.id)}
                style={styles.chatList}
                renderItem={({ item }) => (
                  <View style={[
                    styles.chatBubble,
                    item.isSystemMessage && styles.systemBubble,
                  ]}>
                    {!item.isSystemMessage && (
                      <Text style={styles.chatSender}>{item.senderName}</Text>
                    )}
                    <Text style={item.isSystemMessage ? styles.systemText : undefined}>
                      {item.message}
                    </Text>
                  </View>
                )}
              />
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  onSubmitEditing={handleSendChat}
                />
                <IconButton icon="send" onPress={handleSendChat} />
              </View>
            </Card.Content>
          </Card>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  loadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
  header: { backgroundColor: '#1a1a2e', elevation: 0 },
  headerTitle: { color: '#fff', fontSize: 16 },
  liveBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#1a1a2e' },
  liveChip: { backgroundColor: '#f44336' },
  liveChipText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  liveLabel: { color: '#aaa', marginLeft: 12, fontSize: 13 },
  videoContainer: { flex: 1 },
  webview: { flex: 1 },
  noVideo: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' },
  chatPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%' },
  chatCard: { flex: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  chatContent: { flex: 1 },
  chatList: { flex: 1, maxHeight: 200 },
  chatBubble: { backgroundColor: '#f0f0f0', borderRadius: 12, padding: 10, marginVertical: 3 },
  systemBubble: { backgroundColor: '#e8eaf6', alignSelf: 'center' },
  chatSender: { fontWeight: 'bold', fontSize: 12, marginBottom: 2, color: '#333' },
  systemText: { fontStyle: 'italic', color: '#666', textAlign: 'center', fontSize: 12 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: '#eee' },
  chatInput: { flex: 1, height: 40, paddingHorizontal: 12, fontSize: 14 },
});
