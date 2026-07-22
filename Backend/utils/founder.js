export const FOUNDER_EMAIL = "harshit.music19@gmail.com";

export const normalizeEmail = (email) => email?.trim().toLowerCase() || "";

export const isFounderEmail = (email) => normalizeEmail(email) === FOUNDER_EMAIL;
