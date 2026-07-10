import {Injectable} from '@angular/core';
import moment from 'moment';
import sha256 from 'crypto-js/sha256';
import {PixelUserData} from '../../interfaces/core/analytics.interface';


@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  getNextDateString(date: Date, day) {
    return moment(date).add(day, 'days').toDate();
  }

  getDateString(date: Date, format?: string): string {
    const fm = format ? format : 'YYYY-MM-DD';
    return moment(date).format(fm);
  }

  removeUrlQuery(url: string): string {
    if (url) {
      return url.replace(/\?.*/, '');
    }
    return '';
  }

  stringToSlug(value: string): string {
    let text = value?.toLowerCase();
    if (text?.charAt(0) == " ") {
      text = text.trim();
    }
    if (text?.charAt(text.length - 1) == "-") {
      text = (text?.replace(/-/g, ""));
    }
    text = text?.replace(/ +/g, "");
    text = text?.replace(/--/g, "");
    text = text?.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // Note: Normalize('NFKD') used to normalize special alphabets like óã to oa
    text = text?.replace(/[^a-zA-Z0-9 -]/g, "");

    return text;
  }

  numbersToRangeStrings(numbers: number[]) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    if (min !== max) {
      return `${min}-${max}`;
    } else {
      return `${min}`;
    }


  }

  routeBaseVisibility(currentUrl: string) {
    switch (currentUrl) {
      case '/':
        return true;
      default:
        return false;
    }
  }

  getImageName(originalName: string): string {
    const array = originalName.split('.');
    array.pop();
    return array.join('');
  }

  getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  roundNumber(num: number): number {
    const integer = Math.floor(num);
    const fractional = num - integer;

    //Converting the fractional to the integer
    const frac2int = (fractional * 100) / 5;
    const fracCeil = Math.ceil(frac2int);

    //transforming inter into fractional
    const FracOut = (fracCeil * 5) / 100;
    const ans = integer + FracOut;

    return Number((Math.round(ans * 100) / 100).toFixed(2));
  }

  /**
   * Hash Data
   * SHA256 hashing Format
   * hashDataSha256()
   * formatPhoneNumber()
   */

  // 1) Stronger eventId
  generateEventId(): string {
    if (typeof window !== 'undefined' && 'crypto' in window && (window.crypto as any).getRandomValues) {
      const a = new Uint32Array(3);
      window.crypto.getRandomValues(a);
      return [Date.now().toString(36), ...a].map(n => n.toString(36)).join('');
    }
    return (Date.now().toString(36) + Math.random().toString(36).slice(2));
  }

// 2) Safe BD phone normalize (E.164 without '+', e.g. 8801XXXXXXXXX)
  private normalizeBdPhone(raw?: string): string | undefined {
    if (!raw) return undefined;
    let p = (raw + '').replace(/\D/g, ''); // keep digits

    // Strip leading 00 (e.g., 0088017… -> 88017…)
    if (p.startsWith('00')) p = p.slice(2);

    // If starts with + removed earlier, so now handle 880 / 88 / 0
    if (p.startsWith('880')) return p;
    if (p.startsWith('88')) return '880' + p.slice(2);

    // Local BD numbers usually 11 digits starting with 01
    if (p.startsWith('0') && p.length >= 11) return '880' + p.slice(1);

    // Fallback: if it already looks like 1XXXXXXXXX, assume local and prefix 880
    if (p.length === 10 || p.length === 11) return p.startsWith('1') ? ('880' + p) : p;

    return p;
  }

// 3) Text normalizer for ct/st/zp
  private normText(value?: string): string | undefined {
    if (!value) return undefined;
    const v = value
      .trim()
      .toLowerCase()
      .normalize('NFKD')               // strip diacritics
      .replace(/[\u0300-\u036f]/g, '') // combining marks
      .replace(/\s+/g, ' ');
    return v;
  }

// 4) DOB normalizer -> YYYYMMDD (digits only), then hash upstream
  private normDob(value?: string): string | undefined {
    if (!value) return undefined;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) return digits; // already YYYYMMDD
    // try to rescue common YYYYMMDD / YYYY-MM-DD / YYYY/MM/DD
    // if not 8 digits after strip, give up
    return digits.length === 8 ? digits : undefined;
  }

