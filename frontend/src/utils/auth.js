// Save logged-in user session
export const loginUser = (token, user) => {
  if (typeof window === "undefined") return;

  // Always use Session Storage to ensure logout on browser close
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(user));

  // Clear local storage to prevent any persistent session conflicts
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  window.dispatchEvent(new Event("auth-change"));
};

// Get logged-in user info
export const getUser = () => {
  if (typeof window === "undefined") return null;

  // Only read from Session Storage
  const sessionUser = sessionStorage.getItem("user");
  if (sessionUser) return JSON.parse(sessionUser);

  return null;
};

// Get auth token
export const getToken = () => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token");
};

// Check if logged in
export const isLoggedIn = () => {
  const token = getToken();
  return !!token;
};

// Logout user
export const logoutUser = () => {
  if (typeof window === "undefined") return;
  // Clear everything to be safe
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  window.dispatchEvent(new Event("auth-change"));
};
