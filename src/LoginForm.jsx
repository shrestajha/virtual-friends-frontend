import React, { useState, useEffect, useMemo } from "react";
import { login, register } from "./api";

/* ------------------ Helpers ------------------ */

function getPasswordValidation(password, email) {
  if (!password) {
    return {
      doesNotContainEmail: null,
      minLength: null,
      hasNumberOrSymbol: null,
      strength: null,
    };
  }

  const emailLower = email.toLowerCase().trim();
  const emailLocal = emailLower.split("@")[0];
  const containsEmail =
    email &&
    (password.toLowerCase().includes(emailLower) ||
      password.toLowerCase().includes(emailLocal));

  const minLength = password.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*]/.test(password);
  const doesNotContainEmail = !containsEmail;

  const passed = [minLength, hasNumberOrSymbol, doesNotContainEmail].filter(
    Boolean
  ).length;

  const strength =
    passed === 3 ? "strong" : passed >= 2 ? "medium" : "weak";

  return {
    doesNotContainEmail,
    minLength,
    hasNumberOrSymbol,
    strength,
  };
}

/* ------------------ Component ------------------ */

export default function LoginForm({
  onSuccess,
  onSurveyRequired,
  initialMode = "register",
  loginMessage = "",
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(loginMessage);

  /* Sync mode + success message with props */
  useEffect(() => {
    setMode(initialMode);
    setEmail("");
    setPassword("");
    setError("");
  }, [initialMode]);

  useEffect(() => {
    if (loginMessage) setSuccessMessage(loginMessage);
  }, [loginMessage]);

  /* Password validation */
  const passwordValidation = useMemo(
    () => getPasswordValidation(password, email),
    [password, email]
  );

  const isPasswordValid =
    passwordValidation.doesNotContainEmail &&
    passwordValidation.minLength &&
    passwordValidation.hasNumberOrSymbol;

  /* ------------------ Submit ------------------ */

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (mode === "login") {
        const data = await login(email, password);

        if (data.survey_required && onSurveyRequired) {
          onSurveyRequired();
        } else {
          onSuccess();
        }
        return;
      }

      if (!isPasswordValid) {
        setError("Please meet all password requirements.");
        return;
      }

      const res = await register(email, password);

      if (Array.isArray(res.characters)) {
        localStorage.setItem(
          "assignedCharacters",
          JSON.stringify(res.characters)
        );
      }

      await login(email, password);

      if (res.survey_required && onSurveyRequired) {
        onSurveyRequired();
      } else {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  }

  /* ------------------ Shared UI ------------------ */

  const PasswordInput = () => (
    <div style={{ position: "relative" }}>
      <input
        className="input"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        style={{ width: "100%", paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShowPassword((p) => !p)}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
        }}
      >
        {showPassword ? "🙈" : "👁️"}
      </button>
    </div>
  );

  /* ------------------ Login ------------------ */

  if (mode === "login") {
    return (
      <div className="panel" style={{ maxWidth: 400, margin: "40px auto" }}>
        <h2 style={{ textAlign: "center" }}>Log In</h2>

        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />

          <PasswordInput />

          <button className="button" style={{ width: "100%" }}>
            Log In
          </button>
        </form>

        {successMessage && (
          <div className="success">{successMessage}</div>
        )}
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  /* ------------------ Register ------------------ */

  return (
    <div className="panel" style={{ maxWidth: 480, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center" }}>Sign Up</h2>

      <form onSubmit={handleSubmit}>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />

        <PasswordInput />

        {password && (
          <p>
            Strength: <b>{passwordValidation.strength}</b>
          </p>
        )}

        <button
          className="button"
          disabled={!isPasswordValid}
          style={{ width: "100%" }}
        >
          Sign Up
        </button>
      </form>

      {error && <div className="error">{error}</div>}
    </div>
  );
}
