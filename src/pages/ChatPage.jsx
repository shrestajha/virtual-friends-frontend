import React, { useState, useEffect, useRef } from 'react';
import { getCharacters, getChatHistory, sendChatMessage, getSurveyStatus } from '../api';
import { Box, Paper, TextField, Button, Typography, CircularProgress, Tabs, Tab } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export default function ChatPage({ user, onNavigateToSurvey }) {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [interactionCounts, setInteractionCounts] = useState({}); // { characterId: count }
  const messagesEndRef = useRef(null);

  // Check survey status on mount and when counts change
  // Only check if all 3 characters have reached 15
  useEffect(() => {
    // Only check survey status if we have exactly 3 characters and all have reached 15
    const allReached = characters.length === 3 && characters.every(char => {
      const count = interactionCounts[char.id] || 0;
      return count >= 15;
    });
    
    if (allReached) {
      checkSurveyStatus();
    }
  }, [interactionCounts, characters.length]);

  // Load characters on mount
  useEffect(() => {
    loadCharacters();
  }, []);

  // Load chat history when character is selected or user changes
  useEffect(() => {
    if (selectedCharacterId && user?.id) {
      loadChatHistory(user.id);
    }
  }, [selectedCharacterId, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkSurveyStatus = async () => {
    try {
      // First verify locally that all 3 characters have reached 15
      const allReached = characters.length === 3 && characters.every(char => {
        const count = interactionCounts[char.id] || 0;
        return count >= 15;
      });
      
      if (!allReached) {
        console.log('Not all characters have reached 15 yet. Current counts:', interactionCounts);
        return;
      }
      
      console.log('All 3 characters have reached 15. Checking survey status...');
      const status = await getSurveyStatus();
      if (status.showSurvey === true) {
        // All characters have reached 15 interactions - redirect to survey
        console.log('Survey is available. Redirecting...');
        if (onNavigateToSurvey) {
          onNavigateToSurvey();
        }
      } else {
        console.log('Survey not yet available from backend:', status);
      }
    } catch (error) {
      console.error('Failed to check survey status:', error);
    }
  };

  const loadCharacters = async () => {
    try {
      setLoadingCharacters(true);
      const chars = await getCharacters();
      const charactersArray = Array.isArray(chars) ? chars : (chars.characters || []);
      setCharacters(charactersArray);
      
      // Extract interaction counts from characters
      const counts = {};
      charactersArray.forEach(char => {
        if (char.id && typeof char.interaction_count === 'number') {
          counts[char.id] = char.interaction_count;
        }
      });
      setInteractionCounts(counts);
      
      // Select first character if available
      if (charactersArray.length > 0 && !selectedCharacterId) {
        setSelectedCharacterId(charactersArray[0].id);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoadingCharacters(false);
    }
  };

  const loadChatHistory = async (userId) => {
    try {
      setLoadingMessages(true);
      const response = await getChatHistory(userId);
      
      // Handle different response formats
      let chatMessages = Array.isArray(response) 
        ? response 
        : (response.messages || response.chat || []);
      
      // Filter messages by selected character if messages have character_id
      if (selectedCharacterId) {
        chatMessages = chatMessages.filter(msg => 
          msg.character_id === selectedCharacterId || 
          msg.character?.id === selectedCharacterId ||
          (!msg.character_id && !msg.character) // If no character_id, include all
        );
      }
      
      // Sort messages in chronological order by created_at
      chatMessages.sort((a, b) => {
        const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
        const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
        return timeA - timeB;
      });
      
      setMessages(chatMessages);
      
      // Update interaction counts if returned per character
      if (response.interaction_counts && typeof response.interaction_counts === 'object') {
        setInteractionCounts(prev => ({
          ...prev,
          ...response.interaction_counts
        }));
      } else if (response.characters && Array.isArray(response.characters)) {
        // If characters array is returned with interaction_count
        const counts = {};
        response.characters.forEach(char => {
          if (char.id && typeof char.interaction_count === 'number') {
            counts[char.id] = char.interaction_count;
          }
        });
        setInteractionCounts(prev => ({
          ...prev,
          ...counts
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedCharacterId || loading || !user?.id) return;

    const currentCount = interactionCounts[selectedCharacterId] || 0;
    if (currentCount >= 15) {
      return; // Already at limit
    }

    setInput('');
    setLoading(true);

    try {
      // Send message to /message endpoint
      const response = await sendChatMessage(selectedCharacterId, text);
      
      // After sending, reload history to get updated messages in chronological order
      await loadChatHistory(user.id);
      
      // Update interaction count if returned in response
      if (response.interaction_count !== undefined) {
        const updatedCount = response.interaction_count;
        setInteractionCounts(prev => ({
          ...prev,
          [selectedCharacterId]: updatedCount
        }));

        // Check if this character reached 15
        if (updatedCount >= 15) {
          // Check if ALL characters have reached 15 (not just this one)
          // Create updated counts object for checking
          const updatedCounts = {
            ...interactionCounts,
            [selectedCharacterId]: updatedCount
          };
          
          // Check if all 3 characters have reached 15
          const allReached = characters.length === 3 && characters.every(char => {
            const charCount = updatedCounts[char.id] || 0;
            return charCount >= 15;
          });
          
          console.log('Character interaction counts:', updatedCounts);
          console.log('All characters reached 15?', allReached);
          
          if (allReached) {
            // All 3 characters have reached 15 - show survey
            setTimeout(() => {
              if (onNavigateToSurvey) {
                onNavigateToSurvey();
              }
            }, 1000);
          }
        }
      } else if (response.interaction_counts && typeof response.interaction_counts === 'object') {
        // If backend returns all interaction counts
        setInteractionCounts(prev => ({
          ...prev,
          ...response.interaction_counts
        }));
        
        // Check if all reached 15
        const allReached = characters.length === 3 && characters.every(char => {
          const charCount = response.interaction_counts[char.id] || 0;
          return charCount >= 15;
        });
        
        if (allReached) {
          setTimeout(() => {
            if (onNavigateToSurvey) {
              onNavigateToSurvey();
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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

  const handleTabChange = (event, newValue) => {
    const character = characters.find(c => c.id === newValue);
    if (character) {
      setSelectedCharacterId(character.id);
    }
  };

  if (loadingCharacters) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (characters.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="h6" color="error">
          No characters assigned. Please contact support.
        </Typography>
      </Box>
    );
  }

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
  const currentCount = selectedCharacterId ? (interactionCounts[selectedCharacterId] || 0) : 0;
  const hasReachedLimit = currentCount >= 15;
  
  // Check if ALL 3 characters have reached 15 (for survey unlock)
  const allCompleted = characters.length === 3 && characters.every(char => {
    const count = interactionCounts[char.id] || 0;
    return count >= 15;
  });
  
  console.log('Current interaction counts per character:', interactionCounts);
  console.log('Selected character count:', currentCount, '/15');
  console.log('All 3 characters completed?', allCompleted);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Character Tabs */}
      <Paper elevation={2} sx={{ borderRadius: 0 }}>
        <Tabs
          value={selectedCharacterId || false}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {characters.map((char) => {
            const count = interactionCounts[char.id] || 0;
            const isCompleted = count >= 15;
            return (
              <Tab
                key={char.id}
                value={char.id}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: selectedCharacterId === char.id ? 600 : 400 }}>
                      {char.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: isCompleted ? '#16a34a' : 'text.secondary',
                        fontSize: '0.7rem'
                      }}
                    >
                      {count}/15
                    </Typography>
                  </Box>
                }
                sx={{
                  textTransform: 'none',
                  minHeight: 72,
                  opacity: isCompleted ? 0.7 : 1
                }}
              />
            );
          })}
        </Tabs>
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
        {loadingMessages && messages.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            Start a conversation with {selectedCharacter?.name || 'your character'}!
          </Typography>
        ) : (
          messages.map((msg, idx) => (
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
          ))
        )}
        
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

      {/* Completion Message */}
      {hasReachedLimit && !allCompleted && (
        <Paper elevation={1} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 0 }}>
          <Typography variant="body2" align="center" color="text.secondary">
            Completed – Survey available once all characters reach 15
          </Typography>
        </Paper>
      )}

      {/* Input Bar */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={
              hasReachedLimit 
                ? "You have reached the interaction limit for this character" 
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
