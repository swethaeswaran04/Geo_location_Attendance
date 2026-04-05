import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "jwt_token";
const isWeb = Platform.OS === "web";

export const saveToken = (token) => {
  if (isWeb) { localStorage.setItem(TOKEN_KEY, token); return Promise.resolve(); }
  return SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = () => {
  if (isWeb) return Promise.resolve(localStorage.getItem(TOKEN_KEY));
  return SecureStore.getItemAsync(TOKEN_KEY);
};

export const removeToken = () => {
  if (isWeb) { localStorage.removeItem(TOKEN_KEY); return Promise.resolve(); }
  return SecureStore.deleteItemAsync(TOKEN_KEY);
};

// Decode JWT payload without a library (works on web + native)
export const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const getTokenRole = async () => {
  const token = await getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.role ?? null;
};
