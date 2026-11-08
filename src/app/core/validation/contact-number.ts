/** Accepts common phone separators while requiring 7–15 actual digits. */
export const CONTACT_NUMBER_PATTERN = /^\+?(?=(?:\D*\d){7,15}\D*$)[0-9() -]{7,19}$/;
