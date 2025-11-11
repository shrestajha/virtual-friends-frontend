import React, { useState } from "react";
import { login, register } from "./api";

export default function LoginForm({ onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
        await login(email, password);
      }
      setError("");
      onSuccess();
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="panel" style={{ padding: 24, maxWidth: 400, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center" }}>
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
            <br />
            <span
              className="link"
              onClick={() =>
                alert(
                  "If you forgot your password, please contact your instructor or site admin."
                )
              }
            >
              Forgot password?
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
