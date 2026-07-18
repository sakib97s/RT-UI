import {Component, inject, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from "@angular/router";
import {OrderService} from '../../services/common/order.service';
import {Subscription} from 'rxjs';
import {Order} from '../../interfaces/common/order.interface';
import {AppConfigService} from '../../services/core/app-config.service';
import {GtmService} from '../../services/core/gtm.service';
import {isPlatformBrowser, UpperCasePipe} from '@angular/common';
import {UtilsService} from '../../services/core/utils.service';
import {TranslatePipe} from "../../shared/pipes/translate.pipe";
import {ReloadService} from "../../services/core/reload.service";
import {SettingService} from "../../services/common/setting.service";

@Component({
    selector: 'app-success-order',
    templateUrl: './success-order.component.html',
    styleUrls: ['./success-order.component.scss'],
    imports: [
        RouterModule,
    ]
})
export class SuccessOrderComponent implements OnInit, OnDestroy {

  // Store Data
  orderId: string;
  message: string;
  orderForm: string;
  successPageMessage: any;
  order: Order;

  isEnableOrderSuccessPageOrderId: boolean =false;

  // Inject
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly utilsService = inject(UtilsService);
  private readonly appConfigService = inject(AppConfigService);
  private readonly gtmService = inject(GtmService);
  private readonly reloadService = inject(ReloadService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly settingService = inject(SettingService);

  // Subscription
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    const subscription = this.activatedRoute.queryParamMap.subscribe(qParam => {
      this.orderId = qParam.get('orderId');
      this.message = qParam.get('message');
      this.orderForm = qParam.get('orderForm');
      if (this.currentUrl === '/success-order') {
        this.getOrderByOrderId();
      }
    });
    this.subscriptions.push(subscription);

    this.getSetting();
  }


  /**
   * HTTP REQUEST HANDLE
   * getOrderByOrderId()
   */

  private getSetting() {
    const subscription = this.settingService.getSetting('orderSetting')
      .subscribe({
        next: res => {
          this.isEnableOrderSuccessPageOrderId = res.data?.orderSetting?.isEnableOrderSuccessPageOrderId;
          this.successPageMessage = res.data?.orderSetting?.successPageMessage;
          // console.log('isEnableOrderSuccessPageOrderId',this.isEnableOrderSuccessPageOrderId);

        },
        error: err => {
          console.log(err)
        }
      });
    this.subscriptions.push(subscription);
  }

  private getOrderByOrderId(): void {
    const subscription = this.orderService.getOrderByOrderId(this.orderId, 'orderId orderedItems grandTotal phoneNo email name division createdAt')
      .subscribe({
        next: (res) => {
          this.order = res.data;
          this.reloadService.needRefreshCart$(true);
          if (this.order) {
            if (isPlatformBrowser(this.platformId)) {
              if (this.currentUrl === '/success-order') {
                this.purchaseEvent();
              }
            }
          }
        },
        error: (err) => {
          console.error('Error fetching order:', err);
        }
      });
    this.subscriptions?.push(subscription);
  }

  private purchaseEvent(): void {

    if (!this.order || !Array.isArray(this.order.orderedItems) || !this.orderId) return;

    // 1️⃣ Generate Unique Event ID
    const eId = `${this.appConfigService.getSettingData('shop')}-${this.orderId}`;

    // 2️⃣ Get Hashed User Data
    const user_data = this.utilsService.getUserData({
      firstName: this.order.name,
      email: this.order.email,
      phoneNo: this.order.phoneNo,
      external_id: this.order.phoneNo,
      city: this.order.division,
    });

    const contents = this.order.orderedItems.map((m: any) => ({
      id: String(m._id),                         // Catalog SKU হলে SKU দিন
      quantity: Number(m.quantity) || 1,
      item_price: Number(m.salePrice ?? m.price ?? 0),
    }));

    // 3️⃣ Prepare custom_data
    const custom_data = {
      contents,
      content_type: 'product',
      value: Number(this.order.grandTotal),
      num_items: this.order.orderedItems.length,
      currency: "BDT",
      transaction_id: String(this.orderId),
    };

    // Use current time for event_time (not order creation time)
    // This ensures event_time is not in the past and aligns with click ID creation time
    const eventTime = Math.floor(Date.now() / 1000);
    const original_event_data = {
      event_name: 'Purchase',
      event_time: eventTime,
    }

    // 4️⃣ Server-side Payload
    const trackData: any = {
      event_name: 'Purchase',
      event_time: eventTime,
      creationTime: eventTime, // Add creationTime field for Conversions API
      event_id: eId,
      action_source: 'website',
      event_source_url: location.href,
      custom_data,
      original_event_data,
      ...(Object.keys(user_data).length > 0 && {user_data})
    };

    // 5️⃣ Browser: Facebook Pixel (manual)
    if (this.gtmService.facebookPixelId && !this.gtmService.isManageFbPixelByTagManager) {
      this.gtmService.trackByFacebookPixel('Purchase', custom_data, eId);

      this.gtmService.trackPurchase(trackData).subscribe({
        next: () => {
        },
        error: () => {
        },
      });
    }

    // 6️⃣ Browser: GTM Data Layer Push
    if (this.gtmService?.tagManagerId) {
      // Push GA4 compatible event
      this.gtmService.pushToDataLayer({
        event: 'purchase',
        event_id: eId,
        page_url: window.location.href,
        transaction_id: this.orderId,
        value: this.order.grandTotal,
        currency: 'BDT',
        items: this.order.orderedItems.map(m => ({
          item_id: m['_id'],
          item_name: m['name'],
          item_category: m['category']?.['name'],
          price: m['salePrice'],
          quantity: m.quantity,
        })),
      });
      
      // Also push original Facebook Pixel format for compatibility
      this.gtmService.pushToDataLayer({
        event: 'Purchase',
        event_id: eId,
        page_url: window.location.href,
        ecommerce: {
          purchase: {
            actionField: {
              id: this.orderId,
              revenue: this.order.grandTotal,
              currency: 'BDT'
            },
            products: this.order.orderedItems.map(m => ({
              id: m['_id'],
              name: m['name'],
              category: m['category']?.['name'],
              price: m['salePrice'],
              quantity: m.quantity,
            }))
          },
          custom_data,
          original_event_data,
          ...(Object.keys(user_data).length > 0 && {user_data}),
        }
      });
    }
  }


  get currentUrl() {
    return this.utilsService.removeUrlQuery(this.router.url);
  }


  /**
   * ON Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach(sub => sub?.unsubscribe());
  }

}
