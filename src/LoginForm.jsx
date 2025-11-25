import React, { useState } from "react";
import { login, register } from "./api";

export default function LoginForm({ onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [assignedCharacter, setAssignedCharacter] = useState(null); // <-- new state

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(email, password);
        setError("");
        onSuccess();
      } else {
        // Sign up and get assigned characters
        const res = await register(email, password);
        // Store assigned characters in localStorage
        if (res.characters && Array.isArray(res.characters)) {
          localStorage.setItem("assignedCharacters", JSON.stringify(res.characters));
        }
        // If your backend returns character info:
        if (res.character) {
          setAssignedCharacter(res.character);
        } else if (res.characters && Array.isArray(res.characters) && res.characters.length > 0) {
          // If backend returns multiple characters, show the first one
          setAssignedCharacter(res.characters[0]);
        } else {
          // fallback — auto-login if no character in response
          await login(email, password);
          onSuccess();
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  // Show assigned character screen after signup
  if (assignedCharacter) {
    return (
      <div className="panel" style={{ padding: 32, maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
        <h2 style={{ marginBottom: 16, fontSize: "24px", fontWeight: 600 }}>Welcome to Virtual Friends!</h2>
        <p style={{ marginBottom: 20, color: "var(--muted)" }}>You've been paired with:</p>
        <div
          className="character-card"
          style={{
            textAlign: "left",
            marginTop: "12px",
          }}
        >
          <h3 style={{ marginBottom: 12, fontSize: "20px", fontWeight: 600 }}>{assignedCharacter.name}</h3>
        </div>
        <button
          className="button"
          style={{ marginTop: 24, width: "100%" }}
          onClick={async () => {
            await login(email, password);
            onSuccess();
          }}
        >
          Start Chatting
        </button>
      </div>
    );
  }

  // Default login/register form
  return (
    <div className="panel" style={{ padding: 32, maxWidth: 400, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 24, fontSize: "24px", fontWeight: 600 }}>
        {mode === "login" ? "Log In" : "Create Account"}
      </h2>

      <form onSubmit={handleSubmit}>
        <input
          className="input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={128}
        />

        <button type="submit" className="button" style={{ width: "100%" }}>
          {mode === "login" ? "Log In" : "Sign Up"}
        </button>
      </form>

      {error && <div className="hint" style={{ color: "red" }}>{error}</div>}

      <div className="hint" style={{ marginTop: 12, textAlign: "center" }}>
        {mode === "login" ? (
          <>
            Don’t have an account?{" "}
            <span className="link" onClick={() => setMode("register")}>
              Sign up
            </span>
          </>
        ) : (
          <>
            Already registered?{" "}
            <span className="link" onClick={() => setMode("login")}>
              Log in
            </span>
          </>
        )}
      </div>
    </div>
  );
}
