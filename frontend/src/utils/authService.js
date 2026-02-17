// Handles account creation and validation

export const isUserExists = (email) => {
  const user = JSON.parse(localStorage.getItem("event_user"));
  return user && user.email === email;
};

export const createAccount = (email, password) => {
  localStorage.setItem(
    "event_user",
    JSON.stringify({
      email,
      password: btoa(password),
      role: "ADMIN",
    })
  );
};

export const validateLogin = (email, password) => {
  const user = JSON.parse(localStorage.getItem("event_user"));

  if (!user) {
    return { success: false, message: "Account not found. Please sign up." };
  }

  if (email !== user.email || btoa(password) !== user.password) {
    return { success: false, message: "Invalid email or password" };
  }

  return { success: true, user };
};
