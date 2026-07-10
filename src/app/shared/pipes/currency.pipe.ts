import {inject, Pipe, PipeTransform} from '@angular/core';
import {AppConfigService} from "../../services/core/app-config.service";

@Pipe({
  standalone: true,
  name: 'currencyCtr'
})
export class CurrencyCtrPipe implements PipeTransform {

  // Inject
  private appConfigService = inject(AppConfigService);

  // transform(value: number, key?: 'code' | 'symbol' | 'name'): string {
  //   if (typeof value !== 'number') {
  //     return '';
  //   }
  //
  //   // Fetch currency from AppConfigService
  //   const currency = this.appConfigService.currency;
  //
  //   console.log('pipe currency', currency);
  //
  //   // Default key is 'symbol' if no key is provided
  //   const defaultKey: 'code' | 'symbol' | 'name' = key || 'symbol';
  //
  //   // Define default currency object
  //   const defaultCurrency = {
  //     code: 'BDT',
  //     name: 'Bangladesh',
  //     symbol: '৳'
  //   };
  //
  //   // Use fetched currency or fallback to default currency
  //   const currencyData = currency && Object.keys(currency).length ? currency : defaultCurrency;
  //
  //   // Format the number with the currency symbol
  //   return `${currencyData[defaultKey] || defaultCurrency[defaultKey]} ${value}`;
  // }

  transform(value: any, key?: 'code' | 'symbol' | 'name'): string {
    // ✅ যদি value না থাকে
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // ✅ number না হলে কনভার্ট করার চেষ্টা
    if (typeof value !== 'number') {
      try {
        value = Number(value);
        if (isNaN(value)) throw new Error('Invalid number');
      } catch {
        return '0';
      }
    }

    // ✅ currency ডেটা ফেচ করা AppConfigService থেকে
    const currency = this.appConfigService.currency;

    // Default key symbol
    const defaultKey: 'code' | 'symbol' | 'name' = key || 'symbol';

    // ✅ Default fallback currency
    const defaultCurrency = {
      code: 'BDT',
      name: 'Bangladesh',
      symbol: '৳'
    };

    // ✅ Fallback if currency not found
    const currencyData =
      currency && Object.keys(currency).length ? currency : defaultCurrency;

    // ✅ সংখ্যাটাকে format করা (e.g., 123456 → 1,23,456)
    const formattedValue = value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    // ✅ Return formatted currency with symbol/code/name
    return `${currencyData[defaultKey] || defaultCurrency[defaultKey]} ${formattedValue}`;
  }

}
