// Validates South African ID numbers (13 digits, Luhn check, valid date)
export function validateSAID(id: string): { valid: boolean; error?: string } {
  if (!/^\d{13}$/.test(id)) return { valid: false, error: "ID must be 13 digits" };
  const yy = parseInt(id.slice(0, 2), 10);
  const mm = parseInt(id.slice(2, 4), 10);
  const dd = parseInt(id.slice(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return { valid: false, error: "Invalid date in ID" };
  // Luhn checksum
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = parseInt(id[i], 10);
    if ((i % 2) === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  if (sum % 10 !== 0) return { valid: false, error: "Invalid ID checksum" };
  void yy;
  return { valid: true };
}
