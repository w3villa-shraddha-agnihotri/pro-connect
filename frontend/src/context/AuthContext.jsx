
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext(null);

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Fetch signed profile picture URL from backend
  const refreshProfilePicture = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/profile/me`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data.success && data.user) {
        setUser((previousUser) => {
          if (!previousUser) return previousUser;

          return {
            ...previousUser,
            profile_image: data.user.profile_image,
            profile_image_url: data.user.profile_image_url,
          };
        });

        return data.user.profile_image_url;
      }

      return null;
    } catch (error) {
      console.error("Unable to fetch profile picture:", error);
      return null;
    }
  }, []);

  // Update profile picture immediately after upload/removal
  const updateProfilePicture = useCallback((imageData) => {
    setUser((previousUser) => {
      if (!previousUser) return previousUser;

      return {
        ...previousUser,
        profile_image: imageData?.profile_image ?? null,
        profile_image_url: imageData?.profile_image_url ?? null,
      };
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setUser(null);
        return null;
      }

      const data = await response.json();

      if (!data.user) {
        setUser(null);
        return null;
      }

      // First set normal user data
      setUser(data.user);

      // Then retrieve secure Storj image URL
      try {
        const pictureResponse = await fetch(
          `${API_URL}/api/profile/me`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (pictureResponse.ok) {
          const pictureData = await pictureResponse.json();

          if (pictureData.success && pictureData.user) {
            const updatedUser = {
              ...data.user,
              profile_image: pictureData.user.profile_image,
              profile_image_url: pictureData.user.profile_image_url,
            };

            setUser(updatedUser);
            return updatedUser;
          }
        }
      } catch (pictureError) {
        console.error(
          "Unable to load profile picture:",
          pictureError
        );
      }

      return data.user;
    } catch (error) {
      console.error("Unable to fetch user:", error);
      setUser(null);
      return null;
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/subscription`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setHasActiveSubscription(false);
        return false;
      }

      const data = await response.json();
      const isActive = data.active === true;

      setHasActiveSubscription(isActive);
      return isActive;
    } catch (error) {
      console.error("Unable to fetch subscription:", error);
      setHasActiveSubscription(false);
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [refreshUser]);

  useEffect(() => {
    if (loading) return;

    if (user?.role?.toUpperCase() === "CUSTOMER") {
      setSubscriptionLoading(true);
      refreshSubscription();
    } else {
      setHasActiveSubscription(false);
      setSubscriptionLoading(false);
    }
  }, [user, loading, refreshSubscription]);

  const loginUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setHasActiveSubscription(false);
      setSubscriptionLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        loginUser,
        refreshUser,
        logout,

        // Profile picture functionality
        refreshProfilePicture,
        updateProfilePicture,

        // Existing subscription functionality
        hasActiveSubscription,
        subscriptionLoading,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
