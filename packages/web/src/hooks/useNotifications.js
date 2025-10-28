import { getMessaging, getToken } from "firebase/messaging";
// FIX: Changed to a default import to correctly get the 'api' object.
import api from "@shared/api/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuth } from "@shared/hooks/useAuth";

const useNotifications = () => {
  const { user } = useAuth();

  const requestPermission = async () => {
    if (!user) {
      console.error("User must be logged in to request notification permission.");
      return;
    }

    try {
      // FIX: Use api.app and api.firestore from the imported object
      const messaging = getMessaging(api.app);
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('Notification permission granted.');

        const vapidKey = "BImroXZSOaKB5YhzQv_Wak20HC0aSSvG2v00nuAY2xd4m2sxg8TLJ8I7dELw7at_7wAFPIlJma0VXPW6Ojt2Ja0";
        const currentToken = await getToken(messaging, { vapidKey });

        if (currentToken) {
          // Only log token in development
          if (import.meta.env.DEV) {
            console.log('FCM Token:', currentToken);
          }
          const userDocRef = doc(api.firestore, 'users', user.uid);
          await updateDoc(userDocRef, {
            fcmTokens: arrayUnion(currentToken)
          });
          alert("Notifications have been enabled!");
        } else {
          console.log('No registration token available.');
        }
      } else {
        console.log('Unable to get permission to notify.');
        alert("Notification permission was denied.");
      }
    } catch (error) {
      console.error("An error occurred while requesting permission: ", error);
    }
  };

  return { requestPermission };
};

export default useNotifications;