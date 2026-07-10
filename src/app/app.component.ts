import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UtilsService } from './services/core/utils.service';
import { AppConfigService } from './services/core/app-config.service';
import { UserService } from './services/common/user.service';
import { ThemeViewSetting } from './interfaces/common/setting.interface';
import { isPlatformBrowser } from "@angular/common";
import { Title } from "@angular/platform-browser";
import { GtmPageView } from "./interfaces/core/gtm.interface";
import { GtmService } from "./services/core/gtm.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  // Theme Settings
  headerViews: string;
  bottomNavViews: string;
  private eventId: string;

  // Store Data
  currentUrl: string = '/';
  showFooter: boolean = true;


  // Inject
  private readonly appConfigService = inject(AppConfigService);
  private readonly router = inject(Router);
  private readonly utilsService = inject(UtilsService);
  private readonly userService = inject(UserService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly titleService = inject(Title);
  private readonly gtmService = inject(GtmService);
  private readonly activatedRoute = inject(ActivatedRoute);

  // Subscriptions
  private subscriptions: Subscription[] = [];


  ngOnInit(): void {

    // Base
    this.getSettingData();
    this.userService.autoUserLoggedIn();
    this.userService.getUserDataFromLocal();

    // Api Data
    if (isPlatformBrowser(this.platformId)) {
      this.setColorVariable();
    }

    // On change route
    this.onChangeRouterEvent();

    // Check Query Param for Affiliate
    this.checkActivateQueryParam();

    // Track
    if (isPlatformBrowser(this.platformId)) {
      this.trackPageViewEvent();
    }

  }


  /**
   * Initial Landing Page Setting
   * getSettingData()
   */

  private getSettingData() {
    const themeViewSettings: ThemeViewSetting[] = this.appConfigService.getSettingData('themeViewSettings');
    this.headerViews = themeViewSettings.find(f => f.type == 'headerViews').value.join();
    this.bottomNavViews = themeViewSettings.find(f => f.type == 'bottomNavViews')?.value?.join();
  }

  private setColorVariable() {
    const themeColors = this.appConfigService.getSettingData('themeColors');
    if (themeColors && themeColors) {
      document.documentElement.style.setProperty('--shop-color-primary', themeColors.primary);
      document.documentElement.style.setProperty('--shop-color-secondary', themeColors.secondary);
      document.documentElement.style.setProperty('--shop-color-tertiary', themeColors.tertiary);
      document.documentElement.style.setProperty('--shop-color-bg', themeColors.backgroundColor);
    }
  }

  /**
   * Router Event
   * onChangeRouterEvent()
   */
  private onChangeRouterEvent() {
    const subscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = this.utilsService.removeUrlQuery(event.urlAfterRedirects);

        // Update Title
        this.setSeoTitle()

        // Bottom Nav Hide and view
        this.bottomNavView();
      }
    });
    this.subscriptions.push(subscription);
  }


  private trackPageViewEvent(): void {
    const shouldTrackAnalytics = this.gtmService.facebookPixelId || this.gtmService.tagManagerId || this.gtmService.isManageFbPixelByTagManager === true;
    if (shouldTrackAnalytics) {

      // 1) Unique Event ID
      this.generateEventId();

      // 2) user_data (hashed + fbp/fbc handled in util)
      const user_data: any = this.utilsService.getUserData({
        email: this.userService.getUserLocalDataByField('email'),
        phoneNo: this.userService.getUserLocalDataByField('phoneNo'),
        external_id: this.userService.getUserLocalDataByField('userId'),
        firstName: this.userService.getUserLocalDataByField('firstName'),
        lastName: this.userService.getUserLocalDataByField('lastName'),
        city: this.userService.getUserLocalDataByField('division'),
      });

      const page_url = location.href;
      const page_title = document.title;
      const referrer = document.referrer || undefined;

      const custom_data = { page_url, page_title, referrer };

      // 3) Browser Pixel
      if (this.gtmService.facebookPixelId && !this.gtmService.isManageFbPixelByTagManager) {
        this.gtmService.trackByFacebookPixel('PageView', {}, this.eventId);

        // 4) Server Payload
        const eventTime = Math.floor(Date.now() / 1000);
        const payload: any = {
          event_name: 'PageView',
          event_time: eventTime,
          creationTime: eventTime, // Add creationTime field for Conversions API
          event_id: this.eventId,
          action_source: 'website',
          event_source_url: page_url,
          custom_data,
          ...(Object.keys(user_data).length && { user_data })
        };

        this.trackPageView(payload);
      }

      // 6️⃣ Browser: Push to GTM Data Layer (for GTM-managed Pixel or GA4)
      if (this.gtmService.tagManagerId) {
        this.gtmService.pushToDataLayer({
          event: 'page_view',
          event_id: this.eventId,
          page_data: {
            url: page_url,
            title: page_title,
            referrer: referrer,
          },
        });
      }


    }
  }


  private trackPageView(data: GtmPageView) {
    const subscription = this.gtmService.trackPageView(data)
      .subscribe({
        next: () => {
          // Optional: Handle successful response if needed
        },
        error: (err: any) => {
          console.error('Error tracking page view:', err);
        }
      });
    this.subscriptions.push(subscription);
  }

  private generateEventId() {
    this.eventId = this.utilsService.generateEventId();
  }


  /**
   * Others
   */

  private setSeoTitle() {
    const routePath = this.router.url.split('?')[0]; // Remove query parameters
    let title = 'Roman Empire tours';

    switch (routePath) {
      case '/':
        title = 'Home';
        break;
      case '/my-account':
        title = 'My Account';
        break;
      case '/my-order-list':
        title = 'My Order List';
        break;
      case '/my-wishlist':
        title = 'My Wishlist';
        break;
      case '/my-address':
        title = 'My Address';
        break;
      case '/my-review':
        title = 'My Review';
        break;
      case '/setting':
        title = 'My Setting';
        break;
      case '/cart':
        title = 'Cart';
        break;
      case '/checkout':
        title = 'Checkout';
        break;
      case '/order-tracking':
        title = 'Order Tracking';
        break;
      default:
        // Handle dynamic routes
        if (routePath.startsWith('/product-details/')) {
          const productSlug = routePath.split('/product-details/')[1]; // Extract slug
          title = `Product Detail - ${this.formatTitle(productSlug)}`;
        } else if (routePath.startsWith('/order-details/')) {
          title = 'Order Details';
        }
        break;
    }

    this.titleService.setTitle(title);
  }

  /**
   * Function to format slug into a readable title
   */
  private formatTitle(slug: string): string {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private bottomNavView() {
    // Hide footer for product-details, products, and single-segment product details routes
    this.showFooter = !(this.currentUrl.startsWith('/product-details/') ||
      this.currentUrl.startsWith('/products/') || this.currentUrl.startsWith('/product/') ||
      (/^\/[a-zA-Z0-9_-]+$/.test(this.currentUrl) && ![
        '/',
        '/my-account',
        '/my-order-list',
        '/my-wishlist',
        '/my-address',
        '/my-review',
        '/setting',
        '/cart',
        '/checkout',
        '/order-tracking',
        '/blogs',
        '/product-categories',
        '/search',
        '/success-order',
        '/failed-order',
        '/add-review',
        '/pending-review',
        '/settings-security',
        '/edit-profile',
        '/invoice',
        '/order-details',
        '/blog-details',
        '/pages',
        '/forget-password',
        '/products',
        '/product',
        '/test'
      ].includes(this.currentUrl)));
  }

  private checkActivateQueryParam() {
    if (isPlatformBrowser(this.platformId)) {
      this.activatedRoute.queryParamMap.subscribe(qParam => {
        const affiliateId = qParam.get("affiliateId");
        const affiliateProductId = qParam.get("productId");

        const existingData = sessionStorage.getItem('affiliateSessionData');

        // Parse old data if exists
        const parsed = existingData ? JSON.parse(existingData) : null;

        // যদি পুরাতন ডেটা না থাকে বা নতুন ID ভিন্ন হয়
        const isNewOrChanged =
          !parsed ||
          parsed.affiliateId !== affiliateId ||
          parsed.affiliateProductId !== affiliateProductId;

        if (affiliateId && affiliateProductId && isNewOrChanged) {
          const affiliateSessionData = {
            affiliateId,
            affiliateProductId,
          };

          sessionStorage.setItem(
            'affiliateSessionData',
            JSON.stringify(affiliateSessionData),
          );

        } else {
          console.log('ℹ️ Existing affiliate data reused');
        }
      });
    }
  }


  /**
   * ON Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach(sub => sub?.unsubscribe());
  }
}
