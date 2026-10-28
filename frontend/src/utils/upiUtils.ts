export function buildUpiLink(params: {
  upiId: string;
  name: string;
  amountPaise: number;
  note: string;
}): string {
  const amountRupees = (params.amountPaise / 100).toFixed(2);
  const encodedNote = encodeURIComponent(params.note);
  const encodedName = encodeURIComponent(params.name);
  return `upi://pay?pa=${params.upiId}&pn=${encodedName}&am=${amountRupees}&cu=INR&tn=${encodedNote}`;
}

export function isValidUpiId(upiId: string): boolean {
  return upiId.includes('@') && upiId.length > 3;
}
