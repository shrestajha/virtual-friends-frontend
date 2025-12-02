import React, { useState, useEffect, useRef } from 'react';
import { getMyConversation, getConversationMessages, sendMessage } from '../api';
import { Box, Paper, TextField, Button, Typography, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export default function ChatPage({ user, messageCountsPerCharacter = {}, onMessageSent, maxMessages = 15 }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const messagesEndRef = useRef(null);

  // Load conversation on mount
  useEffect(() => {
    loadConversation();
  }, []);

  // Note: Messages are now loaded in loadConversation to ensure proper initialization

  // Initialize message count when messages are loaded for a character
  // Note: Messages may contain messages from all characters, so we filter by character_id
  useEffect(() => {
    if (conversation?.character?.id && messages.length > 0 && onMessageSent) {
      const characterId = conversation.character.id;
      // Filter messages by character_id if available, otherwise assume all messages are for this character
      const characterMessages = messages.filter(m => 
        !m.character_id || m.character_id === characterId ||
        !m.character || m.character.id === characterId ||
        (!m.character_id && !m.character) // If no character_id field, assume it's for current character
      );
      const userMessageCount = characterMessages.filter(m => m.role === 'user').length;
      
      // Always sync the count with the actual number of user messages for this character
      // This ensures the count is accurate when switching characters or reloading
      if (messageCountsPerCharacter[characterId] !== userMessageCount) {
        console.log(`Syncing message count for character ${characterId}: ${userMessageCount} user messages (from ${messages.length} total messages)`);
        // Set the count directly (not increment) to match actual message count
        onMessageSent(characterId, userMessageCount);
      }
    }
  }, [conversation?.character?.id, messages.length]); // Run when character changes or messages are loaded

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async () => {
    try {
      setLoadingMessages(true);
      const conv = await getMyConversation();
      setConversation(conv);
      
      // Load messages immediately after conversation is loaded
      if (conv?.id) {
        await loadMessages(conv.id, conv);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setLoadingMessages(false);
    }
  };

  const loadMessages = async (conversationId, convData = null) => {
    try {
      setLoadingMessages(true);
      const msgs = await getConversationMessages(conversationId);
      const loadedMessages = Array.isArray(msgs) ? msgs : (msgs.messages || []);
      
      // Use convData if provided, otherwise use conversation state
      const currentConv = convData || conversation;
      const characterId = currentConv?.character?.id;
      
      // Filter messages by character_id if messages have that field
      // If not, assume all messages are for the current character
      const characterMessages = characterId 
        ? loadedMessages.filter(m => 
            m.character_id === characterId || 
            m.character?.id === characterId ||
            !m.character_id && !m.character // If no character_id, assume it's for current character
          )
        : loadedMessages;
      
      setMessages(characterMessages);
      
      // Count user messages for this character only
      if (characterId && onMessageSent) {
        const userMessageCount = characterMessages.filter(m => m.role === 'user').length;
        // Always sync the count with actual messages loaded
        // This ensures accurate per-character tracking
        console.log(`Initializing message count for character ${characterId}: ${userMessageCount} messages (filtered from ${loadedMessages.length} total messages)`);
        onMessageSent(characterId, userMessageCount);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversation || loading) return;

    const characterId = conversation.character?.id;
    const currentMessageCount = messageCountsPerCharacter[characterId] || 0;
    
    // Check if this character has reached the message limit
    if (characterId && currentMessageCount >= maxMessages) {
      return;
    }

    setInput('');
    const userMsg = { 
      role: 'user', 
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await sendMessage(conversation.id, text);
      const botMsg = { 
        role: 'assistant', 
        content: response.message || response.reply || response.content || response.text,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMsg]);
      
      // Notify parent that a message was sent for this character
      if (characterId && onMessageSent) {
        console.log(`Message sent for character ${characterId}, incrementing count`);
        onMessageSent(characterId);
      }
      
      // Optionally reload messages to get the latest from server (or use the response)
      // await loadMessages(conversation.id);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m !== userMsg));
      alert('Failed to send message: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loadingMessages && !conversation) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!conversation) {
    return (
      <Box p={3}>
        <Typography variant="h6" color="error">
          No conversation found. Please contact support.
        </Typography>
      </Box>
    );
  }

  const character = conversation.character || {};
  const characterId = character.id;
  const currentMessageCount = characterId ? (messageCountsPerCharacter[characterId] || 0) : 0;
  const hasReachedLimit = characterId && currentMessageCount >= maxMessages;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Chatting with {character.name || 'Your Character'}
          </Typography>
          {characterId && (
            <Typography variant="body2" color="text.secondary">
              Messages: {currentMessageCount}/{maxMessages}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Messages Container */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 2, 
          bgcolor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {messages.length === 0 && !loadingMessages && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            Start a conversation with {character.name || 'your character'}!
          </Typography>
        )}
        
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              mb: 1
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                maxWidth: '70%',
                bgcolor: msg.role === 'user' ? '#1976d2' : '#e0e0e0',
                color: msg.role === 'user' ? 'white' : 'black',
                borderRadius: 2
              }}
            >
              <Typography variant="body1">{msg.content}</Typography>
              {msg.created_at && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    mt: 0.5, 
                    opacity: 0.7,
                    fontSize: '0.7rem'
                  }}
                >
                  {new Date(msg.created_at).toLocaleTimeString()}
                </Typography>
              )}
            </Paper>
          </Box>
        ))}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                bgcolor: '#e0e0e0',
                borderRadius: 2
              }}
            >
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Thinking...
              </Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Bar */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={
              hasReachedLimit 
                ? "You have reached the message limit for this character" 
                : "Type your message... (Press Enter to send)"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || hasReachedLimit}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!input.trim() || loading || hasReachedLimit}
            startIcon={<SendIcon />}
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

