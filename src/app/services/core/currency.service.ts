import { Injectable, signal } from '@angular/core';

export interface Currency { code: string; symbol: string; rate: number; }

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  currencies: Currency[] = [
    { code: 'EUR', symbol: '€', rate: 1 },
    { code: 'USD', symbol: '$', rate: 1.09 },
    { code: 'GBP', symbol: '£', rate: 0.86 },
    { code: 'BDT', symbol: '৳', rate: 120 },
  ];

  current = signal<Currency>(this.currencies[0]);

  setCurrency(code: string) {
    const found = this.currencies.find(c => c.code === code);
    if (found) this.current.set(found);
  }

  format(priceInEur: number): string {
    const cur = this.current();
    return `${cur.symbol}${(priceInEur * cur.rate).toFixed(0)}`;
  }
}
