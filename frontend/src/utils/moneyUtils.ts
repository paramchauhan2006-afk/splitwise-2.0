export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return '₹' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

export function rupeesToPaise(rupees: string): number {
  return Math.floor(parseFloat(rupees) * 100);
}
