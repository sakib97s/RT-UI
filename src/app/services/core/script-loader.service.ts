import {inject, Injectable, PLATFORM_ID} from '@angular/core';
import {DOCUMENT, isPlatformBrowser} from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ScriptLoaderService {

  // Inject
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Google Script
   * loadGoogleGsiScript()
   */
  loadGoogleGsiScript(src: string, id: string): Promise<void> {
    if (!this.isBrowser) {
      return Promise.resolve(); // Return resolved promise for SSR
    }
    
    return new Promise((resolve, reject) => {
      // Check if the script is already loaded
      if (this.document.getElementById(id)) {
        resolve();
        return;
      }

      const script = this.document.createElement('script');
      script.src = src;
      script.id = id;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = (error) => reject(error);

      this.document.body.appendChild(script);
    });
  }

  /**
   * Facebook Script
   * loadPixelScript()
   * loadFacebookPixelNoScript()
   */
  loadGtmScript(gtmId: string): void {
    if (!this.isBrowser) return; // Guard against SSR
    
    // Prevent duplicate GTM script
    if (this.document.getElementById('gtm-script')) return;

    const script = this.document.createElement('script');
    script.id = 'gtm-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    this.document.head.appendChild(script);

    // Initialize dataLayer if not exists
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
  }


  loadGtmNoScript(gtmId: string): void {
    if (!this.isBrowser) return; // Guard against SSR
    
    if (this.document.getElementById('gtm-noscript')) return;

    const noscript = this.document.createElement('noscript');
    noscript.id = 'gtm-noscript';
    const iframe = this.document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);

    // Insert at the top of the body
    this.document.body.insertBefore(noscript, this.document.body.firstChild);
  }


}