// 5) Safer cookie reader + optional setter for _fbc when fbclid present
  getFbCookies(): { fbp?: string; fbc?: string } {
    const out: { fbp?: string; fbc?: string } = {};
    try {
      const cookieStr = document.cookie || '';
      const jar: Record<string, string> = {};
      cookieStr.split(';').forEach(pair => {
        const trimmed = pair.trim();
        if (!trimmed) return;
        const eq = trimmed.indexOf('=');
        if (eq === -1) return;
        const k = trimmed.slice(0, eq);
        const v = trimmed.slice(eq + 1);
        jar[k] = decodeURIComponent(v);
      });

      if (jar['_fbp']) out.fbp = jar['_fbp'];

      // Validate fbc cookie - check if expired (90 days)
      if (jar['_fbc'] && jar['_fbc'].startsWith('fb.1.')) {
        const fbcParts = jar['_fbc'].split('.');
        if (fbcParts.length >= 3) {
          const timestamp = parseInt(fbcParts[2]);
          if (!isNaN(timestamp)) {
            const now = Date.now();
            const daysDiff = (now - timestamp) / (1000 * 60 * 60 * 24);
            
            // Only use fbc if less than 90 days old
            if (daysDiff < 90) {
              out.fbc = jar['_fbc'];
            }
            // If expired, don't include it - will create new one below if fbclid present
          } else {
            // Invalid timestamp format, use as is (fallback)
            out.fbc = jar['_fbc'];
          }
        } else {
          // Invalid format, use as is (fallback)
          out.fbc = jar['_fbc'];
        }
      }
      
      // If no valid fbc found, check for fbclid in URL to create new one
      if (!out.fbc) {
        const url = new URL(location.href);
        const fbclid = url.searchParams.get('fbclid');
        if (fbclid) {
          const val = `fb.1.${Date.now()}.${fbclid}`;
          out.fbc = val;

          // Set cookie for 90 days
          try {
            const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `_fbc=${encodeURIComponent(val)}; Path=/; Expires=${expires}; SameSite=Lax`;
          } catch {}
        }
      }
    } catch {}
    return out;
  }

// 6) Hash helper (unchanged logic OK), but make sure you call on normalized strings only.
  hashDataSha256(value: string): string {
    return sha256(value.trim().toLowerCase()).toString();
  }

// 7) Final user_data
  getUserData(pixelUserData: PixelUserData): {
    em?: string; ph?: string; fn?: string; ln?: string; ct?: string;
    country?: string; st?: string; zp?: string; db?: string;
    external_id?: string; fbp?: string; fbc?: string;
  } {
    const { email, phoneNo, firstName, lastName, dob, city, zip, external_id, state, country } = pixelUserData;
    const user_data: any = {};

    if (email) user_data.em = this.hashDataSha256(email);
    const normalizedPhone = this.normalizeBdPhone(phoneNo);
    if (normalizedPhone) user_data.ph = this.hashDataSha256(normalizedPhone);

    const fn = this.normText(firstName);
    const ln = this.normText(lastName);
    const ct = this.normText(city);
    const st = this.normText(state);
    const zp = zip ? (zip + '').trim().toLowerCase() : undefined;
    const cc = (country || 'bd').trim().toLowerCase();

    if (fn) user_data.fn = this.hashDataSha256(fn);
    if (ln) user_data.ln = this.hashDataSha256(ln);
    if (ct) user_data.ct = this.hashDataSha256(ct);
    if (st) user_data.st = this.hashDataSha256(st);
    if (zp) user_data.zp = this.hashDataSha256(zp);

    const d = this.normDob(dob);
    if (d) user_data.db = this.hashDataSha256(d);

    user_data.country = this.hashDataSha256(cc); // e.g., 'bd'

    if (external_id) user_data.external_id = this.hashDataSha256(external_id);

    Object.assign(user_data, this.getFbCookies()); // fbp/fbc raw (no hash)

    return user_data;
  }



}
