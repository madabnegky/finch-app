import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db, appId, signOutUser } from "@finch/shared-logic/api/firebase"; // Changed import

import LoadingScreen from './components/core/LoadingScreen';
import AuthScreen from './components/auth/AuthScreen';
import SetupWizard from './screens/SetupWizard';
import AppLayout from './screens/AppLayout';
import LandingPage from './screens/LandingPage';

function App() {
  const [appState, setAppState] = useState('loading'); // loading, landing, auth, wizard, app
  const [user, setUser] = useState(null);

  useEffect(() => {
    // This is the single source of truth for authentication state.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log("Auth state changed: User is logged in.", currentUser.uid);
        setUser(currentUser); // Set the user object immediately

        // Now, check if they have completed the setup wizard.
        const userDocRef = doc(db, `artifacts/${appId}/users`, currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().setupComplete) {
            console.log("User has completed setup. Navigating to app.");
            setAppState('app');
          } else {
            console.log("User has NOT completed setup. Navigating to wizard.");
            setAppState('wizard');
          }
        } catch (error) {
            console.error("Error fetching user document:", error);
            // If we can't fetch the doc, send them back to the start.
            setAppState('landing');
        }
      } else {
        console.log("Auth state changed: User is logged out.");
        setUser(null);
        setAppState('landing');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // This effect runs only once on startup

  const handleAnonymousSignIn = async () => {
    try {
      await signInAnonymously(auth);
      // onAuthStateChanged will handle navigating to the wizard
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle navigation
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };
  
  const handleSetupComplete = () => {
      // The onAuthStateChanged listener will automatically navigate to 'app'
      // but we can force a state update if needed.
      setAppState('app');
  }

  const handleGoToAuth = () => setAppState('auth');
  const handleGoToLanding = () => setAppState('landing');

  const handleBackFromWizard = async () => {
    await signOutUser();
    // onAuthStateChanged will automatically set appState to 'landing'
  };

  const renderContent = () => {
    if (appState === 'loading') {
      return <LoadingScreen />;
    }
    
    switch (appState) {
      case 'landing':
        return <LandingPage onSignIn={handleGoToAuth} onCreateAccount={handleGoToAuth} onAnonymousSignIn={handleAnonymousSignIn} />;
      case 'auth':
        return <AuthScreen onGoogleSignIn={handleGoogleSignIn} onAnonymousSignIn={handleAnonymousSignIn} onBack={handleGoToLanding} />;
      case 'wizard':
        return <SetupWizard user={user} onComplete={handleSetupComplete} onBack={handleBackFromWizard} />;
      case 'app':
        return <AppLayout user={user} />;
      default:
        // Fallback to the landing page if state is unknown
        return <LandingPage onSignIn={handleGoToAuth} onCreateAccount={handleGoToAuth} onAnonymousSignIn={handleAnonymousSignIn}/>;
    }
  };
  
  return (
    <div className="bg-slate-50 font-sans text-slate-800 min-h-screen">
      {renderContent()}
    </div>
  );
}

export default App;