import React, { useState, useMemo } from "react";
import { resetPassword } from "./api";

export default function ResetPassword({ token }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password validation for reset (different from signup)
  const passwordValidation = useMemo(() => {
    if (!newPassword) {
      return {
        minLength: null,
        hasUppercase: null,
        hasNumber: null,
        hasSpecialChar: null
      };
    }

    const minLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    return {
      minLength,
      hasUppercase,
      hasNumber,
      hasSpecialChar
    };
  }, [newPassword]);

  const isPasswordValid = passwordValidation.minLength === true &&
    passwordValidation.hasUppercase === true &&
    passwordValidation.hasNumber === true &&
    passwordValidation.hasSpecialChar === true;

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Please ensure all password requirements are met.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      // Redirect to login with success message
      const message = encodeURIComponent("Password reset successfully.");
      window.location.href = `/login?message=${message}`;
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may have expired.");
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ padding: 40, maxWidth: 480, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 32, fontSize: "28px", fontWeight: 700, color: "#1e40af" }}>
        Reset Password
      </h2>

      <form onSubmit={handleSubmit}>
        {/* New Password Field */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)"
          }}>
            New Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                color: "var(--muted)"
              }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          {/* Password Requirements */}
          {newPassword && (
            <div style={{ marginTop: "12px" }}>
              <div style={{
                background: "#f9fafb",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "13px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  color: passwordValidation.minLength ? "#16a34a" : "#dc2626"
                }}>
                  <span>{passwordValidation.minLength ? "✓" : "✗"}</span>
                  <span>At least 8 characters</span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  color: passwordValidation.hasUppercase ? "#16a34a" : "#dc2626"
                }}>
                  <span>{passwordValidation.hasUppercase ? "✓" : "✗"}</span>
                  <span>At least 1 uppercase letter</span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  color: passwordValidation.hasNumber ? "#16a34a" : "#dc2626"
                }}>
                  <span>{passwordValidation.hasNumber ? "✓" : "✗"}</span>
                  <span>At least 1 number</span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: passwordValidation.hasSpecialChar ? "#16a34a" : "#dc2626"
                }}>
                  <span>{passwordValidation.hasSpecialChar ? "✓" : "✗"}</span>
                  <span>At least 1 special character</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)"
          }}>
            Confirm Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: "100%",
                paddingRight: "40px",
                borderColor: confirmPassword && !passwordsMatch ? "#dc2626" : undefined
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                color: "var(--muted)"
              }}
            >
              {showConfirmPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <div style={{ color: "#dc2626", fontSize: "13px", marginTop: "4px" }}>
              Passwords do not match
            </div>
          )}
          {confirmPassword && passwordsMatch && (
            <div style={{ color: "#16a34a", fontSize: "13px", marginTop: "4px" }}>
              ✓ Passwords match
            </div>
          )}
        </div>

        <button
          type="submit"
          className="button"
          style={{ width: "100%" }}
          disabled={loading || !isPasswordValid || !passwordsMatch}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      {error && (
        <div className="hint" style={{ color: "red", marginTop: "12px", textAlign: "center" }}>
          {error}
        </div>
      )}
    </div>
  );
}

