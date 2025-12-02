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
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} — ${text}`);
  }
  return res.json();
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
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Forgot password failed: ${text}`);
  }
  return res.json();
};

export const resetPassword = async (token, newPassword) => {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reset password failed: ${text}`);
  }
  return res.json();
};

// Character and Chat APIs
export const getCharacters = () => http("GET", "/characters");
export const getChatHistory = (characterId) => 
  http("GET", `/chat/${characterId}`);
export const sendChatMessage = (characterId, message) => 
  http("POST", "/chat/send", { character_id: characterId, user_message: message });

// Survey API
export const getSurveyStatus = () => http("GET", "/survey-status");

// Admin APIs
export const getAdminConversations = () => http("GET", "/admin/conversations");
export const getAdminConversationMessages = (conversationId) => 
  http("GET", `/admin/conversations/${conversationId}/messages`);
