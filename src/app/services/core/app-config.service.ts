import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, firstValueFrom} from 'rxjs';
import {isPlatformBrowser} from '@angular/common';
import {PixelService} from './pixel.service';
import {GtmService} from './gtm.service';
import {ScriptLoaderService} from './script-loader.service';


@Injectable({
  providedIn: 'root',
})

export class AppConfigService {

  private config: any;
  private readonly CONFIG_KEY = 'themeConfig'; // LocalStorage key
  private _currency: any;

  private configSubject = new BehaviorSubject<any>(null);
  config$ = this.configSubject.asObservable(); // Expose as Observable

  constructor(
    private http: HttpClient,
    private pixel: PixelService,
    private gtmService: GtmService,
    private scriptLoaderService: ScriptLoaderService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
  }


  get currency(): any {
    return this._currency;
  }


  set currency(currency: any) {
    this._currency = currency;
  }


  /**
   * loadConfig()
   * checkForUpdates()
   * getSettingData()
   */
  async loadConfig(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) { // ✅ Check if it's running in a browser
      const storedConfig = localStorage.getItem(this.CONFIG_KEY);
      if (storedConfig) {
        this.config = JSON.parse(storedConfig);
        this.configSubject.next(this.config);
        // console.log("✅ Loaded theme from LocalStorage:", this.config);
      }
    }

    // নতুন ডাটা চেক করতে API কল করবে
    await this.checkForUpdates();
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const newConfig = await firstValueFrom(this.http.get(`/shop-settings.json?v=${new Date().getTime()}`));

      if (!this.config || JSON.stringify(this.config) !== JSON.stringify(newConfig)) {
        // console.log("🔄 New data found! Updating LocalStorage...");
        this.config = newConfig;
        this.configSubject.next(newConfig); // 🔥 Emit new config data

        if (isPlatformBrowser(this.platformId)) { // ✅ Only update LocalStorage if in browser
          localStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig));
          // location.reload(); // নতুন থিম লোড হবে
        }


      } else {

      }

      // Setup Pixel & Tag Manager
      const analytics = this.getSettingData('analytics');
      const currency = this.getSettingData('currency');

      if (analytics?.facebookPixelId) {
        this.gtmService.facebookPixelId = analytics?.facebookPixelId;
        this.pixel.init(analytics?.facebookPixelId);
      }

      if (analytics?.tagManagerId) {
        this.gtmService.tagManagerId = analytics?.tagManagerId;
        this.scriptLoaderService.loadGtmScript(analytics?.tagManagerId);
        this.scriptLoaderService.loadGtmNoScript(analytics?.tagManagerId);
      }

      if (analytics?.tagManagerId && analytics?.IsManageFbPixelByTagManager) {
        this.gtmService.isManageFbPixelByTagManager = analytics?.IsManageFbPixelByTagManager
      }

      // console.log("apddd currency",currency)

      // Currency
      if (currency) {
        this.currency = currency;
      }


    } catch (error) {
      console.error("⚠️ Error fetching config:", error);
    }
  }

  getSettingData(field: string): any {
    return field ? this.config?.[field] : this.config;
  }

}
