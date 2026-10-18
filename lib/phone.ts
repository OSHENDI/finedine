// Palestinian mobile numbers. People write them many ways (+970 59 123 4567, 00970591234567,
// 0591234567, 059-123-4567); the app stores and copies one plain form: 10 digits starting with 05.

// Turns any common spelling into the plain 10-digit form, or null if it is not a mobile number.
export function normalizeMobile(input: string): string | null {
  let digits = input.replace(/[^0-9]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("970") || digits.startsWith("972")) digits = digits.slice(3);
  if (digits.length === 9 && digits.startsWith("5")) digits = `0${digits}`;
  return /^05[0-9]{8}$/.test(digits) ? digits : null;
}

// 0591234567 -> 059-123-4567, also for a number that is still being typed.
export function formatMobile(digits: string): string {
  const clean = digits.replace(/[^0-9]/g, "").slice(0, 10);
  return [clean.slice(0, 3), clean.slice(3, 6), clean.slice(6, 10)].filter(Boolean).join("-");
}
