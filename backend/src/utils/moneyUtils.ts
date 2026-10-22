export function rupeesToPaise(rupees: number): number {
  return Math.floor(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatCurrency(paise: number): string {
  const rupees = paiseToRupees(paise);
  return '₹' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function validatePaise(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0;
}
