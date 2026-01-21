import React, { useState, useEffect, useRef } from 'react';
import { getParticipant, getAssignedCharacters, getCurrentTopic, sendChat, me, getCharacterSurveyStatus, selectScenario, initializeScenario, getChatHistory } from '../api';
import { Box, Paper, TextField, Button, Typography, CircularProgress, Tabs, Tab, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CharacterInteractionSurvey from '../components/CharacterInteractionSurvey';
import TopicDisplay from '../components/TopicDisplay';
import ScenarioSelector from '../components/ScenarioSelector';

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
  const participantLoadedRef = useRef(false); // Track if participant data has been loaded to prevent infinite loops
  
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
  const [scenariosCompleted, setScenariosCompleted] = useState([]); // e.g., ["1A", "1B", "2A"]
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
  // Check and show survey - changed to regular function to avoid circular dependency
  const checkAndShowSurvey = (participantData) => {
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
  };

  // Fetch current topic information - use regular function to avoid circular dependency issues
  const loadCurrentTopic = async () => {
    if (!user) return;
    
    try {
      setTopicLoading(true);
      const topicData = await getCurrentTopic();
      console.log('Current topic data:', topicData);
      
      // Use functional update to get current value without dependency
      setCurrentTopic(prevTopic => {
        const previousTopic = prevTopic;
        
        // If topic changed, reset scenario states for new topic
        if (previousTopic !== null && previousTopic !== topicData.current_topic) {
          // New topic - reset scenario states and start with Scenario A
          setCurrentScenario('A');
          setScenarioACompleted(false);
          setScenarioBCompleted(false);
          setScenarioAInteractions(0);
          setScenarioBInteractions(0);
          setScenarioAutoSent(false);
        }
        
        return topicData.current_topic;
      });
      
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
      
      // Parse scenarios_completed (e.g., ["1A", "1B", "2A"])
      if (Array.isArray(topicData.scenarios_completed)) {
        setScenariosCompleted(topicData.scenarios_completed);
      } else if (typeof topicData.scenarios_completed === 'string' && topicData.scenarios_completed.trim()) {
        const completed = topicData.scenarios_completed.split(',').map(s => s.trim()).filter(s => s);
        setScenariosCompleted(completed);
      } else {
        setScenariosCompleted([]);
      }
      
      // Update scenario completion status
      if (typeof topicData.scenario_a_completed === 'boolean') {
        setScenarioACompleted(topicData.scenario_a_completed);
      }
      if (typeof topicData.scenario_b_completed === 'boolean') {
        setScenarioBCompleted(topicData.scenario_b_completed);
      }
      
      // Set current scenario from backend if provided, or default to A if Scenario A not completed
      if (topicData.current_scenario === 'A' || topicData.current_scenario === 'B') {
        setCurrentScenario(topicData.current_scenario);
      } else if (!topicData.scenario_a_completed) {
        // If no scenario set and Scenario A not completed, default to A
        setCurrentScenario('A');
      } else if (topicData.scenario_a_completed && !topicData.scenario_b_completed) {
        // Scenario A completed but B not, default to B
        setCurrentScenario('B');
      }
      
      setCanAdvance(topicData.can_advance || false);
    } catch (error) {
      console.error('Failed to load current topic:', error);
      // Don't show error to user, topics are optional
    } finally {
      setTopicLoading(false);
    }
  };
  
  // SIMPLIFIED: Load participant data - just get chat history
  const loadParticipant = async () => {
    if (!user?.email) {
      console.log('[CHAT] No user email');
      return null;
    }
    
    if (participantLoadedRef.current) {
      console.log('[CHAT] Already loaded, skipping');
      return null;
    }
    
    try {
      setLoadingParticipant(true);
      participantLoadedRef.current = true; // Prevent duplicate calls
      
      console.log('[CHAT] Loading participant data for:', user.email);
      const data = await getParticipant(user.email);
      console.log('[CHAT] Participant data received:', data);
      
      if (!data) {
        throw new Error('Invalid participant data received');
      }
      
      // SIMPLE: Just find the character with chat history and set it
      // MATCH BY NAME, not ID (IDs are different between /auth/me and /participants)
      let characterWithHistory = null;
      let chatHistory = [];
      
      if (data.characters && Array.isArray(data.characters) && data.characters.length > 0) {
        // Try to find by NAME match first (names are consistent across endpoints)
        if (assignedAgent && assignedAgent.name) {
          characterWithHistory = data.characters.find(c => 
            c.name === assignedAgent.name
          );
        }
        
        // If no name match, try ID match as fallback
        if (!characterWithHistory) {
          characterWithHistory = data.characters.find(c => 
            String(c.id) === String(assignedAgentId) || 
            String(c.character_id) === String(assignedAgentId)
          );
        }
        
        // If still no match, use first character with history, or just first character
        if (!characterWithHistory) {
          characterWithHistory = data.characters.find(c => 
            (c.chatHistory && c.chatHistory.length > 0) ||
            (c.chat_history && c.chat_history.length > 0) ||
            (c.messages && c.messages.length > 0)
          ) || data.characters[0];
          console.log(`[CHAT] Using fallback - matched by history availability`);
        }
        
        // Extract chat history
        if (characterWithHistory) {
          chatHistory = characterWithHistory.chatHistory || 
                       characterWithHistory.chat_history || 
                       characterWithHistory.messages || [];
          console.log(`[CHAT] ✅ Found character: ${characterWithHistory.name} (ID: ${characterWithHistory.id}) with ${chatHistory.length} messages`);
        }
      }
      
      // Set participant state with chat history
      setParticipant({
        ...data,
        assignedCharacter: characterWithHistory,
        chatHistory: chatHistory
      });
      
      console.log(`[CHAT] ✅ Chat history loaded: ${chatHistory.length} messages`);
      return data;
    } catch (error) {
      console.error('Failed to load participant:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      let userFriendlyMessage = 'Failed to load participant data.';
      
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        try {
          const assignedChars = await getAssignedCharacters();
          if (assignedChars && Array.isArray(assignedChars)) {
            localStorage.setItem("assignedCharacters", JSON.stringify(assignedChars));
          }
          const retryData = await getParticipant(user.email);
          if (retryData) {
            setParticipant(retryData);
            if (retryData._id) {
              localStorage.setItem('participantId', retryData._id);
            }
            setLoadingParticipant(false);
            return retryData;
          }
        } catch (refreshError) {
          console.error('Failed to refresh character assignments:', refreshError);
        }
      }
      
      if (errorMessage.includes('403') || errorMessage.includes('survey')) {
        userFriendlyMessage = 'Please complete the signup survey before accessing chat features.';
        window.history.pushState({}, "", "/signup-survey");
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      
      if (errorMessage.includes('column participants.email does not exist')) {
        userFriendlyMessage = 'Backend database configuration error. Please contact the administrator.';
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        userFriendlyMessage = 'Server error occurred. Please try again later.';
      }
      
      alert(userFriendlyMessage);
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
  
  // Handle scenario selection - new implementation using selectScenario endpoint
  const handleScenarioSelect = async (scenario) => {
    if (!scenario || !topicInfo || !assignedAgentId) return;
    
    try {
      setLoading(true);
      
      // Call backend to select scenario - this endpoint sends the message and returns agent reply
      const response = await selectScenario(scenario);
      console.log(`Scenario ${scenario} selected, response:`, response);
      
      setCurrentScenario(scenario);
      setScenarioAutoSent(true); // Mark as auto-sent since backend handled it
      
      // Get the scenario text from topicInfo
      const scenarioText = scenario === 'A' 
        ? topicInfo.functional_scenario 
        : topicInfo.experiential_scenario;
      
      if (!scenarioText) {
        console.error('No scenario text available');
        return;
      }
      
      // Extract agent reply from response
      // Response structure may vary, check common fields
      const agentReply = response.reply || response.message || response.response || response.agent_reply || 'I understand. How can I help you with this?';
      
      // Add the auto-sent user message to chat history immediately
      const autoMessage = {
        sender: 'participant',
        message: scenarioText,
        timestamp: new Date().toISOString(),
        role: 'user',
        isAutoSent: true
      };
      
      // Add agent response from the selectScenario endpoint
      const agentResponse = {
        sender: 'agent',
        message: agentReply,
        timestamp: new Date().toISOString(),
        role: 'assistant',
        isAutoSent: true // Mark agent's auto-response
      };
      
      // Update participant state to include both messages immediately
      setParticipant(prev => {
        if (!prev) {
          const newHistory = [autoMessage, agentResponse];
          // Sort by timestamp to ensure correct order
          newHistory.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
            const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
            return timeA - timeB; // Ascending order
          });
          return {
            chatHistory: newHistory,
            characters: []
          };
        }
        const existingHistory = prev.chatHistory || [];
        // Check if message already exists to avoid duplicates
        const alreadyExists = existingHistory.some(msg => 
          msg.message === scenarioText && msg.isAutoSent
        );
        if (alreadyExists) return prev;
        
        const newHistory = [...existingHistory, autoMessage, agentResponse];
        // Sort by timestamp to ensure correct order
        newHistory.sort((a, b) => {
          const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
          const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
          return timeA - timeB; // Ascending order
        });
        
        return {
          ...prev,
          chatHistory: newHistory
        };
      });
      
      // Scroll to bottom to show the new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Reload chat history from backend after a short delay to ensure full sync
      // Use direct API call instead of loadChatHistoryForScenario to avoid circular dependency
      setTimeout(async () => {
        try {
          if (assignedAgentId) {
            const chatHistory = await getChatHistory(String(assignedAgentId));
            if (Array.isArray(chatHistory)) {
              const sortedHistory = [...chatHistory].sort((a, b) => {
                const timeA = new Date(a.timestamp || a.created_at || a.created_at_est || 0).getTime();
                const timeB = new Date(b.timestamp || b.created_at || b.created_at_est || 0).getTime();
                return timeA - timeB;
              });
              setParticipant(prev => ({
                ...(prev || {}),
                chatHistory: sortedHistory
              }));
            }
          }
        } catch (err) {
          console.error('Failed to reload chat history after scenario selection:', err);
        }
      }, 500);
      
      // Reload topic data to get updated scenario status
      await loadCurrentTopic();
      
    } catch (error) {
      console.error('Failed to select scenario:', error);
      alert('Failed to select scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load chat history for current scenario - use regular function to avoid circular dependency
  const loadChatHistoryForScenario = async () => {
    if (!assignedAgentId) return;
    
    try {
      const chatHistory = await getChatHistory(String(assignedAgentId));
      console.log('Chat history loaded:', chatHistory);
      
      // Filter messages by current scenario if needed (backend may handle this)
      // For now, use all messages
      if (Array.isArray(chatHistory)) {
        // Sort messages by timestamp in ascending order (oldest first, newest last)
        const sortedHistory = [...chatHistory].sort((a, b) => {
          const timeA = new Date(a.timestamp || a.created_at || a.created_at_est || 0).getTime();
          const timeB = new Date(b.timestamp || b.created_at || b.created_at_est || 0).getTime();
          return timeA - timeB; // Ascending order
        });
        
        setParticipant(prev => ({
          ...(prev || {}),
          chatHistory: sortedHistory
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Fallback: reload participant data directly (don't call loadParticipant to avoid circular dependency)
      try {
        const participantId = localStorage.getItem('participantId') || user?.email;
        if (participantId) {
          const data = await getParticipant(participantId);
          if (data && data.characters) {
            const assignedChar = data.characters.find(c => 
              String(c.id) === String(assignedAgentId) || 
              String(c.character_id) === String(assignedAgentId)
            );
            if (assignedChar) {
              const chatHistory = assignedChar.chatHistory || assignedChar.chat_history || assignedChar.messages || [];
              const sortedHistory = [...chatHistory].sort((a, b) => {
                const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
                const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
                return timeA - timeB;
              });
              setParticipant(prev => ({
                ...(prev || {}),
                ...data,
                assignedCharacter: assignedChar,
                chatHistory: sortedHistory
              }));
            }
          }
        }
      } catch (fallbackError) {
        console.error('Failed to load participant as fallback:', fallbackError);
      }
    }
  };
  
  // Handle scenario selection from dropdown (legacy - keeping for backward compatibility)
  const handleScenarioChange = async (event) => {
    const selectedScenario = event.target.value;
    await handleScenarioSelect(selectedScenario);
    
    // Auto-send the selected scenario's prompt
    const scenarioText = selectedScenario === 'A' 
      ? topicInfo.functional_scenario 
      : topicInfo.experiential_scenario;
    
    if (!scenarioText) return;
    
    console.log(`User selected Scenario ${selectedScenario}, auto-sending prompt...`);
    
    try {
      setLoading(true); // Show loading state while waiting for agent response
      
      // Send scenario message
      const chatResponse = await sendChat(String(assignedAgentId), scenarioText);
      console.log('Scenario auto-sent response:', chatResponse);
      
      // Mark as auto-sent
      setScenarioAutoSent(true);
      
      // Add the auto-sent message and agent response to chat history immediately
      const autoMessage = {
        sender: 'participant',
        message: scenarioText,
        timestamp: new Date().toISOString(),
        role: 'user',
        isAutoSent: true
      };
      
      // Add agent response immediately
      const agentResponse = {
        sender: 'agent',
        message: chatResponse.reply || chatResponse.message || chatResponse.response || 'I understand. How can I help you with this?',
        timestamp: new Date().toISOString(),
        role: 'assistant'
      };
      
      // Update participant state to include both messages immediately
      setParticipant(prev => {
        if (!prev) {
          return {
            chatHistory: [autoMessage, agentResponse],
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
          chatHistory: [...existingHistory, autoMessage, agentResponse]
        };
      });
      
      // Scroll to bottom to show the new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Reload chat history from backend after a short delay to ensure sync
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
                const backendHistory = assignedChar.chatHistory || assignedChar.chat_history || assignedChar.messages || [];
                // Merge with existing history to preserve messages
                setParticipant(prev => {
                  const existingHistory = prev?.chatHistory || [];
                  const combinedHistory = [...existingHistory];
                  backendHistory.forEach(backendMsg => {
                    const exists = combinedHistory.some(existingMsg => 
                      existingMsg.message === backendMsg.message && 
                      existingMsg.timestamp === backendMsg.timestamp
                    );
                    if (!exists) {
                      combinedHistory.push(backendMsg);
                    }
                  });
                  // Sort by timestamp
                  combinedHistory.sort((a, b) => {
                    const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
                    const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
                    return timeA - timeB;
                  });
                  
                  return {
                    ...(prev || {}),
                    ...data,
                    assignedCharacter: assignedChar,
                    chatHistory: combinedHistory.length > 0 ? combinedHistory : backendHistory
                  };
                });
              }
            }
          }
        } catch (err) {
          console.error('Failed to reload chat history:', err);
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to auto-send scenario:', error);
      // Show error message in chat
      const errorMessage = {
        sender: 'agent',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        role: 'assistant'
      };
      setParticipant(prev => {
        if (!prev) return { chatHistory: [errorMessage], characters: [] };
        return {
          ...prev,
          chatHistory: [...(prev.chatHistory || []), errorMessage]
        };
      });
    } finally {
      setLoading(false);
    }
  };

  // Load user data from /auth/me (assigned agent, current topic, interaction count)
  // Changed to regular function to avoid circular dependency issues
  const loadUserData = async () => {
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
      if (userData.current_scenario === 'A' || userData.current_scenario === 'B') {
        // Use backend value if we don't have a selection yet, or if it's different
        const newScenario = userData.current_scenario;
        if (!currentScenario || currentScenario !== newScenario) {
          setCurrentScenario(newScenario);
          console.log(`Current scenario from backend: ${newScenario}`);
          // Auto-send scenario message if topic info is available
          // This will be handled by the useEffect that watches currentScenario and topicInfo
        }
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
                  const chatHistory = assignedChar.chatHistory || assignedChar.chat_history || assignedChar.messages || [];
                  // Sort chat history by timestamp (ascending - oldest first)
                  const sortedHistory = [...chatHistory].sort((a, b) => {
                    const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
                    const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
                    return timeA - timeB; // Ascending order
                  });
                  setParticipant({
                    ...data,
                    assignedCharacter: assignedChar,
                    chatHistory: sortedHistory
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
  };

  // On Load: Load user data and topic info
  useEffect(() => {
    if (user && !participantLoadedRef.current) {
      participantLoadedRef.current = true; // Prevent multiple calls
      // Call functions directly - they're now regular functions, not useCallback
      loadUserData().catch(err => {
        console.error('Error in loadUserData:', err);
        setLoadingParticipant(false); // Ensure loading state is cleared on error
      });
      loadCurrentTopic().catch(err => {
        console.error('Error in loadCurrentTopic:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only depend on user, functions are stable

  // Set currentCharacterId when assignedAgentId is set (for backward compatibility)
  useEffect(() => {
    if (assignedAgentId && !currentCharacterId) {
      setCurrentCharacterId(String(assignedAgentId));
    }
  }, [assignedAgentId, currentCharacterId]);
  
  // Auto-scroll to bottom when chat history changes or new messages arrive
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated after state changes
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [participant?.chatHistory, loading]);


  // Check for survey eligibility when scenario interaction count reaches 7
  useEffect(() => {
    const checkSurveyAvailability = async () => {
      if (assignedAgentId && currentScenario) {
        const scenarioCount = currentScenario === 'A' ? scenarioAInteractions : scenarioBInteractions;
        const isCompleted = currentScenario === 'A' ? scenarioACompleted : scenarioBCompleted;
        
        if (scenarioCount >= 7 && !isCompleted) {
          // Check survey status from backend
          try {
            const surveyStatus = await getCharacterSurveyStatus(String(assignedAgentId));
            console.log('Survey status check:', surveyStatus);
            if (surveyStatus && surveyStatus.available) {
              setSurveyAvailable(true);
            } else {
              setSurveyAvailable(false);
            }
          } catch (error) {
            console.warn('Failed to check survey status:', error);
            // If status check fails, still allow survey if count is 7+
            setSurveyAvailable(scenarioCount >= 7);
          }
        } else {
          setSurveyAvailable(false);
        }
      }
    };
    
    checkSurveyAvailability();
  }, [assignedAgentId, currentScenario, scenarioAInteractions, scenarioBInteractions, scenarioACompleted, scenarioBCompleted]);

  // Load participant data once when we have assignedAgentId AND assignedAgent
  // Use assignedAgent.name for matching, so wait for both
  useEffect(() => {
    if (assignedAgentId && assignedAgent && user?.email && !participantLoadedRef.current && !loadingParticipant) {
      participantLoadedRef.current = true; // Set immediately to prevent duplicate calls
      
      loadParticipant().catch(err => {
        console.error('[CHAT] Error loading participant data:', err);
        participantLoadedRef.current = false; // Allow retry on error
        setLoadingParticipant(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedAgentId, assignedAgent?.name, user?.email]); // Include assignedAgent.name for proper matching

  // Get chat history for assigned agent
  const getCurrentChatHistory = () => {
    if (!participant) {
      console.error('[CHATBOX ERROR] ❌ No participant data available. Cannot display chat history.');
      console.error('[CHATBOX ERROR] Participant state is:', participant);
      console.error('[CHATBOX ERROR] This means the /mongo/participants/{email} endpoint either failed or returned no data.');
      return [];
    }
    
    // Use chatHistory directly if stored (highest priority)
    if (participant.chatHistory && Array.isArray(participant.chatHistory) && participant.chatHistory.length > 0) {
      // Sort by timestamp in ascending order (oldest first, newest last)
      return [...participant.chatHistory].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        // Return ascending order: oldest messages first, newest at bottom
        return timeA - timeB;
      });
    }
    
    // Fallback: look in assignedCharacter first
    if (participant.assignedCharacter) {
      const chatHistory = participant.assignedCharacter.chatHistory || 
                         participant.assignedCharacter.chat_history || 
                         participant.assignedCharacter.messages || [];
      if (chatHistory.length > 0) {
        return [...chatHistory].sort((a, b) => {
          const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
          const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
          return timeA - timeB;
        });
      }
    }
    
    // Fallback: try to find character by ID in characters array
    if (participant.characters && Array.isArray(participant.characters)) {
      // First try to find by ID match
      let character = participant.characters.find(c => 
        String(c.id) === String(assignedAgentId) || 
        String(c.id) === String(currentCharacterId) ||
        String(c.character_id) === String(assignedAgentId) ||
        String(c.character_id) === String(currentCharacterId)
      );
      
      // If no ID match, find the character with the most chat history
      if (!character) {
        console.warn('[CHATBOX WARNING] ⚠️ Character ID mismatch detected.');
        console.warn('[CHATBOX WARNING] Looking for character ID:', assignedAgentId || currentCharacterId);
        console.warn('[CHATBOX WARNING] Available character IDs in participant data:', participant.characters.map(c => c.id || c.character_id));
        console.warn('[CHATBOX WARNING] Using character with most chat history as fallback.');
        
        character = participant.characters.reduce((prev, current) => {
          const prevHistory = prev?.chatHistory || prev?.chat_history || prev?.messages || [];
          const currentHistory = current?.chatHistory || current?.chat_history || current?.messages || [];
          return currentHistory.length > prevHistory.length ? current : prev;
        }, participant.characters[0]);
      }
      
      // Final fallback: use first character
      if (!character) {
        character = participant.characters[0];
      }
      
      if (character) {
        const chatHistory = character.chatHistory || character.chat_history || character.messages || [];
        if (chatHistory.length > 0) {
          return [...chatHistory].sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
            const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
            return timeA - timeB;
          });
        } else {
          console.error('[CHATBOX ERROR] ❌ Character found but has NO chat history.');
          console.error('[CHATBOX ERROR] Character data:', { id: character.id, name: character.name, hasHistory: false });
        }
      } else {
        console.error('[CHATBOX ERROR] ❌ No character found in participant.characters array.');
        console.error('[CHATBOX ERROR] Participant characters:', participant.characters);
      }
    } else {
      console.error('[CHATBOX ERROR] ❌ Participant data has no characters array.');
      console.error('[CHATBOX ERROR] Participant data structure:', participant);
    }
    
    console.error('[CHATBOX ERROR] ❌ Returning empty chat history. Chatbox will be empty.');
    console.error('[CHATBOX ERROR] Summary:');
    console.error('[CHATBOX ERROR] - Has participant:', !!participant);
    console.error('[CHATBOX ERROR] - Has participant.chatHistory:', !!(participant?.chatHistory && participant.chatHistory.length > 0));
    console.error('[CHATBOX ERROR] - Has participant.assignedCharacter:', !!participant?.assignedCharacter);
    console.error('[CHATBOX ERROR] - Has participant.characters:', !!(participant?.characters && participant.characters.length > 0));
    console.error('[CHATBOX ERROR] - Assigned agent ID:', assignedAgentId);
    console.error('[CHATBOX ERROR] - Current character ID:', currentCharacterId);
    return [];
  };

  // Send Message: Call POST /chat endpoint
  const handleSend = async () => {
    const text = input.trim();
    const charId = displayAgentId || assignedAgentId || currentCharacterId;
    if (!text || !charId || loading || !user) return;
    
    // Check if a scenario is selected
    if (!currentScenario) {
      alert('Please select a scenario from the dropdown first.');
      return;
    }
    
    // Check if survey is required (mandatory before proceeding)
    const scenarioCount = currentScenario === 'A' ? scenarioAInteractions : scenarioBInteractions;
    const isCompleted = currentScenario === 'A' ? scenarioACompleted : scenarioBCompleted;
    
    if (isCompleted) {
      alert(`You have already completed Scenario ${currentScenario}. Please select the other scenario or complete both to advance.`);
      return;
    }
    
    // Check if survey is available but not completed - make it mandatory
    if (scenarioCount >= 7) {
      try {
        const surveyStatus = await getCharacterSurveyStatus(String(charId));
        if (surveyStatus && surveyStatus.available && !surveyStatus.completed) {
          // Survey is available but not completed - open it
          setSurveyCharacterId(String(charId));
          setSurveyCharacterName(assignedAgent?.name || `Agent ${charId}`);
          setSurveyOpen(true);
          alert('You have reached 7 interactions. Please complete the survey to continue.');
          return;
        }
      } catch (surveyError) {
        console.error('Failed to check survey status:', surveyError);
      }
      alert(`You have reached the interaction limit for Scenario ${currentScenario}. Please complete the survey to continue.`);
      return;
    }

    setInput('');
    setLoading(true);

    try {
      // POST /chat - Send message to assigned agent
      const chatResponse = await sendChat(String(charId), text);
      console.log('Chat response:', chatResponse);
      
      // Immediately add user message and agent response to chat history
      const userMessage = {
        sender: 'participant',
        message: text,
        timestamp: new Date().toISOString(),
        role: 'user'
      };
      
      const agentMessage = {
        sender: 'agent',
        message: chatResponse.reply || chatResponse.message || chatResponse.response || 'I understand.',
        timestamp: new Date().toISOString(),
        role: 'assistant'
      };
      
      // Update chat history immediately so messages stay visible
      setParticipant(prev => {
        if (!prev) {
          const newHistory = [userMessage, agentMessage];
          // Sort by timestamp to ensure correct order
          newHistory.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
            const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
            return timeA - timeB; // Ascending order
          });
          return {
            chatHistory: newHistory,
            characters: []
          };
        }
        const existingHistory = prev.chatHistory || [];
        const newHistory = [...existingHistory, userMessage, agentMessage];
        // Sort by timestamp to ensure correct order
        newHistory.sort((a, b) => {
          const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
          const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
          return timeA - timeB; // Ascending order
        });
        return {
          ...prev,
          chatHistory: newHistory
        };
      });
      
      // Scroll to bottom to show new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Increment interaction count for the current scenario
      let newScenarioCount;
      if (currentScenario === 'A') {
        newScenarioCount = scenarioAInteractions + 1;
        setScenarioAInteractions(newScenarioCount);
      } else {
        newScenarioCount = scenarioBInteractions + 1;
        setScenarioBInteractions(newScenarioCount);
      }
      
      // Update main interaction count for display (use scenario-specific count)
      setInteractionCount(newScenarioCount);
      
      // Reload user data from /auth/me to get updated topic and check survey status
      // NOTE: Don't overwrite scenario-specific counts with total message_count from backend
      // The backend's message_count is a total across all scenarios, not per-scenario
      try {
        const userData = await me();
        
        // Update main interaction count from backend (for general display, but scenario counts take precedence)
        const totalCount = userData.message_count || 
          (userData.characters && userData.characters[0]?.message_count) || 
          newScenarioCount;
        setInteractionCount(totalCount);
        
        // DO NOT overwrite scenario-specific counts - they are tracked locally and incremented correctly
        // The scenario counts are what matter for the 7-interaction limit per scenario
        
        // Reload chat history from backend and merge with existing (don't replace)
        try {
          const participantId = localStorage.getItem('participantId') || user?.email;
          if (participantId) {
            const data = await getParticipant(participantId);
            if (data && data.characters) {
              const assignedChar = data.characters.find(c => 
                String(c.id) === String(charId) || 
                String(c.character_id) === String(charId)
              );
              if (assignedChar) {
                const backendHistory = assignedChar.chatHistory || assignedChar.chat_history || assignedChar.messages || [];
                // Sort backend history by timestamp (ascending - oldest first)
                const sortedBackendHistory = [...backendHistory].sort((a, b) => {
                  const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
                  const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
                  return timeA - timeB; // Ascending order
                });
                // Use backend history as source of truth (already sorted)
                setParticipant(prev => ({
                  ...(prev || {}),
                  ...data,
                  assignedCharacter: assignedChar,
                  chatHistory: sortedBackendHistory
                }));
              }
            }
          }
        } catch (participantError) {
          console.warn('Failed to reload participant data:', participantError);
          // Keep existing chat history if reload fails
        }
        
        // Check if survey should be available (when count reaches 7 for current scenario)
        // Use the updated scenario count (already incremented above)
        if (newScenarioCount >= 7) {
          // Check survey status from backend
          try {
            const surveyStatus = await getCharacterSurveyStatus(String(charId));
            console.log('Survey status:', surveyStatus);
            if (surveyStatus && surveyStatus.available) {
              setSurveyAvailable(true);
              // Don't auto-open, let user click button
            } else {
              setSurveyAvailable(false);
            }
          } catch (error) {
            console.warn('Failed to check survey status:', error);
            // If status check fails, still allow survey if count is 7+
            setSurveyAvailable(newScenarioCount >= 7);
          }
        } else {
          setSurveyAvailable(false);
        }
      } catch (error) {
        console.warn('Failed to reload user data after message, but message was sent:', error);
        // Message was sent successfully, just reload participant for chat history
        try {
          const participantId = localStorage.getItem('participantId') || user?.email;
          if (participantId) {
            const data = await getParticipant(participantId);
            if (data && data.characters) {
              const assignedChar = data.characters.find(c => 
                String(c.id) === String(charId) || 
                String(c.character_id) === String(charId)
              );
              if (assignedChar) {
                const backendHistory = assignedChar.chatHistory || assignedChar.chat_history || assignedChar.messages || [];
                // Sort backend history by timestamp (ascending - oldest first)
                const sortedBackendHistory = [...backendHistory].sort((a, b) => {
                  const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
                  const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
                  return timeA - timeB; // Ascending order
                });
                setParticipant(prev => ({
                  ...(prev || {}),
                  ...data,
                  assignedCharacter: assignedChar,
                  chatHistory: sortedBackendHistory
                }));
              }
            }
          }
        } catch (participantError) {
          console.warn('Failed to reload participant data:', participantError);
        }
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
      
      // Handle 403 error - interaction limit reached, survey required
      if (errorMessage.includes('403') || errorMessage.includes('survey') || errorMessage.includes('Please complete') || errorMessage.includes('interaction')) {
        // Lock the input by setting interaction count to 7 (triggers hasReachedLimit)
        if (currentScenario === 'A') {
          setScenarioAInteractions(7);
        } else if (currentScenario === 'B') {
          setScenarioBInteractions(7);
        }
        setInput('');
        
        // Check if survey is available and open it
        if (assignedAgentId && currentScenario) {
          try {
            const surveyStatus = await getCharacterSurveyStatus(String(assignedAgentId));
            if (surveyStatus && surveyStatus.available) {
              // Open survey dialog - survey is mandatory
              setSurveyCharacterId(String(assignedAgentId));
              setSurveyCharacterName(assignedAgent?.name || `Agent ${assignedAgentId}`);
              setSurveyOpen(true);
              setSurveyAvailable(true);
            } else {
              alert('You have reached 7 interactions. Please complete the survey to continue.');
            }
          } catch (surveyError) {
            console.error('Failed to check survey status:', surveyError);
            alert('You have reached 7 interactions. Please complete the survey to continue.');
          }
        } else {
          alert('You have reached 7 interactions. Please complete the survey to continue.');
        }
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
//   };

  const handleKeyDown = (e) => {
    // Use onKeyDown (onKeyPress is deprecated/flaky and can miss preventing default submits)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      try {
        handleSend();
      } catch (err) {
        console.error('handleSend threw from keydown:', err);
      }
    }
  };
  
  const handleSendClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      handleSend();
    } catch (err) {
      console.error('handleSend threw from click:', err);
    }
  };

  // Debug logging
  console.log('[ChatPage] Render state:', {
    loadingParticipant,
    user: !!user,
    assignedAgentId,
    assignedAgent: !!assignedAgent,
    userCharacters: user?.characters
  });

  if (loadingParticipant) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" sx={{ width: '100%', height: '100%' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading chat...</Typography>
      </Box>
    );
  }

  // Check if we have the assigned agent - use fallback values if not loaded yet
  // This prevents blank page if there's a delay in loading
  const displayAgent = assignedAgent || { 
    id: assignedAgentId || user?.characters?.[0]?.id, 
    name: user?.characters?.[0]?.name || `Agent ${assignedAgentId || user?.characters?.[0]?.id || 'Unknown'}`
  };
  const displayAgentId = assignedAgentId || user?.characters?.[0]?.id;
  
  // If we still don't have an agent after user data should be loaded, show error message
  // But allow rendering to continue with fallback values to prevent blank page
  if (!displayAgentId && !loadingParticipant && !user?.characters?.length) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <Box>
            <Typography variant="h6" color="error" align="center">
              No agent assigned
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              Please contact support if you believe this is an error.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }
  
  // Always render the chat interface, even if agent data isn't fully loaded
  // Use fallback values to prevent blank page

  const chatHistory = getCurrentChatHistory();
  
  // Debug logging for chat display
  if (chatHistory.length === 0 && participant) {
    console.error('[CHATBOX ERROR] ❌ Chat history is EMPTY but participant data exists.');
    console.error('[CHATBOX ERROR] This means chat messages exist in backend but are not being extracted correctly.');
    console.error('[CHATBOX ERROR] Participant state:', {
      hasParticipant: !!participant,
      hasCharacters: !!(participant.characters && participant.characters.length > 0),
      hasChatHistory: !!(participant.chatHistory && participant.chatHistory.length > 0),
      hasAssignedCharacter: !!participant.assignedCharacter,
      assignedAgentId: assignedAgentId,
      currentCharacterId: currentCharacterId,
      participantCharacters: participant.characters?.map(c => ({
        id: c.id,
        name: c.name,
        hasHistory: !!(c.chatHistory || c.chat_history || c.messages),
        historyLength: (c.chatHistory || c.chat_history || c.messages || []).length
      }))
    });
  }
  
  // Debug logging for chat display
  if (chatHistory.length === 0 && participant) {
    console.error('[CHATBOX ERROR] Chat history is empty but participant data exists.');
    console.error('[CHATBOX ERROR] Participant state:', {
      hasParticipant: !!participant,
      hasCharacters: !!(participant.characters && participant.characters.length > 0),
      hasChatHistory: !!(participant.chatHistory && participant.chatHistory.length > 0),
      hasAssignedCharacter: !!participant.assignedCharacter,
      assignedAgentId: assignedAgentId,
      currentCharacterId: currentCharacterId,
      participantCharacters: participant.characters?.map(c => ({
        id: c.id,
        name: c.name,
        hasHistory: !!(c.chatHistory || c.chat_history || c.messages),
        historyLength: (c.chatHistory || c.chat_history || c.messages || []).length
      }))
    });
  }
  
  // Use scenario-specific interaction count (not total count)
  const currentScenarioCount = currentScenario === 'A' ? scenarioAInteractions : scenarioBInteractions;
  const hasReachedLimit = currentScenarioCount >= 7;
  // Use assigned agent (one agent per user) - use displayAgent we defined above
  const currentCharacter = displayAgent;

  // Handle survey completion
  const handleSurveyComplete = async (characterId, characterName) => {
    // Mark this character's survey as completed
    setCompletedSurveys(prev => new Set([...prev, String(characterId)]));
    setSurveyAvailable(false); // Survey no longer available after completion
    setSurveyOpen(false); // Close survey dialog
    console.log(`Survey completed for character ${characterId} (${characterName})`);
    
    // Mark current scenario as completed
    if (currentScenario === 'A') {
      setScenarioACompleted(true);
      // Reset interaction count for Scenario A after survey completion
      setScenarioAInteractions(0);
      // Automatically switch to Scenario B after Scenario A is completed
      if (!scenarioBCompleted) {
        setCurrentScenario('B');
        setScenarioAutoSent(false);
        // Auto-select Scenario B
        setTimeout(async () => {
          try {
            await handleScenarioSelect('B');
          } catch (err) {
            console.error('Failed to auto-select Scenario B:', err);
          }
        }, 500);
      }
    } else if (currentScenario === 'B') {
      setScenarioBCompleted(true);
      // Reset interaction count for Scenario B after survey completion
      setScenarioBInteractions(0);
    }
    
    // Reset the interaction limit state so user can continue chatting
    setInteractionCount(0);
    
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
      if (updatedTopicData) {
        setTopicInfo(updatedTopicData.topic_info);
        setCanAdvance(updatedTopicData.can_advance || false);
        
        // Update scenario completion status
        if (typeof updatedTopicData.scenario_a_completed === 'boolean') {
          setScenarioACompleted(updatedTopicData.scenario_a_completed);
        }
        if (typeof updatedTopicData.scenario_b_completed === 'boolean') {
          setScenarioBCompleted(updatedTopicData.scenario_b_completed);
        }
        
        // Update scenarios_completed list
        if (Array.isArray(updatedTopicData.scenarios_completed)) {
          setScenariosCompleted(updatedTopicData.scenarios_completed);
        }
        
        // Check if topic advanced
        if (updatedTopicData.current_topic > previousTopic) {
          setTopicAdvancementMessage(`Topic ${previousTopic} completed! You've advanced to Topic ${updatedTopicData.current_topic}.`);
          // Clear message after 5 seconds
          setTimeout(() => setTopicAdvancementMessage(null), 5000);
          
          // Reset scenario states for new topic
          setCurrentScenario(null);
          setScenarioACompleted(false);
          setScenarioBCompleted(false);
          setScenarioAInteractions(0);
          setScenarioBInteractions(0);
          setScenarioAutoSent(false);
        } else if (updatedTopicData.can_advance) {
          // Both scenarios done but topic hasn't advanced yet (should happen automatically)
          setTopicAdvancementMessage("Both scenarios completed! Topic will advance automatically.");
          setTimeout(() => setTopicAdvancementMessage(null), 5000);
        } else {
          // One scenario done, automatically switch to the next scenario
          if (currentScenario === 'A' && scenarioACompleted) {
            // Scenario A completed, switch to Scenario B
            setCurrentScenario('B');
            setScenarioAutoSent(false);
            // Auto-select Scenario B
            handleScenarioSelect('B').catch(err => {
              console.error('Failed to auto-select Scenario B:', err);
            });
            setTopicAdvancementMessage(`Great! Scenario A completed. Now starting Scenario B: Experiential Loss.`);
            setTimeout(() => setTopicAdvancementMessage(null), 5000);
          } else if (currentScenario === 'B' && scenarioBCompleted) {
            // Scenario B completed, topic should advance
            setTopicAdvancementMessage(`Both scenarios completed! Topic will advance automatically.`);
            setTimeout(() => setTopicAdvancementMessage(null), 5000);
          }
        }
      }
      
      // Reload chat history (preserved, but interaction count reset)
      const agentId = assignedAgentId || userData.characters?.[0]?.id;
      if (agentId) {
        await loadParticipant(String(agentId));
      }
      
      // Reset interaction counts after survey completion so user can continue
      // The backend should reset these, but we'll also reset locally
      if (currentScenario === 'A') {
        setScenarioAInteractions(0);
      } else if (currentScenario === 'B') {
        setScenarioBInteractions(0);
      }
      setInteractionCount(0);
      
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

  // Safety check: ensure we always render something
  if (!user) {
    console.error('[ChatPage] No user provided!');
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">Error: No user data available</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>Please log in again.</Typography>
      </Box>
    );
  }

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
                  scenarioACompleted={scenarioACompleted}
                  scenarioBCompleted={scenarioBCompleted}
                />
                
                {/* Scenario Selector - Shows only current scenario */}
                <Box sx={{ mt: 2 }}>
                  <ScenarioSelector
                    currentScenario={currentScenario}
                    scenarioACompleted={scenarioACompleted}
                    scenarioBCompleted={scenarioBCompleted}
                    scenarioAInteractions={scenarioAInteractions}
                    scenarioBInteractions={scenarioBInteractions}
                    onSelectScenario={handleScenarioSelect}
                    disabled={loading || topicLoading}
                  />
                </Box>
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
                {displayAgent.name || `Agent ${displayAgentId}`}
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
          // Render messages in natural order (oldest first, newest last) - no reverse()
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
                  {(msg.timestamp || msg.created_at || msg.created_at_est) && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        mt: 0.75, 
                        opacity: isUser ? 0.8 : 0.6,
                        fontSize: '0.75rem'
                      }}
                    >
                      {msg.created_at_est 
                        ? msg.created_at_est 
                        : new Date(msg.timestamp || msg.created_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true })
                      }
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

          {/* Survey Button - Shows when survey is available */}
          {hasReachedLimit && surveyAvailable && !completedSurveys.has(String(displayAgentId || assignedAgentId)) && (
            <Paper elevation={2} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: '12px', mx: 3, mb: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" align="center" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  You've completed 7 interactions! Please complete the survey to advance to the next topic.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={async () => {
                    try {
                      // Open survey dialog
                      setSurveyCharacterId(String(displayAgentId || assignedAgentId));
                      setSurveyCharacterName(displayAgent?.name || assignedAgent?.name || `Agent ${displayAgentId || assignedAgentId}`);
                      setSurveyOpen(true);
                    } catch (error) {
                      console.error('Failed to open survey:', error);
                      alert('Failed to open survey. Please try again.');
                    }
                  }}
                  sx={{
                    minWidth: '200px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    py: 1
                  }}
                >
                  Complete Survey
                </Button>
              </Box>
            </Paper>
          )}
          
          {/* Completion Message - Shows when limit reached but survey not yet available */}
          {hasReachedLimit && !surveyAvailable && !completedSurveys.has(String(displayAgentId || assignedAgentId)) && (
            <Paper elevation={1} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: '12px', mx: 3, mb: 1 }}>
              <Typography variant="body2" align="center" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                You've completed 7 interactions! The survey will be available shortly.
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
              onKeyDown={handleKeyDown}
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


}
