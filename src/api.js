export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://virtual-friends-chat.onrender.com";

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// generic HTTP helper
async function http(method, path, body) {
  const url = `${API_BASE}${path}`;
  const headers = authHeaders();
  
  console.log(`[API] ${method} ${url}`, body ? { body } : '');
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[API Error] ${method} ${url} - ${res.status}:`, text);
    throw new Error(`HTTP ${res.status} — ${text}`);
  }
  
  const data = await res.json();
  console.log(`[API Success] ${method} ${url}:`, data);
  return data;
}

// character + chat APIs
export const listCharacters = () => http("GET", "/characters");
// Get only the user's assigned characters
export const getMyCharacters = async () => {
  // Try multiple endpoint variations
  const endpoints = [
    "/characters/my-characters",
    "/api/characters/my-characters",
    "/characters/my",
    "/api/characters/my"
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      const response = await http("GET", endpoint);
      console.log(`Response from ${endpoint}:`, response);
      // Handle both { characters: [...] } and direct array response
      const result = response.characters || response;
      if (Array.isArray(result) && result.length > 0) {
        return result;
      }
    } catch (e) {
      console.log(`Endpoint ${endpoint} failed:`, e.message);
      continue;
    }
  }
  
  // Final fallback: try regular characters endpoint (might be filtered by backend)
  try {
    console.log("Trying fallback: /characters");
    const response = await http("GET", "/characters");
    const result = Array.isArray(response) ? response : (response.characters || []);
    if (result.length > 0) {
      return result;
    }
  } catch (e) {
    console.error("All endpoints failed", e);
  }
  
  return [];
};
// Get specific character details
export const getCharacter = (characterId) => http("GET", `/characters/${characterId}`);
// Get multiple characters by their IDs
export const getCharactersByIds = async (characterIds) => {
  if (!characterIds || characterIds.length === 0) return [];
  
  // Fetch all characters in parallel
  const promises = characterIds.map(id => 
    getCharacter(id).catch(err => {
      console.error(`Failed to fetch character ${id}:`, err);
      return null;
    })
  );
  
  const results = await Promise.all(promises);
  // Filter out any failed requests
  return results.filter(char => char !== null);
};
export const sendChat = (characterId, user_message) =>
  http("POST", "/chat", { character_id: characterId, user_message });

// auth APIs
export const register = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Register failed: ${text}`);
  }
  const data = await res.json();
  // Store assigned characters if returned
  if (data.characters && Array.isArray(data.characters)) {
    localStorage.setItem("assignedCharacters", JSON.stringify(data.characters));
  }
  // Store token if provided in registration response
  if (data.token || data.access_token) {
    localStorage.setItem("token", data.token || data.access_token);
  }
  // Return data including survey_required field
  return data;
};

export const login = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${text}`);
  }
  const data = await res.json();
  localStorage.setItem("token", data.access_token);
  // Return data including survey_required field if present
  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("assignedCharacters");
};

export const me = async () => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Not authenticated");
  const data = await res.json();
  // Store character_ids if returned in user data
  if (data.character_ids && Array.isArray(data.character_ids)) {
    localStorage.setItem("assignedCharacterIds", JSON.stringify(data.character_ids));
  }
  // Also handle if characters array is returned (for backward compatibility)
  if (data.characters && Array.isArray(data.characters)) {
    localStorage.setItem("assignedCharacters", JSON.stringify(data.characters));
    // Extract message_count from each character and store it
    const messageCounts = {};
    data.characters.forEach(char => {
      if (char.id && typeof char.message_count === 'number') {
        messageCounts[char.id] = char.message_count;
      }
    });
    if (Object.keys(messageCounts).length > 0) {
      localStorage.setItem("messageCountsPerCharacter", JSON.stringify(messageCounts));
    }
  }
  // Store survey_required field if present
  if (typeof data.survey_required === 'boolean') {
    // This will be stored in the user object in App.jsx
  }
  return data;
};

// Store assigned characters helper
export const storeAssignedCharacters = (characters) => {
  if (characters && Array.isArray(characters)) {
    localStorage.setItem("assignedCharacters", JSON.stringify(characters));
  }
};

// Password reset APIs
export const forgotPassword = async (email) => {
  console.log(`[API] POST ${API_BASE}/auth/forgot-password`, { email });
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`[API Error] POST /auth/forgot-password - ${res.status}:`, text);
      throw new Error(`HTTP ${res.status} — ${text}`);
    }
    
    const data = await res.json();
    console.log(`[API Success] POST /auth/forgot-password:`, data);
    return data;
  } catch (error) {
    // Handle network errors, CORS errors, etc.
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`[API] Network error:`, error);
      throw new Error('Failed to fetch - Network error or CORS issue. Please check your connection and ensure the backend is configured correctly.');
    }
    throw error;
  }
};

export const verifyResetCode = async (email, code) => {
  console.log(`[API] POST ${API_BASE}/auth/verify-reset-code`, { email, code });
  const res = await fetch(`${API_BASE}/auth/verify-reset-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[API Error] POST /auth/verify-reset-code - ${res.status}:`, text);
    throw new Error(`HTTP ${res.status} — ${text}`);
  }
  const data = await res.json();
  console.log(`[API Success] POST /auth/verify-reset-code:`, data);
  return data;
};

export const resetPassword = async (email, newPassword) => {
  console.log(`[API] POST ${API_BASE}/auth/reset-password`, { email });
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, new_password: newPassword }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[API Error] POST /auth/reset-password - ${res.status}:`, text);
    throw new Error(`HTTP ${res.status} — ${text}`);
  }
  const data = await res.json();
  console.log(`[API Success] POST /auth/reset-password:`, data);
  return data;
};

