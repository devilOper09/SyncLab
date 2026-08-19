import validator from "validator";

/**
 * Sanitizes and validates a string input.
 * Returns a trimmed string or throws an error if invalid/oversized.
 */
export const validateString = (val, fieldName, options = {}) => {
  const {
    required = false,
    maxLength = 255,
    minLength = 0,
    allowEmpty = true,
    escape = true,
  } = options;

  if (val === undefined || val === null) {
    if (required) {
      throw new Error(`${fieldName} is required.`);
    }
    return "";
  }

  let str = String(val).trim();

  if (str.length === 0) {
    if (required && !allowEmpty) {
      throw new Error(`${fieldName} cannot be empty.`);
    }
    return "";
  }

  if (str.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters.`);
  }

  if (str.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters.`);
  }

  if (escape) {
    str = validator.escape(str);
  }

  return str;
};

/**
 * Validates username format and length.
 */
export const validateUsername = (username) => {
  const clean = validateString(username, "Username", {
    required: true,
    maxLength: 30,
    minLength: 3,
    escape: false, // We will validate format instead of escaping
  });

  // Alphanumeric, underscores, periods
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  if (!usernameRegex.test(clean)) {
    throw new Error("Username can only contain letters, numbers, underscores, and periods.");
  }

  return clean.toLowerCase();
};

/**
 * Validates email format.
 */
export const validateEmail = (email) => {
  if (!email) {
    throw new Error("Email is required.");
  }
  const clean = String(email).trim().toLowerCase();
  if (!validator.isEmail(clean)) {
    throw new Error("Please enter a valid email address.");
  }
  return clean;
};

/**
 * Validates integer IDs.
 */
export const validateId = (id, fieldName = "ID") => {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}.`);
  }
  return parsed;
};

/**
 * Validates visibility options.
 */
export const validateVisibility = (visibility) => {
  if (!visibility) return "public";
  const clean = String(visibility).trim().toLowerCase();
  if (!["public", "private"].includes(clean)) {
    throw new Error("Invalid visibility value.");
  }
  return clean;
};

/**
 * Validates post type.
 */
export const validatePostType = (postType) => {
  if (!postType) {
    throw new Error("Post type is required.");
  }
  const clean = String(postType).trim().toLowerCase();
  if (!["beat", "post"].includes(clean)) {
    throw new Error("Invalid post type.");
  }
  return clean;
};

/**
 * Validates genres array.
 */
export const validateGenres = (genres) => {
  if (!genres) return [];
  if (!Array.isArray(genres)) {
    throw new Error("Genres must be an array.");
  }
  return genres.map(g => validateString(g, "Genre", { maxLength: 50, escape: true }));
};
