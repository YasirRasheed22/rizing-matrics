// src/context/AuthContext.tsx
// @ts-nocheck

import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext<any>(null);

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("deviceId");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }

  return deviceId;
};

const getDeviceName = () => {
  return navigator.userAgent || "Unknown Device";
};

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const saveAuth = (authToken: string, authUser: any) => {
    const normalizedUser = {
      ...authUser,
      role: authUser?.role?.toUpperCase(),
    };

    setToken(authToken);
    setUser(normalizedUser);

    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(normalizedUser));

    return normalizedUser;
  };

  const fetchUser = async () => {
    const savedToken = localStorage.getItem("token");

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      setToken(savedToken);

      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      });

      if (res.data?.user) {
        const normalizedUser = {
          ...res.data.user,
          role: res.data.user.role?.toUpperCase(),
        };

        setUser(normalizedUser);

        localStorage.setItem("appTimeZone", JSON.stringify(res.data.appTimezone));
        localStorage.setItem("user", JSON.stringify(normalizedUser));
      }
    } catch (err: any) {
      console.error("Failed to fetch user:", err);

      if (err.response?.status === 401 || err.response?.data?.forceLogout) {
        clearAuth();
      } else {
        clearAuth();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const refetchUser = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  /**
   * Optional login helper.
   * Aapka current LoginForm direct api.post use kar raha hai,
   * lekin future mein agar useAuth().login use karna ho to ye ready hai.
   */
  const login = async (
    email: string,
    password: string,
    forceLogoutAll = false
  ) => {
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
        forceLogoutAll,
        deviceId: getOrCreateDeviceId(),
        deviceName: getDeviceName(),
      });

      if (res.data?.token && res.data?.user) {
        saveAuth(res.data.token, res.data.user);
        return {
          success: true,
          data: res.data,
        };
      }

      return {
        success: false,
        data: res.data,
      };
    } catch (err: any) {
      return {
        success: false,
        status: err.response?.status,
        data: err.response?.data,
      };
    }
  };

  const logout = async (navigate?: any) => {
    try {
      const savedToken = localStorage.getItem("token");

      if (savedToken) {
        await api.post(
          "/auth/logout",
          {},
          {
            headers: { Authorization: `Bearer ${savedToken}` },
          }
        );
      }
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      clearAuth();

      if (navigate) {
        navigate("/login", { replace: true });
      }
    }
  };

  const forceLogoutLocal = (navigate?: any) => {
    clearAuth();

    if (navigate) {
      navigate("/login", { replace: true });
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        clearAuth,
        saveAuth,
        forceLogoutLocal,
        refetchUser,
        isLoading,
        getOrCreateDeviceId,
        getDeviceName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);