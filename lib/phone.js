// Mirrors backend/src/lib/phone.js so the preview matches what the server will accept.
export function normalizeIndianMobile(input) {
  if (input === null || input === undefined) return { valid: false, reason: 'empty' };
  let digits = String(input).replace(/\.0+$/, '').replace(/\D/g, '');
  if (!digits) return { valid: false, reason: 'empty' };
  if (digits.length === 13 && digits.startsWith('091')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 10) return { valid: false, reason: 'Must be 10 digits' };
  if (!/^[6-9]/.test(digits)) return { valid: false, reason: 'Must start with 6–9' };
  if (/^(\d)\1{9}$/.test(digits)) return { valid: false, reason: 'Repeated digits' };
  return { valid: true, e164: `+91${digits}` };
}
