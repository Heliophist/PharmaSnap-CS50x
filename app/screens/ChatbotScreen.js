import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import { sendMedChat } from '../services/aiClient';
import { useTranslation } from 'react-i18next';

const ChatbotScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  // Initialize with welcome message when component mounts
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        text: t('chatbot.welcome_message'),
        ts: new Date().toISOString(),
      },
    ]);
  }, [t]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim(),
      ts: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await sendMedChat([...messages, userMessage]);
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response,
        ts: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: t('chatbot.error_message'),
        ts: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        {isUser ? (
          <Text style={[styles.messageText, styles.userText]}>
            {item.text}
          </Text>
        ) : (
          <Markdown style={markdownStyles}>
            {item.text}
          </Markdown>
        )}
        <Text style={styles.timestamp}>
          {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isLoading) return null;
    
    return (
      <View style={[styles.messageContainer, styles.assistantMessage]}>
        <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>{t('chatbot.typing_indicator')}</Text>
          <View style={styles.typingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>{t('pharmasnap')}</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          style={styles.messagesList}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          ListFooterComponent={renderTypingIndicator}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        />

        {/* Input Row */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
                placeholder={t('chatbot.placeholder')}
            placeholderTextColor="#999999"
            multiline
            maxLength={500}
            editable={!isLoading}
            accessibilityLabel={t('chatbot.accessibility.message_input')}
            accessibilityHint={t('chatbot.accessibility.message_input_hint')}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            accessibilityLabel={t('chatbot.accessibility.send_message')}
            accessibilityHint={t('chatbot.accessibility.send_message_hint')}
          >
            <Icon 
              name="send" 
              size={24} 
              color={(!inputText.trim() || isLoading) ? "#CCCCCC" : "#FFFFFF"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <View style={styles.navigationBar}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('Welcome')}
          accessibilityLabel={t('chatbot.accessibility.home')}
        >
          <Icon name="home" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('PharmaSnap')}
          accessibilityLabel={t('chatbot.accessibility.camera')}
        >
          <Icon name="camera-alt" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('MyMedicine')}
          accessibilityLabel={t('chatbot.accessibility.my_medicine')}
        >
          <Icon name="star" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('Reminders')}
          accessibilityLabel={t('chatbot.accessibility.reminders')}
        >
          <Icon name="schedule" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Icon name="chat" size={32} color="#316CEB" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('Info')}
          accessibilityLabel={t('chatbot.accessibility.info')}
        >
          <Icon name="info" size={32} color="#000000" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  titleBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#316CEB',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingBottom: 120, // Add extra padding to account for input area
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#316CEB',
    marginLeft: '15%',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    marginRight: '15%',
  },
  messageText: {
    fontSize: 18,
    lineHeight: 24,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    textAlign: 'right',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666666',
    marginHorizontal: 1,
  },
  dot1: {
    animationDelay: '0s',
  },
  dot2: {
    animationDelay: '0.2s',
  },
  dot3: {
    animationDelay: '0.4s',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100, // Add padding to account for navigation bar
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#316CEB',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  navigationBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  navButton: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
});

// Markdown styles for assistant messages
const markdownStyles = {
  body: {
    fontSize: 18,
    lineHeight: 24,
    color: '#000000',
  },
  strong: {
    fontWeight: 'bold',
    color: '#D32F2F', // Red color for warnings
  },
  paragraph: {
    marginBottom: 8,
  },
  list_item: {
    marginBottom: 4,
  },
};

export default ChatbotScreen;