// Participant APIs
// GET /mongo/participants/{participant_id} - gets or creates participant data
// participant_id can be email address (e.g., "user@example.com") or integer ID (as string)
export const getParticipant = (participantId) => {
  if (!participantId) {
    throw new Error('Participant ID (email) is required');
  }
  // URL encode the participant ID to handle email addresses with special characters
  const encodedId = encodeURIComponent(participantId);
  return http("GET", `/mongo/participants/${encodedId}`);
};

// POST /mongo/participants/message - add messages
export const addMessage = (participantId, characterId, sender, message) => 
  http("POST", "/mongo/participants/message", { 
    participant_id: participantId, 
    character_id: characterId, 
    sender: sender, 
    message: message 
  });

// Survey API
export const getSurveyStatus = () => http("GET", "/survey-status");

// Signup Survey API
export const submitSignupSurvey = (answers) => 
  http("POST", "/auth/signup-survey", {
    q1_ai_chatbot_frequency: answers.q1,
    q2_virtual_character_experience: answers.q2,
    q3_ai_reasoning_belief: answers.q3,
    q4_ai_empathy_belief: answers.q4,
    q5_not_powered_by_ai: answers.q5,
    q6_fields_contributing_to_ai: answers.q6,
    q7_knowledge_representation: answers.q7,
    q8_decision_making_algorithm: answers.q8,
    q9_first_step_ml: answers.q9,
    q10_metadata_example: answers.q10,
    q11_supervised_ml_learning: answers.q11,
    q12_ai_physical_world: answers.q12,
    q13_sensors_perception: answers.q13,
    q14_ai_programmability: answers.q14
  });

export const getSignupSurveyStatus = () => 
  http("GET", "/auth/signup-survey/status");

// Consent API
export const submitConsent = () => 
  http("POST", "/auth/consent");

export const getConsentStatus = () => 
  http("GET", "/auth/consent/status");

// Character Interaction Survey API
export const getCharacterSurveyStatus = (characterId) => 
  http("GET", `/characters/${characterId}/interaction-survey/status`);

export const submitCharacterSurvey = (characterId, answers) => 
  http("POST", `/characters/${characterId}/interaction-survey`, {
    q1_satisfied_help: answers.q1_satisfied_help,
    q2_satisfied_responses: answers.q2_satisfied_responses,
    q3_follow_steps: answers.q3_follow_steps,
    q4_prefer_ai_over_human: answers.q4_prefer_ai_over_human,
    q5_recognized_feelings: answers.q5_recognized_feelings,
    q6_understood_emotions: answers.q6_understood_emotions,
    q7_appropriate_emotional_response: answers.q7_appropriate_emotional_response,
    q8_reduced_negative_emotions: answers.q8_reduced_negative_emotions,
    q9_used_emotional_cues: answers.q9_used_emotional_cues,
    q10_accurate_information: answers.q10_accurate_information,
    q11_effectively_solved: answers.q11_effectively_solved,
    q12_logically_reasoned: answers.q12_logically_reasoned,
    q13_adapted_responses: answers.q13_adapted_responses,
    q14_handled_quickly: answers.q14_handled_quickly,
    q15_felt_realistic: answers.q15_felt_realistic,
    q16_engaged_seriously: answers.q16_engaged_seriously
  });

// Admin APIs
export const getAdminDashboard = () => http("GET", "/admin/dashboard");
export const getAdminConversations = () => http("GET", "/admin/conversations");
export const getAdminConversationMessages = (conversationId) => 
  http("GET", `/admin/conversations/${conversationId}/messages`);
export const getAdminUsers = () => http("GET", "/admin/users/admins");
export const makeUserAdmin = (userId) => http("POST", `/admin/users/${userId}/make-admin`);
export const removeUserAdmin = (userId) => http("POST", `/admin/users/${userId}/remove-admin`);
export const getParticipantChats = (participantId) => 
  http("GET", `/admin/participants/${participantId}/chats`);
