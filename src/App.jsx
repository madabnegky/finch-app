import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, GoogleAuthProvider, getRedirectResult, signInWithRedirect } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db, appId } from "./api/firebase";

import LoadingScreen from './components/core/LoadingScreen';
import AuthScreen from './components/auth/AuthScreen';
import SetupWizard from './screens/SetupWizard';
import AppLayout from './screens/AppLayout';

function App() {
  const [authState, setAuthState] = useState({ user: null, loading: true, hasData: false });
  const [appState, setAppState] = useState('loading'); // loading, auth, wizard, app
  
  // NEW: State to ensure we wait for any redirect to finish
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  useEffect(() => {
    getRedirectResult(auth)
      .catch((error) => {
        console.error("Error processing redirect result:", error);
      })
      .finally(() => {
        // This 'finally' block runs after the redirect is processed.
        // Now we are safe to listen for auth changes.
        setIsProcessingRedirect(false);
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const userDoc = await getDoc(userDocRef);
            const hasData = userDoc.exists() && userDoc.data().setupComplete;
            setAuthState({ user, loading: false, hasData });
            setAppState(hasData ? 'app' : 'wizard');
          } else {
            setAuthState({ user: null, loading: false, hasData: false });
            setAppState('auth');
          }
        });
        return () => unsubscribe();
      });
  }, []);

  const handleAnonymousSignIn = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };
  
  const handleSetupComplete = () => {
      setAuthState(prev => ({...prev, hasData: true }));
      setAppState('app');
  }

  const renderContent = () => {
    // If we are processing the redirect, show a loading screen
    if (isProcessingRedirect) {
        return <LoadingScreen />;
    }

    switch (appState) {
      case 'loading':
        return <LoadingScreen />;
      case 'auth':
        return <AuthScreen onAnonymousSignIn={handleAnonymousSignIn} onGoogleSignIn={handleGoogleSignIn} />;
      case 'wizard':
        return <SetupWizard user={authState.user} onComplete={handleSetupComplete} />;
      case 'app':
        return <AppLayout user={authState.user} />;
      default:
        return <AuthScreen onAnonymousSignIn={handleAnonymousSignIn} onGoogleSignIn={handleGoogleSignIn} />;
    }
  };
  
  return (
    <div className="bg-slate-50 font-sans text-slate-800 min-h-screen">
      {renderContent()}
    </div>
  );
}

export default App;