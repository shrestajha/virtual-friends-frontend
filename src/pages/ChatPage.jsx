import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getParticipant, getAssignedCharacters, getCurrentTopic, sendChat, me, getCharacterSurveyStatus } from '../api';
import { Box, Paper, TextField, Button, Typography, CircularProgress, Tabs, Tab, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CharacterInteractionSurvey from '../components/CharacterInteractionSurvey';
import TopicDisplay from '../components/TopicDisplay';

export default function ChatPage({ user }) {
  // State Management
  const [participant, setParticipant] = useState(null); // Stores chat history and interaction counts
  const [assignedAgent, setAssignedAgent] = useState(null); // Assigned agent from /auth/me (one agent per user)
  const [assignedAgentId, setAssignedAgentId] = useState(null); // Character ID of assigned agent
  const [interactionCount, setInteractionCount] = useState(0); // Interaction count from /auth/me (message_count)
  const [currentCharacterId, setCurrentCharacterId] = useState(null); // For backward compatibility
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingParticipant, setLoadingParticipant] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Character Interaction Survey state
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyCharacterId, setSurveyCharacterId] = useState(null);
  const [surveyCharacterName, setSurveyCharacterName] = useState('');
  const [completedSurveys, setCompletedSurveys] = useState(new Set()); // Track completed survey character IDs
  const [surveyAvailable, setSurveyAvailable] = useState(false); // Survey availability from status endpoint
  
  // Topic state
  const [currentTopic, setCurrentTopic] = useState(null);
  const [topicInfo, setTopicInfo] = useState(null);
  const [topicsCompleted, setTopicsCompleted] = useState([]);
  const [canAdvance, setCanAdvance] = useState(false);
  const [topicLoading, setTopicLoading] = useState(true);
  const [topicAdvancementMessage, setTopicAdvancementMessage] = useState(null);
  
  // Scenario state: 'A' (Functional) or 'B' (Experiential) or null (not selected)
  const [currentScenario, setCurrentScenario] = useState(null);
  const [scenarioAutoSent, setScenarioAutoSent] = useState(false); // Track if we've auto-sent the scenario message
  const [scenarioAInteractions, setScenarioAInteractions] = useState(0); // Track interactions for Scenario A
  const [scenarioBInteractions, setScenarioBInteractions] = useState(0); // Track interactions for Scenario B
  const [scenarioACompleted, setScenarioACompleted] = useState(false); // Track if Scenario A survey completed
  const [scenarioBCompleted, setScenarioBCompleted] = useState(false); // Track if Scenario B survey completed

  // Check if any character has reached 7 interactions and show survey for that character
  const checkAndShowSurvey = useCallback((participantData) => {
    // Use currentCharacterId from state, not parameter
    const currentCharId = currentCharacterId;
    if (!participantData || !participantData.characters) {
      console.log('checkAndShowSurvey: No participant data or characters');
      return;
    }
    
    const characters = participantData.characters || [];
    console.log('checkAndShowSurvey: Checking', characters.length, 'characters');
    
    // Log interaction counts for debugging
    characters.forEach(char => {
      console.log(`Character ${char.name} (${char.id}): ${char.interactions || 0} interactions`);
    });
    
    // Find the first character that has reached 7 interactions and hasn't completed its survey
    // Prioritize the character the user is currently chatting with
    const currentChar = characters.find(char => 
      String(char.id) === String(currentCharacterId) ||
      char.id === currentCharacterId
    );
    
    // Check current character first if it exists
    if (currentChar) {
      const interactions = currentChar.interactions || 0;
      const charId = String(currentChar.id);
      const isCompleted = completedSurveys.has(charId);
      const hasEnoughInteractions = interactions >= 7;
      
      console.log(`Current character ${currentChar.name} (${charId}): ${interactions} interactions, survey completed? ${isCompleted}`);
      
      if (hasEnoughInteractions && !isCompleted) {
        console.log('Current character has 7 interactions! Showing survey for:', currentChar.name, '(ID:', charId, ')');
        setSurveyCharacterId(charId);
        setSurveyCharacterName(currentChar.name || 'this character');
        setSurveyOpen(true);
        return;
      }
    }
    
    // If current character doesn't need survey, check other characters
    const characterNeedingSurvey = characters.find(char => {
      const interactions = char.interactions || 0;
      const charId = String(char.id);
      const isCompleted = completedSurveys.has(charId);
      const hasEnoughInteractions = interactions >= 7;
      
      console.log(`Character ${char.name} (${charId}): ${interactions} interactions, survey completed? ${isCompleted}`);
      
      return hasEnoughInteractions && !isCompleted;
    });
    
    if (characterNeedingSurvey) {
      const charId = String(characterNeedingSurvey.id);
      const charName = characterNeedingSurvey.name || 'this character';
      
      console.log('Character has 7 interactions! Showing survey for:', charName, '(ID:', charId, ')');
      setSurveyCharacterId(charId);
      setSurveyCharacterName(charName);
      setSurveyOpen(true);
    } else {
      console.log('No character needs survey yet (either not at 7 interactions or already completed)');
    }
  }, [completedSurveys, currentCharacterId]);

  // Fetch current topic information
  const loadCurrentTopic = useCallback(async () => {
    if (!user) return;
    
    try {
      setTopicLoading(true);
      const topicData = await getCurrentTopic();
      console.log('Current topic data:', topicData);
      
      const previousTopic = currentTopic;
      setCurrentTopic(topicData.current_topic);
      setTopicInfo(topicData.topic_info);
      
      // Parse topics_completed (can be array or comma-separated string)
      if (Array.isArray(topicData.topics_completed)) {
        setTopicsCompleted(topicData.topics_completed);
      } else if (typeof topicData.topics_completed === 'string' && topicData.topics_completed.trim()) {
        const completed = topicData.topics_completed.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
        setTopicsCompleted(completed);
      } else {
        setTopicsCompleted([]);
      }
      
      setCanAdvance(topicData.can_advance || false);
      
      // If topic changed, reset scenario states for new topic
      if (previousTopic !== topicData.current_topic) {
        setCurrentScenario(null);
        setScenarioACompleted(false);
        setScenarioBCompleted(false);
        setScenarioAInteractions(0);
        setScenarioBInteractions(0);
        setScenarioAutoSent(false);
      }
    } catch (error) {
      console.error('Failed to load current topic:', error);
      // Don't show error to user, topics are optional
    } finally {
      setTopicLoading(false);
    }
  }, [user, currentTopic]);
  
  // Handle scenario selection from dropdown
  const handleScenarioChange = async (event) => {
    const selectedScenario = event.target.value;
    if (!selectedScenario || !topicInfo || !assignedAgentId) return;
    
    setCurrentScenario(selectedScenario);
    setScenarioAutoSent(false); // Reset auto-sent flag for new scenario
    
    // Auto-send the selected scenario's prompt
    const scenarioText = selectedScenario === 'A' 
      ? topicInfo.functional_scenario 
      : topicInfo.experiential_scenario;
    
    if (!scenarioText) return;
    
    console.log(`User selected Scenario ${selectedScenario}, auto-sending prompt...`);
    
    try {
      // Send scenario message
      const chatResponse = await sendChat(String(assignedAgentId), scenarioText);
      console.log('Scenario auto-sent response:', chatResponse);
      
      // Mark as auto-sent
      setScenarioAutoSent(true);
      
      // Add the auto-sent message to chat history immediately
      const autoMessage = {
        sender: 'participant',
        message: scenarioText,
        timestamp: new Date().toISOString(),
        role: 'user',
        isAutoSent: true
      };
      
      // Update participant state to include auto-sent message
      setParticipant(prev => {
        if (!prev) {
          return {
            chatHistory: [autoMessage],
            characters: []
          };
        }
        const existingHistory = prev.chatHistory || [];
        // Check if message already exists to avoid duplicates
        const alreadyExists = existingHistory.some(msg => 
          msg.message === scenarioText && msg.isAutoSent
        );
        if (alreadyExists) return prev;
        
        return {
          ...prev,
          chatHistory: [...existingHistory, autoMessage]
        };
      });
      
      // Reload chat history from backend after a short delay
      setTimeout(async () => {
        try {
          const participantId = localStorage.getItem('participantId') || user?.email;
          if (participantId && assignedAgentId) {
            const data = await getParticipant(participantId);
            if (data && data.characters) {
              const assignedChar = data.characters.find(c => 
                String(c.id) === String(assignedAgentId) || 
                String(c.character_id) === String(assignedAgentId)
              );
              if (assignedChar) {
                setParticipant(prev => ({
                  ...(prev || {}),
                  ...data,
                  assignedCharacter: assignedChar,
                  chatHistory: assignedChar.chatHistory || assignedChar.chat_history || assignedChar.messages || []
                }));
              }
            }
          }
        } catch (err) {
          console.error('Failed to reload chat history:', err);
        }
      }, 500);
    } catch (error) {
      console.error('Failed to auto-send scenario:', error);
    }
  };

  // Load user data from /auth/me (assigned agent, current topic, interaction count)
  const loadUserData = useCallback(async () => {
    if (!user) {
      console.log('loadUserData: No user provided');
      setLoadingParticipant(false);
      return;
    }
    
    try {
      setLoadingParticipant(true);
      console.log('Loading user data from /auth/me...');
      const userData = await me();
      console.log('User data from /auth/me:', userData);
      
      // Extract assigned agent (one agent per user)
      // Backend should return characters array with assigned agent, or character_id directly
      let agent = null;
      let agentId = null;
      
      if (userData.characters && Array.isArray(userData.characters) && userData.characters.length > 0) {
        // Use first character as assigned agent (one agent per user)
        agent = userData.characters[0];
        agentId = agent.id || agent.character_id;
      } else if (userData.character_id) {
        // Backend returns character_id directly
        agentId = userData.character_id;
        agent = { id: agentId, name: userData.character_name || `Agent ${agentId}` };
      } else if (userData.character_ids && Array.isArray(userData.character_ids) && userData.character_ids.length > 0) {
        // Backend returns character_ids array
        agentId = userData.character_ids[0];
        agent = { id: agentId, name: `Agent ${agentId}` };
      }
      
      if (agentId) {
        setAssignedAgent(agent);
        setAssignedAgentId(String(agentId));
        setCurrentCharacterId(String(agentId)); // For backward compatibility
        
        // Extract interaction count (message_count from userData or character)
        const count = agent?.message_count || agent?.interactions || userData.message_count || userData.interaction_count || 0;
        setInteractionCount(count);
        console.log(`Assigned agent: ${agent.name} (ID: ${agentId}), interactions: ${count}`);
      }
      
      // Extract current topic from /auth/me
      if (typeof userData.current_topic === 'number') {
        setCurrentTopic(userData.current_topic);
        console.log(`Current topic: ${userData.current_topic}`);
      }
      
      // Extract current scenario from /auth/me (backend tracks this)
      // But we'll let user select via dropdown, so we don't auto-set it
      // Only use backend value if we don't have a selection yet
      if (!currentScenario && (userData.current_scenario === 'A' || userData.current_scenario === 'B')) {
        // Don't auto-set - let user choose from dropdown
        console.log(`Backend has scenario: ${userData.current_scenario}, but user must select`);
      }
      
      // Reset scenario completion states when topic changes
      // This will be handled when topic actually changes
      
      // Extract topics completed
      if (userData.topics_completed) {
        if (Array.isArray(userData.topics_completed)) {
          setTopicsCompleted(userData.topics_completed);
        } else if (typeof userData.topics_completed === 'string' && userData.topics_completed.trim()) {
          const completed = userData.topics_completed.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
          setTopicsCompleted(completed);
        }
      }
      
      // Load chat history for assigned agent (loadParticipant will be defined later)
      if (agentId) {
        // We'll load participant data after loadParticipant is defined
        // Store agentId for later use
        setTimeout(async () => {
          try {
            const participantId = localStorage.getItem('participantId') || user.email;
            if (participantId) {
              const data = await getParticipant(participantId);
              if (data && data.characters) {
                const assignedChar = data.characters.find(c => 
                  String(c.id) === String(agentId) || 
                  String(c.character_id) === String(agentId)
                );
                if (assignedChar) {
                  setParticipant({
                    ...data,
                    assignedCharacter: assignedChar,
                    chatHistory: assignedChar.chatHistory || assignedChar.chat_history || assignedChar.messages || []
                  });
                } else {
                  setParticipant(data);
                }
              } else {
                setParticipant(data);
              }
            }
          } catch (participantError) {
            console.error('Failed to load participant data:', participantError);
            // Don't block UI if participant load fails
          }
        }, 100);
      } else {
        console.warn('No agent ID found in user data');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Don't show alert immediately - let the UI render with error state
      console.error('Error details:', error.message, error.stack);
    } finally {
      setLoadingParticipant(false);
    }
  }, [user]);

  // On Load: Load user data and topic info
  useEffect(() => {
    if (user) {
      loadUserData().catch(err => {
        console.error('Error in loadUserData:', err);
        setLoadingParticipant(false); // Ensure loading state is cleared on error
      });
      loadCurrentTopic().catch(err => {
        console.error('Error in loadCurrentTopic:', err);
      });
    }
  }, [user]); // Remove loadUserData and loadCurrentTopic from dependencies to avoid infinite loops

  // Set currentCharacterId when assignedAgentId is set (for backward compatibility)
  useEffect(() => {
    if (assignedAgentId && !currentCharacterId) {
      setCurrentCharacterId(String(assignedAgentId));
    }
  }, [assignedAgentId, currentCharacterId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (currentCharacterId && participant) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [participant, currentCharacterId]);

  // Check for survey eligibility when scenario interaction count reaches 7
  useEffect(() => {
    if (assignedAgentId && currentScenario) {
      const scenarioCount = currentScenario === 'A' ? scenarioAInteractions : scenarioBInteractions;
      const isCompleted = currentScenario === 'A' ? scenarioACompleted : scenarioBCompleted;
      
      if (scenarioCount >= 7 && !isCompleted) {
        checkAndShowSurvey();
      }
    }
  }, [assignedAgentId, currentScenario, scenarioAInteractions, scenarioBInteractions, scenarioACompleted, scenarioBCompleted, checkAndShowSurvey]);

  // Load participant data (chat history) for the assigned agent
  const loadParticipant = async (characterId) => {
    // Use provided characterId or fall back to assignedAgentId
    const charId = characterId || assignedAgentId;
    if (!charId) {
      console.log('loadParticipant: No character ID provided');
      return null;
    }
    try {
      setLoadingParticipant(true);
      // Use user's email as participant_id
      // GET /mongo/participants/{email} - backend auto-creates if missing
      // Expected response structure:
      // {
      //   "_id": "1",
      //   "surveyUnlocked": false,
      //   "characters": [
      //     {
      //       "id": "1",
      //       "name": "A",
      //       "interactions": 12,
      //       "chatHistory": [
      //         { "sender": "participant", "message": "hi", "timestamp": "..." },
      //         ...
      //       ]
      //     }
      //   ]
      // }
      if (!user || !user.email) {
        throw new Error('User email is required to load participant');
      }
      
      console.log('Loading chat history for character:', charId);
      // Load participant data to get chat history
      // Note: This may return multiple characters, but we only use the assigned agent's data
      const data = await getParticipant(user.email);
      console.log('Participant data loaded:', data);
      
      // Validate response structure
      if (!data) {
        throw new Error('Invalid participant data received');
      }
      
      // Store participant ID (integer) for future use (optional optimization)
      if (data._id) {
        localStorage.setItem('participantId', data._id);
        console.log('Stored participant ID:', data._id);
      }
      
      // Extract chat history for the assigned agent
      // Backend returns characters array, find the one matching our assigned agent
      if (data.characters && Array.isArray(data.characters)) {
        const assignedChar = data.characters.find(c => 
          String(c.id) === String(charId) || 
          String(c.character_id) === String(charId)
        );
        
        if (assignedChar) {
          // Update interaction count from participant data if available
          const count = assignedChar.interactions || assignedChar.interaction_count || interactionCount;
          if (count !== interactionCount) {
            console.log(`Updating interaction count from participant data: ${count}`);
            setInteractionCount(count);
          }
          
          // Store participant data with chat history
          setParticipant({
            ...data,
            assignedCharacter: assignedChar,
            chatHistory: assignedChar.chatHistory || assignedChar.chat_history || assignedChar.messages || []
          });
        } else {
          // Assigned agent not found in participant data, store what we have
          setParticipant(data);
        }
      } else {
        setParticipant(data);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to load participant:', error);
      console.error('Error details:', {
        message: error.message,
        user: user?.email,
        stack: error.stack
      });
      
      // Check for specific backend database errors
      const errorMessage = error.message || 'Unknown error occurred';
      let userFriendlyMessage = 'Failed to load participant data.';
      
      // Check if it's a 404 error - refresh character assignments
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        console.log('404 error detected, refreshing character assignments...');
        try {
          // Call /characters/assigned to refresh character assignments
          const assignedChars = await getAssignedCharacters();
          console.log('Refreshed character assignments:', assignedChars);
          
          // Store updated character assignments
          if (assignedChars && Array.isArray(assignedChars)) {
            localStorage.setItem("assignedCharacters", JSON.stringify(assignedChars));
          } else if (assignedChars && assignedChars.characters && Array.isArray(assignedChars.characters)) {
            localStorage.setItem("assignedCharacters", JSON.stringify(assignedChars.characters));
          }
          
          // Retry loading participant after refreshing assignments
          console.log('Retrying participant load after refreshing assignments...');
          const retryData = await getParticipant(user.email);
          if (retryData) {
            setParticipant(retryData);
            if (retryData._id) {
              localStorage.setItem('participantId', retryData._id);
            }
            if (retryData.characters && retryData.characters.length > 0 && !currentCharacterId) {
              setCurrentCharacterId(retryData.characters[0].id);
            }
            checkAndShowSurvey(retryData);
            setLoadingParticipant(false);
            return retryData;
          }
        } catch (refreshError) {
          console.error('Failed to refresh character assignments:', refreshError);
          userFriendlyMessage = 'Character assignments not found. Please try logging in again.';
        }
      }
      
      // Check if it's a 403 error - survey required
      if (errorMessage.includes('403') || errorMessage.includes('survey') || errorMessage.includes('Please complete')) {
        userFriendlyMessage = 'Please complete the signup survey before accessing chat features.';
        // Redirect to signup survey
        window.history.pushState({}, "", "/signup-survey");
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      
      // Check if it's a database schema error
      if (errorMessage.includes('column participants.email does not exist')) {
        userFriendlyMessage = 'Backend database configuration error: The participants table is missing an email column. Please contact the administrator.';
        console.error('BACKEND FIX NEEDED: The participants table needs an email column, or the backend should use user ID from auth token instead of email lookup.');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        userFriendlyMessage = 'Server error occurred. The backend may need to be updated. Please try again later or contact support.';
      }
      
      // Show error message
      alert(userFriendlyMessage);
      
      // Don't block the UI completely - allow user to see the error but continue
      // Set a minimal participant state so the UI doesn't break
      setParticipant({
        _id: null,
        surveyUnlocked: false,
        characters: []
      });
      return null;
    } finally {
      setLoadingParticipant(false);
    }
  };

  // Get chat history for assigned agent
  const getCurrentChatHistory = () => {
    if (!participant) return [];
    
    // Use chatHistory directly if stored, otherwise look in characters array
    if (participant.chatHistory && Array.isArray(participant.chatHistory)) {
      return [...participant.chatHistory].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB;
      });
    }
    
    // Fallback: look in assignedCharacter or characters array
    const character = participant.assignedCharacter || 
      (participant.characters && participant.characters.find(c => 
        String(c.id) === String(assignedAgentId) || 
        String(c.id) === String(currentCharacterId)
      ));
    
    if (!character) return [];
    
    // Get chat history for this character (from backend structure)
    // Backend returns: character.chatHistory array with { sender, message, timestamp }
    const chatHistory = character.chatHistory || character.chat_history || character.messages || [];
    
    // Backend already returns messages ordered by timestamp, but sort to be safe
    return [...chatHistory].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
      return timeA - timeB;
    });
  };

  // Send Message: Call POST /chat endpoint
  const handleSend = async () => {
    const text = input.trim();
    const charId = assignedAgentId || currentCharacterId;
    if (!text || !charId || loading || !user) return;
    
    // Check if a scenario is selected
    if (!currentScenario) {
      alert('Please select a scenario from the dropdown first.');
      return;
    }
    
    // Check interaction limit for current scenario (7 interactions per scenario)
    const currentScenarioCount = currentScenario === 'A' ? scenarioAInteractions : scenarioBInteractions;
    const isCompleted = currentScenario === 'A' ? scenarioACompleted : scenarioBCompleted;
    
    if (isCompleted) {
      alert(`You have already completed Scenario ${currentScenario}. Please select the other scenario or complete both to advance.`);
      return;
    }
    
    if (currentScenarioCount >= 7) {
      alert(`You have reached the interaction limit for Scenario ${currentScenario}. Please complete the survey to continue.`);
      return;
    }

    setInput('');
    setLoading(true);

    try {
      // POST /chat - Send message to assigned agent
      const chatResponse = await sendChat(String(charId), text);
      console.log('Chat response:', chatResponse);
      
      // Increment interaction count for the current scenario
      if (currentScenario === 'A') {
        const newCount = scenarioAInteractions + 1;
        setScenarioAInteractions(newCount);
        setInteractionCount(newCount); // Also update main count for display
      } else {
        const newCount = scenarioBInteractions + 1;
        setScenarioBInteractions(newCount);
        setInteractionCount(newCount);
      }
      
      // Reload user data from /auth/me to get updated interaction count and check survey status
      try {
        const userData = await me();
        const count = userData.message_count || 
          (userData.characters && userData.characters[0]?.message_count) || 
          (currentScenario === 'A' ? scenarioAInteractions + 1 : scenarioBInteractions + 1);
        
        // Update the appropriate scenario count
        if (currentScenario === 'A') {
          setScenarioAInteractions(count);
        } else {
          setScenarioBInteractions(count);
        }
        setInteractionCount(count);
        
        // Reload chat history
        await loadParticipant(charId);
        
        // Check if survey should be shown (when count reaches 7 for current scenario)
        const scenarioCount = currentScenario === 'A' ? scenarioAInteractions + 1 : scenarioBInteractions + 1;
        if (scenarioCount >= 7) {
          await checkAndShowSurvey();
        }
      } catch (error) {
        console.warn('Failed to reload user data after message, but message was sent:', error);
        // Message was sent successfully, just reload participant for chat history
        await loadParticipant(charId);
      }
      
      // Refocus input field after successful send (unless survey dialog opens)
      // We no longer rely on an "updatedParticipant" response here.
      // Only refocus if the survey dialog is not opening.
      if (!surveyOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error.message || '';
      
      // Handle 403 error - survey required
      if (errorMessage.includes('403') || errorMessage.includes('survey') || errorMessage.includes('Please complete')) {
        alert('Please complete the signup survey before accessing chat features.');
        // Redirect to signup survey
        window.history.pushState({}, "", "/signup-survey");
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      
      alert('Failed to send message: ' + errorMessage);
      
      // Refocus input field even on error (so user can retry)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };
  
  const handleSendClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSend();
  };

  if (loadingParticipant) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" sx={{ width: '100%', height: '100%' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  // Check if we have the assigned agent - but allow rendering even if not loaded yet
  // This prevents blank page if there's a delay in loading
  if (!assignedAgentId || !assignedAgent) {
    // Still render the layout, but show a message
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <Box>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary" align="center">
              Loading your agent...
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              If this persists, please refresh the page.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  const chatHistory = getCurrentChatHistory();
  // Use interaction count from /auth/me
  const currentCount = interactionCount;
  const hasReachedLimit = currentCount >= 7;
  // Use assigned agent (one agent per user)
  const currentCharacter = assignedAgent || { 
    id: assignedAgentId, 
    name: assignedAgent?.name || `Agent ${assignedAgentId}` 
  };

  // Handle survey completion
  const handleSurveyComplete = async (characterId, characterName) => {
    // Mark this character's survey as completed
    setCompletedSurveys(prev => new Set([...prev, String(characterId)]));
    console.log(`Survey completed for character ${characterId} (${characterName})`);
    
    // Store previous topic to check if it advanced
    const previousTopic = currentTopic;
    
    // Reload user data from /auth/me to get updated topic and interaction count (should reset to 0)
    try {
      const userData = await me();
      console.log('User data after survey:', userData);
      
      // Update assigned agent if changed
      if (userData.characters && Array.isArray(userData.characters) && userData.characters.length > 0) {
        const agent = userData.characters[0];
        const agentId = String(agent.id || agent.character_id);
        setAssignedAgent(agent);
        setAssignedAgentId(agentId);
        setCurrentCharacterId(agentId);
        
        // Interaction count should reset to 0 after survey
        const count = agent?.message_count || agent?.interactions || 0;
        setInteractionCount(count);
        console.log(`Interaction count reset to: ${count}`);
      }
      
      // Update current topic (should advance to next topic)
      if (typeof userData.current_topic === 'number') {
        const newTopic = userData.current_topic;
        setCurrentTopic(newTopic);
        
        // Check if topic advanced
        if (previousTopic && newTopic > previousTopic) {
          setTopicAdvancementMessage(`Topic ${previousTopic} completed! You've advanced to Topic ${newTopic}.`);
          // Clear message after 5 seconds
          setTimeout(() => setTopicAdvancementMessage(null), 5000);
        }
      }
      
      // Update topics completed
      if (userData.topics_completed) {
        if (Array.isArray(userData.topics_completed)) {
          setTopicsCompleted(userData.topics_completed);
        } else if (typeof userData.topics_completed === 'string' && userData.topics_completed.trim()) {
          const completed = userData.topics_completed.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
          setTopicsCompleted(completed);
        }
      }
      
      // Reload topic details from /topics/current
      const updatedTopicData = await getCurrentTopic();
      console.log('Topic data after survey:', updatedTopicData);
      
      if (updatedTopicData.topic_info) {
        setTopicInfo(updatedTopicData.topic_info);
      }
      setCanAdvance(updatedTopicData.can_advance || false);
      
      // Mark the completed scenario
      if (currentScenario === 'A') {
        setScenarioACompleted(true);
        setScenarioAInteractions(0); // Reset count for next topic
        console.log('Scenario A completed');
      } else if (currentScenario === 'B') {
        setScenarioBCompleted(true);
        setScenarioBInteractions(0); // Reset count for next topic
        console.log('Scenario B completed');
      }
      
      // Check if both scenarios are completed - then topic can advance
      const bothCompleted = (currentScenario === 'A' && scenarioBCompleted) || 
                           (currentScenario === 'B' && scenarioACompleted) ||
                           (scenarioACompleted && scenarioBCompleted);
      
      if (bothCompleted) {
        // Both scenarios completed, topic should advance (handled by backend)
        console.log('Both scenarios completed, topic should advance');
        // Reset scenario states for next topic
        setCurrentScenario(null);
        setScenarioACompleted(false);
        setScenarioBCompleted(false);
        setScenarioAInteractions(0);
        setScenarioBInteractions(0);
        setScenarioAutoSent(false);
      } else {
        // Only one scenario completed, keep current scenario selected but reset auto-sent
        setScenarioAutoSent(false);
      }
      
      // Reload chat history (preserved, but interaction count reset)
      const agentId = assignedAgentId || userData.characters?.[0]?.id;
      if (agentId) {
        await loadParticipant(String(agentId));
      }
      
      // Show success message
      alert(`Survey completed! Thank you for your feedback. You can continue chatting with ${characterName}.`);
    } catch (error) {
      console.error('Failed to reload data after survey:', error);
      alert('Survey completed! Reloading your data...');
      // Fallback: reload everything
      await loadUserData();
      await loadCurrentTopic();
    }
    
    // Refocus input field so user can continue chatting
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
      {/* Left Column: Topic Panel - Fixed width 280-320px, full height */}
      <Box 
        sx={{ 
          width: '300px', 
          flexShrink: 0,
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          bgcolor: '#fafafa',
          position: 'relative'
        }}
      >
        {/* Topic Advancement Message */}
        {topicAdvancementMessage && (
          <Alert 
            severity="success" 
            sx={{ m: 2, mb: 1 }}
            onClose={() => setTopicAdvancementMessage(null)}
          >
            {topicAdvancementMessage}
          </Alert>
        )}

            {/* Topic Display */}
            {topicInfo && (
              <Box sx={{ p: 2, pb: 1 }}>
                <TopicDisplay 
                  topicInfo={topicInfo}
                  currentTopic={currentTopic}
                  topicsCompleted={topicsCompleted}
                  canAdvance={canAdvance}
                  currentScenario={currentScenario}
                />
                
                {/* Scenario Selection Dropdown */}
                <Paper elevation={1} sx={{ mt: 2, p: 2, bgcolor: '#fff' }}>
                  <FormControl fullWidth>
                    <InputLabel id="scenario-select-label">Select Scenario</InputLabel>
                    <Select
                      labelId="scenario-select-label"
                      id="scenario-select"
                      value={currentScenario || ''}
                      label="Select Scenario"
                      onChange={handleScenarioChange}
                      disabled={loading}
                    >
                      <MenuItem value="A">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Scenario A: Functional Loss
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {scenarioACompleted ? '✓ Completed' : `${scenarioAInteractions}/7 interactions`}
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="B">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Scenario B: Experiential Loss
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {scenarioBCompleted ? '✓ Completed' : `${scenarioBInteractions}/7 interactions`}
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                  
                  {scenarioACompleted && scenarioBCompleted && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Both scenarios completed! Complete the surveys to advance to the next topic.
                    </Alert>
                  )}
                </Paper>
              </Box>
            )}


        {/* Assigned Agent Info - Display only (one agent per user) */}
        {assignedAgent && (
          <Paper 
            elevation={0} 
            sx={{ 
              m: 2, 
              mt: 1, 
              bgcolor: '#faf5ff', 
              borderRadius: '12px',
              border: '1px solid #e9d5ff',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ bgcolor: '#9333ea', p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>
                Your Agent
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 600,
                  color: '#9333ea',
                  mb: 1.5
                }}
              >
                {assignedAgent.name || `Agent ${assignedAgentId}`}
              </Typography>
              {currentScenario ? (
                <Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      display: 'block',
                      mb: 0.5
                    }}
                  >
                    Scenario {currentScenario} Interactions
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600,
                      color: (currentScenario === 'A' ? scenarioAInteractions : scenarioBInteractions) >= 7 ? '#16a34a' : '#9333ea',
                      fontSize: '1rem'
                    }}
                  >
                    {currentScenario === 'A' ? scenarioAInteractions : scenarioBInteractions}/7
                  </Typography>
                </Box>
              ) : (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.75rem'
                  }}
                >
                  Select a scenario to start
                </Typography>
              )}
            </Box>
          </Paper>
        )}
      </Box>

      {/* Right Column: Chat Area - Takes remaining width, centers chat */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minWidth: 0, 
        overflow: 'hidden',
        bgcolor: '#f9fafb'
      }}>
        {/* Centered Chat Wrapper - max-width 720-800px, centered horizontally */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          width: '100%',
          maxWidth: '760px',
          margin: '0 auto',
          position: 'relative'
        }}>
          {/* Chat Window: Displays chatHistory for the selected character */}
          <Box 
            sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              px: 3,
              py: 2.5,
              bgcolor: '#f9fafb',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              minHeight: 0, // Important for flex children to allow scrolling
            }}
          >
        {chatHistory.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4, lineHeight: 1.6 }}>
            Start a conversation with {currentCharacter?.name || 'your agent'} about the topic scenarios above!
          </Typography>
        ) : (
          chatHistory.map((msg, idx) => {
            const isUser = msg.sender === 'participant' || msg.sender === 'user' || msg.role === 'user';
            return (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  mb: 0.5
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    maxWidth: '65%',
                    bgcolor: isUser ? '#2563eb' : '#f3f4f6',
                    color: isUser ? 'white' : '#1f2937',
                    borderRadius: '16px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    lineHeight: 1.6
                  }}
                >
                  <Typography variant="body1" sx={{ lineHeight: 1.6, wordBreak: 'break-word' }}>
                    {msg.message || msg.content}
                  </Typography>
                  {(msg.timestamp || msg.created_at) && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        mt: 0.75, 
                        opacity: isUser ? 0.8 : 0.6,
                        fontSize: '0.75rem'
                      }}
                    >
                      {new Date(msg.timestamp || msg.created_at).toLocaleTimeString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })
        )}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Box
              sx={{
                p: 2,
                maxWidth: '65%',
                bgcolor: '#f3f4f6',
                color: '#1f2937',
                borderRadius: '16px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <Typography variant="body2" sx={{ opacity: 0.6, lineHeight: 1.6 }}>
                Thinking...
              </Typography>
            </Box>
          </Box>
        )}
          <div ref={messagesEndRef} />
        </Box>

          {/* Completion Message */}
          {hasReachedLimit && !surveyAvailable && !completedSurveys.has(String(assignedAgentId)) && (
            <Paper elevation={1} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: '12px', mx: 3, mb: 1 }}>
              <Typography variant="body2" align="center" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                You've completed 7 interactions! Please complete the survey to advance to the next topic.
              </Typography>
            </Paper>
          )}

          {/* Message Input: Sends participant messages - Sticky at bottom, aligned with chat width */}
          <Paper 
            elevation={4} 
            sx={{ 
              p: 2, 
              borderRadius: 0, 
              flexShrink: 0, 
              mx: 3, 
              mb: 2,
              bgcolor: '#fff',
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
              position: 'sticky',
              bottom: 0
            }}
          >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={4}
                     placeholder={
                       !currentScenario
                         ? "Please select a scenario from the dropdown first"
                         : hasReachedLimit 
                           ? `You have reached the interaction limit for Scenario ${currentScenario}` 
                           : "Type your message... (Press Enter to send)"
                     }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
                     disabled={loading || hasReachedLimit || !currentScenario}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  minHeight: '48px',
                  '& fieldset': {
                    borderColor: '#e5e7eb',
                  },
                  '&:hover fieldset': {
                    borderColor: '#d1d5db',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2563eb',
                  },
                },
              }}
              autoFocus
            />
            <Button
              type="button"
              variant="contained"
              onClick={handleSendClick}
              disabled={!input.trim() || loading || hasReachedLimit || !currentScenario}
              startIcon={<SendIcon />}
              sx={{
                minHeight: '48px',
                borderRadius: '12px',
                px: 3,
                bgcolor: '#2563eb',
                '&:hover': {
                  bgcolor: '#1d4ed8',
                },
                '&:disabled': {
                  bgcolor: '#e5e7eb',
                  color: '#9ca3af',
                },
              }}
            >
              Send
            </Button>
          </Box>
        </Paper>
        </Box>

        {/* Character Interaction Survey Dialog */}
        <CharacterInteractionSurvey
          characterId={surveyCharacterId}
          characterName={surveyCharacterName}
          open={surveyOpen}
          onClose={() => setSurveyOpen(false)}
          onComplete={handleSurveyComplete}
        />
      </Box>
    </Box>
  );
}
