// src/api/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "https://api.rizingmatrics.com",
  // ✅ REQUIRED for ngrok free-tier tunnels: without this header, ngrok serves
  // an HTML browser-warning page (status 200, no CORS headers)
  // instead of forwarding to the backend, which causes the CORS error
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const forceLogout = error?.response?.data?.forceLogout;

    if (status === 401 && forceLogout) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (!window.location.hash.includes("/login")) {
        window.location.replace("/#/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;