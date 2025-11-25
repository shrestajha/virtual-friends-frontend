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
  try {
    const response = await http("GET", "/characters/my-characters");
    // Handle both { characters: [...] } and direct array response
    return response.characters || response;
  } catch (e) {
    // Fallback: try alternative endpoint
    try {
      return await http("GET", "/characters/my");
    } catch (e2) {
      console.error("Failed to fetch assigned characters", e2);
      return [];
    }
  }
};
// Get specific character details
export const getCharacter = (characterId) => http("GET", `/characters/${characterId}`);
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
  // Store assigned characters if returned in user data
  if (data.characters && Array.isArray(data.characters)) {
    localStorage.setItem("assignedCharacters", JSON.stringify(data.characters));
  }
  return data;
};

// Store assigned characters helper
export const storeAssignedCharacters = (characters) => {
  if (characters && Array.isArray(characters)) {
    localStorage.setItem("assignedCharacters", JSON.stringify(characters));
  }
};
