import React, { createContext, useContext, useState, useMemo } from 'react';

// 1. Create the AuthContext
// This initializes the context that will hold the authentication state.
const AuthContext = createContext();

/**
 * 2. AuthProvider Component
 * This component wraps the parts of your application that need authentication access.
 * It manages the user state (login/logout) and provides it via the context.
 */
export const AuthProvider = ({ children }) => {
  // State to store the current user object. It starts as 'null' (logged out).
  const [user, setUser] = useState(null);
  // State to manage loading status during login/logout processes.
  const [loading, setLoading] = useState(false);

  /**
   * Login Function (Placeholder)
   * This is where you would eventually make an API call to your server.
   */
  const login = (username, password) => {
    console.log("Attempting login for:", username);
    setLoading(true);

    // Simulate a delay for an API call
    setTimeout(() => {
      // Assuming success, we update the user state with dummy data.
      setUser({ id: "1", username: username, email: `${username}@example.com` });
      setLoading(false);
      console.log("Login successful");
    }, 1000);
  };

  /**
   * Logout Function (Placeholder)
   */
  const logout = () => {
    console.log("Logging out");
    // Clear the user state back to null.
    setUser(null);
  };

  // useMemo optimizes performance. It ensures that the 'value' object provided
  // to the context only recalculates when 'user' or 'loading' changes.
  const value = useMemo(() => ({
    user,
    login,
    logout,
    loading,
    // A handy boolean check: true if 'user' is not null, false otherwise.
    isAuthenticated: !!user,
  }), [user, loading]);

  // Provide the value to all children components.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 3. useAuth Hook
 * This is the custom hook that allows components to easily access the AuthContext.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  // A helpful error check: If this hook is used outside of the AuthProvider,
  // it will throw an error, making debugging easier.
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};