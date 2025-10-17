import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ChatMessageProps {
  children: React.ReactNode;
  isUser?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ children, isUser = false }) => {
  if (isUser) {
    return (
      <View style={styles.userMessage}>
        <View style={styles.userMessageBubble}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chatbotMessage}>
      <View style={styles.chatbotAvatar}>
        <Text style={styles.chatbotEmoji}>🐻</Text>
      </View>
      <View style={styles.messageBubble}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chatbotMessage: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chatbotAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  chatbotEmoji: {
    fontSize: 20,
  },
  messageBubble: {
    width: '80%',
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userMessage: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  userMessageBubble: {
    backgroundColor: Colors.light.primary,
    padding: 12,
    borderRadius: 18,
    borderTopRightRadius: 4,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
});
