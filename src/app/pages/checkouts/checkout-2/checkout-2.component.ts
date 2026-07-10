import { DOCUMENT, isPlatformBrowser, NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  NgForm,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CART_MAX_QUANTITY } from '../../../core/utils/app-data';
import { DATABASE_KEY } from '../../../core/utils/global-variable';
import { DiscountTypeEnum } from '../../../enum/product.enum';
import { Cart } from '../../../interfaces/common/cart.interface';
import { Coupon } from '../../../interfaces/common/coupon.interface';
import {
  DeliveryCharge,
  Setting,
} from '../../../interfaces/common/setting.interface';
import { User, UserAddress } from '../../../interfaces/common/user.interface';
import { CartService } from '../../../services/common/cart.service';
import { OrderService } from '../../../services/common/order.service';
import { ProductService } from '../../../services/common/product.service';
import { SettingService } from '../../../services/common/setting.service';
import { UserDataService } from '../../../services/common/user-data.service';
import { UserService } from '../../../services/common/user.service';
import { AppConfigService } from '../../../services/core/app-config.service';
import { GtmService } from '../../../services/core/gtm.service';
import { ReloadService } from '../../../services/core/reload.service';
import { StorageService } from '../../../services/core/storage.service';
import { UiService } from '../../../services/core/ui.service';
import { UtilsService } from '../../../services/core/utils.service';
import { OrderItemCardMobileComponent } from '../../../shared/components/order-item-card-mobile/order-item-card-mobile.component';
import { OrderItemCardComponent } from '../../../shared/components/order-item-card/order-item-card.component';
import { EmptyDataComponent } from '../../../shared/components/ui/empty-data/empty-data.component';
import { PayAdvanceComponent } from '../../../shared/dialog/pay-advance/pay-advance.component';
import { CurrencyCtrPipe } from '../../../shared/pipes/currency.pipe';
import { ProductPricePipe } from '../../../shared/pipes/product-price.pipe';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { OffersComponent } from '../components/offers/offers.component';
import { PaymentMethodComponent } from '../components/payment-method/payment-method.component';
import { UserOffersComponent } from '../components/user-offers/user-offers.component';
import { AddressArea2Component } from './address-area-2/address-area-2.component';
import { DeliveryCharge2Component } from './delivery-charge-2/delivery-charge-2.component';

@Component({
  selector: 'app-easy-checkout',
  templateUrl: './checkout-2.component.html',
  styleUrl: './checkout-2.component.scss',
  providers: [ProductPricePipe],
  standalone: true,
  imports: [
    PaymentMethodComponent,
    OrderItemCardComponent,
    OrderItemCardMobileComponent,
    ReactiveFormsModule,
    UserOffersComponent,
    OffersComponent,
    DeliveryCharge2Component,
    AddressArea2Component,
    EmptyDataComponent,
    RouterLink,
    FormsModule,
    MatFormField,
    MatInput,
    MatLabel,
    CurrencyCtrPipe,
    TranslatePipe,
    NgIf,
  ],
})
export class Checkout2Component implements OnInit, AfterViewInit, OnDestroy {
  allowedShopIds = ['688cfa19218408b88ce9dd2e'];
  allowedShopIds1 = ['692d89a8597c97480fcceb9f'];

  // Data Form
  dataForm?: FormGroup;
  @ViewChild('formElement') formElement: NgForm;
  @ViewChild(PaymentMethodComponent)
  paymentMethodComponent: PaymentMethodComponent;
  needRefreshForm: boolean = false;

  isHydrated = false;
  isMobile: number = 190000;
  coupon: Coupon = null;
  couponCode: any = null;
  couponDiscount: number = 0;

  // Store Data
  private eventId: string;
  division: string;
  phoneNo: string = '';
  carts: Cart[] = [];
  readonly cartMaxQuantity: number = CART_MAX_QUANTITY;
  selectedCartItem: string = null;
  user: User;
  setting: Setting;
  deliveryCharge: DeliveryCharge;
  deliveryChargeAmount: number = 0;
  shippingAddress: any;
  shippingAddressString: any;
  selectedPaymentProvider: string;
  selectedPaymentProviderType: string;
  allPaymentProvider: any;
  advancePayment: any[] = [];
  note: string;
  deliveryNote: string;
  userOfferDiscount: any;
  deliveryOptionType: any;
  productSetting: any;
  incompleteOrderId: any;
  incompleteOrderData: any;
  affiliateSessionData: any;
  orderPhoneValidation: any;
  swapPaymentAndOrderItem: any;
  isEnableOrderNote: boolean;
  paymentInfoForm: FormGroup;
  country: any;
  shop: any;

  hasZeroDeliveryCharge: boolean = false;
  hasZeroAdvancePayment: boolean = false;

  // Loading
  isLoading: boolean = false;
  isCoupon: boolean = false;
  isIncompleteOrderId: boolean = false;

  isEnableOtp: boolean;
  otpCode: string | null = null;
  isInvalidOtp: boolean = false;
  isLoadingPhoneNo: boolean = false;
  isValidOtp: boolean = false;
  isSendOtp: boolean = false;
  public countdown = 60;
  private countdownInterval: any;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Inject
  private readonly document = inject(DOCUMENT);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly reloadService = inject(ReloadService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly userDataService = inject(UserDataService);
  private readonly uiService = inject(UiService);
  private readonly productPricePipe = inject(ProductPricePipe);
  protected readonly userService = inject(UserService);
  private readonly productService = inject(ProductService);
  private readonly dialog = inject(MatDialog);
  private readonly gtmService = inject(GtmService);
  private readonly utilsService = inject(UtilsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly fb = inject(FormBuilder);
  private readonly settingService = inject(SettingService);
  private readonly storageService = inject(StorageService);
  private readonly appConfigService = inject(AppConfigService);

  ngOnInit() {
    // This Portion for Affiliate
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('affiliateSessionData');
      this.affiliateSessionData = stored ? JSON.parse(stored) : {};
    } else {
      this.affiliateSessionData = {};
    }

    // Cart Data
    const subscription = this.reloadService.refreshCart$.subscribe(
      (isRefresh) => {
        if (isRefresh) {
          this.getCartsItems();
        }
      }
    );
    this.subscriptions?.push(subscription);
    // Initialize carts from service; ensure we don't lose selection state
    this.carts = (this.cartService.cartItems || []).map((item) => ({
      ...item,
      isSelected: item?.isSelected ?? true,
    }));

    setTimeout(() => {
      this.getCartsItems();
    }, 30);

    this.activatedRoute.queryParamMap.subscribe((qParam) => {
      if (qParam.get('cart')) {
        this.selectedCartItem = qParam.get('cart');
      }
    });

    this.dataForm = this.fb.group({
      deliveryNote: [''],
    });

    // Base Data
    if (this.userService.isUser) {
      this.getLoggedInUserData();
    }
    this.getSetting();

    // Event & Data Layer
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initiateCheckoutEvent();
      }, 500);
    }

    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth;
    }
  }

  /**
   * Hydrated Manage
   * checkHydrated()
   */

  protected checkHydrated() {
    if (isPlatformBrowser(this.platformId)) {
      this.isHydrated = true;
    }
  }

  ngAfterViewInit() {
    this.paymentInfoForm = this.paymentMethodComponent.getForm();
  }

  isAllowedShop(): boolean {
    const id = this.appConfigService.getSettingData('shop');
    return !!id && this.allowedShopIds.includes(id);
  }

  isAllowedShop1(): boolean {
    const id = this.appConfigService.getSettingData('shop');
    return !!id && this.allowedShopIds1.includes(id);
  }

  /**
   * HTTP Req Handle
   * getLoggedInUserData()
   * getPaymentMethod()
   * getCartsItems()
   * updateCartQty()
   * getSetting()
   */
  private getLoggedInUserData() {
    const select = 'email name phoneNo';
    const subscription = this.userDataService
      .getLoggedInUserData(select)
      .subscribe({
        next: (res) => {
          this.user = res.data;
        },
        error: (error) => {
          console.log(error);
        },
      });
    this.subscriptions?.push(subscription);
  }

  private getCartsItems(refresh?: boolean) {
    if (this.userService.isUser) {
      const subscription = this.cartService.getCartByUser().subscribe({
        next: (res) => {
          // Ensure items have a defined selection state (default to selected)
          this.carts = (res.data || []).map((item) => ({
            ...item,
            isSelected: item?.isSelected ?? true,
          }));
          this.cartService.updateCartList(this.carts);
        },
        error: (err) => {
          console.log(err);
        },
      });
      this.subscriptions?.push(subscription);
    } else {
      this.getCarsItemFromLocal(refresh);
    }
  }

  private getCarsItemFromLocal(refresh?: boolean) {
    const items = this.cartService.getCartItemFromLocalStorage();

    if (items && items.length) {
      const ids: string[] = items.map((m) => m.product as string);
      const select =
        'name slug salePrice regularPrice images quantity category isVariation variationList minimumWholesaleQuantity wholesalePrice deliveryCharge advancePayment';
      const subscription = this.productService
        .getProductByIds(ids, select)
        .subscribe({
          next: (res) => {
            const products = res.data;
            this.removeUnnecessaryCartItems(products, ids);
            if (products && products.length) {
              this.carts = items
                .map((t1) => ({
                  ...t1,
                  ...{ product: products.find((t2) => t2._id === t1.product) },
                }))
                .map((item) => ({
                  ...item,
                  isSelected: item?.isSelected ?? true,
                }));
              this.cartService.updateCartList(this.carts);
              // console.log(' this.carts ', this.carts)
            }
          },
          error: (error) => {
            console.log(error);
          },
        });
      this.subscriptions?.push(subscription);
    } else {
      this.carts = [];
      this.cartService.updateCartList(this.carts);
    }
  }

  private removeUnnecessaryCartItems(products: any[], ids: string[]) {
    if (!this.userService.isUser) {
      const productIds = products.map((product) => product._id);
      const notExistsIds = ids.filter((id) => !productIds.includes(id));
      if (notExistsIds.length) {
        this.cartService.deleteCartItemFromLocalStorage(notExistsIds);
        this.reloadService.needRefreshCart$(true);
      }
    }
  }

  private updateCartQty(cartId: string, data: any) {
    const subscription = this.cartService
      .updateCartQty(cartId, data)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.reloadService.needRefreshCart$(true);
          }
        },
        error: (err) => {
          console.log(err);
        },
      });
    this.subscriptions?.push(subscription);
  }

  private addOrder(data: any) {
    this.isLoading = true;
    const subscription = this.orderService
      .addOrder(data, this.userService.isUser)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.isLoading = false;

            // Session Data Clear
            sessionStorage.removeItem('affiliateSessionData');
            switch (res.data.providerName) {
              case 'Cash on Delivery': {
                this.uiService.message(res.message, 'success');
                if (!this.userService.isUser) {
                  this.cartService.deleteAllCartFromLocal(true);
                }
                this.router
                  .navigate(['/success-order'], {
                    queryParams: { orderId: res.data.orderId },
                  })
                  .then();
                this.cartService.needRefreshStoredCart$();
                break;
              }
              case 'Bkash': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }

                break;
              }
              case 'Nagad': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }

                break;
              }
              case 'Rocket': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }

                break;
              }
              case 'Binance': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }

                break;
              }
              case 'SSl Commerz': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }
                break;
              }
              case 'Upay': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }
                break;
              }

              case 'EPS': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }
                break;
              }
              case 'PayStation': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }
                break;
              }
              case 'ZiniPay': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }
                break;
              }
              case 'ShurjoPay': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }
                break;
              }

              case 'Stripe': {
                if (res.data.providerType === 'api') {
                  if (res.success && res.data.link) {
                    this.document.location.href = res.data.link;
                  } else {
                    this.uiService.message(res.message, 'wrong');
                  }
                } else {
                  this.uiService.message(res.message, 'success');
                  if (!this.userService.isUser) {
                    this.cartService.deleteAllCartFromLocal(true);
                  }
                  this.router
                    .navigate(['/success-order'], {
                      queryParams: { orderId: res.data.orderId },
                    })
                    .then();
                  this.cartService.needRefreshStoredCart$();
                }
                break;
              }
            }
          } else {
            this.isLoading = false;
            this.uiService.message(res.message, 'warn');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.log(error);
        },
      });
    this.subscriptions?.push(subscription);
  }

  private incompleteOrder() {
    const subscription = this.orderService
      .addIncompleteOrder(this.orderFinalData, this.userService.isUser)
      .subscribe({
        next: (res) => {
          this.incompleteOrderId = res?.data?._id;
          this.isIncompleteOrderId = true;
          // console.log('success',res);
        },
        error: (error) => {
          console.log(error);
        },
      });
    this.subscriptions?.push(subscription);
  }

  updateIncompleteOrderById() {
    const subscription = this.orderService
      .updateIncompleteOrderById(this.incompleteOrderId, this.orderFinalData)
      .subscribe({
        next: (res) => {
          if (res.success) {
            // console.log("update Incomplete Order");
          }
        },
        error: (err) => {
          console.error('Error fetching order:', err);
        },
      });
    this.subscriptions?.push(subscription);
  }

  private getSetting() {
    const subscription = this.settingService
      .getSetting(
        'orderSetting orderPhoneValidation advancePayment deliveryOptionType productSetting incompleteOrder country'
      )
      .subscribe({
        next: (res) => {
          this.isEnableOrderNote = res.data?.orderSetting?.isEnableOrderNote;
          this.deliveryOptionType = res.data?.deliveryOptionType;
          this.productSetting = res.data?.productSetting;
          this.incompleteOrderData = res.data?.incompleteOrder;
          this.isEnableOtp = res.data?.orderSetting?.isEnableOtp;
          this.swapPaymentAndOrderItem =
            res.data?.orderSetting?.isSwapPaymentAndOrderItem;
          this.orderPhoneValidation = res.data?.orderPhoneValidation;
          this.country = res.data?.country;
          if (res.data?.advancePayment && res.data?.advancePayment.length) {
            this.advancePayment = res.data.advancePayment.filter(
              (f) => f.status === 'active'
            );
          }
          if (this.productSetting) {
            this.deliveryChargeAmount = this.cartDeliveryChargeTotal
              ? this.cartDeliveryChargeTotal
              : 0;
            // this.deliveryChargeAmount = this.productSetting?.isEnableDeliveryCharge && this.cartDeliveryChargeTotal > 0 ? this.cartDeliveryChargeTotal : 0;
          }
        },
        error: (err) => {
          console.log(err);
        },
      });
    this.subscriptions.push(subscription);
  }

  /**
   * UI Methods
   * onConfirmOrder()
   */
  public onConfirmOrder() {
    if (!this.carts.length) {
      this.uiService.message('Empty Cart! sorry your cart is empty.', 'warn');
      this.router.navigate(['/']).then();
      return;
    }

    if (!this.selectedPaymentProvider) {
      this.uiService.message('Please select a payment method', 'warn');
      return;
    }

    if (
      !this.shippingAddress ||
      (this.shippingAddress && !this.shippingAddress.division)
    ) {
      this.needRefreshForm = true;
      this.uiService.message('Please select your address', 'warn');
      return;
    }

    if (this.appConfigService.getSettingData('shop') !== '68ea40deeea7e36ac9128533' &&
      this.productSetting
      && this.productSetting?.productType === 'digitalProduct'
      && (
        this.productSetting?.digitalProduct?.isEmailEnable
        || (this.country && this.country?.code !== 'BD')
      )
    ) {
      const email = this.shippingAddress?.email;

      if (!email) {
        this.needRefreshForm = true;
        this.uiService.message('Please add your email', 'warn');
        return;
      }

      // Check if email format is invalid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.needRefreshForm = true;
        this.uiService.message('Please enter valid your email', 'warn');
        return;
      }
    }

    // if (this.country?.code === "BD" && (!this.shippingAddress || (this.shippingAddress && !this.shippingAddress.phoneNo) || (this.shippingAddress && this.shippingAddress.phoneNo && (this.shippingAddress && this.shippingAddress.phoneNo.length < 11)))) {
    //   this.needRefreshForm = true;
    //   this.uiService.message('Please add your phone number', "warn")
    //   return;
    // }

    if (this.orderPhoneValidation?.isEnableOutsideBd) {
      const phoneNo = this.shippingAddress?.phoneNo || '';
      if (
        !phoneNo ||
        phoneNo?.length < this.orderPhoneValidation?.minLength ||
        phoneNo?.length > this.orderPhoneValidation?.maxLength
      ) {
        this.needRefreshForm = true;
        this.uiService.message(
          `Phone number must be ${this.orderPhoneValidation?.minLength}-${this.orderPhoneValidation?.maxLength} characters.`,
          'warn'
        );
        return;
      }
    } else if (this.country?.code === 'BD') {
      const phoneNo = this.shippingAddress?.phoneNo || '';
      if (!phoneNo || phoneNo?.length < 11) {
        this.needRefreshForm = true;
        this.uiService.message('Please add your phone number', 'warn');
        return;
      }

      // Validate Bangladesh phone number format
      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      if (!bdPhoneRegex.test(phoneNo)) {
        this.needRefreshForm = true;
        this.uiService.message(
          'Please enter a valid Bangladesh phone number (01XXXXXXXXX)',
          'warn'
        );
        return;
      }
    }

    if (this.appConfigService.getSettingData('shop') !== '68ea40deeea7e36ac9128533' &&
      this.productSetting
      && this.productSetting?.productType === 'digitalProduct'
      && (
        this.productSetting?.digitalProduct?.isEmailEnable
        || (this.country && this.country?.code !== 'BD')
      )
    ) {
      this.needRefreshForm = true;
      this.uiService.message('Please add your email', 'warn');
      return;
    }

    if (
      !this.shippingAddress ||
      (this.shippingAddress && !this.shippingAddress.name)
    ) {
      this.needRefreshForm = true;
      this.uiService.message('Please add your name', 'warn');
      return;
    }

    if (
      !this.shippingAddress ||
      (this.shippingAddress && !this.shippingAddress.shippingAddress)
    ) {
      this.needRefreshForm = true;
      this.uiService.message('Please add your full address', 'warn');
      return;
    }

    if (this.selectedPaymentProvider === 'Binance') {
      if (
        !this.paymentInfoForm.value.transactionAmount ||
        !this.paymentInfoForm.value.paymentTransactionId
      ) {
        this.paymentInfoForm.markAllAsTouched();
        this.uiService.message('Please enter your payment information', 'warn');
        return;
      }
    } else {
      if (
        this.selectedPaymentProviderType === 'sent-money' ||
        this.selectedPaymentProviderType === 'payment'
      ) {
        if (this.paymentInfoForm.invalid) {
          this.paymentInfoForm.markAllAsTouched();
          this.uiService.message(
            'Please enter your payment information',
            'warn'
          );
          return;
        }
      }
    }
    // Save data for pixel
    this.saveUserSomeDataToLocal();
  }

  private saveUserSomeDataToLocal() {
    this.storageService.addDataToEncryptLocal(
      {
        phoneNo: this.shippingAddress.phoneNo,
        email: this.shippingAddress.email
          ? this.shippingAddress.email
          : this.user?.email ?? null,
        division: this.shippingAddress.division,
        area: this.shippingAddress.area,
        zone: this.shippingAddress.zone,
        name: this.shippingAddress.name,
        userId: this.user?._id ?? this.shippingAddress.phoneNo,
      },
      DATABASE_KEY.userInfoForPixel
    );
  }

  private get orderFinalData() {
    const getCartOrProductIds = () => {
      if (this.userService.isUser) {
        return this.selectedCarts.map((m) => m._id);
      } else {
        return this.selectedCarts.map((m) => m.product['_id']);
      }
    };

    const cartData = () => {
      if (this.userService.isUser) {
        return [];
      } else {
        return this.selectedCarts.map((m) => {
          return {
            ...m,
            ...{
              product: m.product['_id'],
            },
          };
        });
      }
    };

    return {
      ...{
        user: this.user?._id ?? null,
        orderType: this.userService.isUser ? 'user' : 'anonymous',
        carts: getCartOrProductIds(),
        cartData: cartData(),
        name: this.shippingAddress.name,
        phoneNo: this.shippingAddress.phoneNo,
        email: this.shippingAddress.email
          ? this.shippingAddress.email
          : this.user?.email ?? null,
        shippingAddress: this.shippingAddress.shippingAddress,
        division: this.shippingAddress.division,
        area: this.shippingAddress.area,
        orderFrom: 'Website',
        zone: this.shippingAddress.zone,
        addressType: this.shippingAddress?.addressType,
        providerName: this.selectedPaymentProvider,
        deliveryNote: this.dataForm?.get('deliveryNote')?.value ?? '',
        deliveryType: this.deliveryCharge?.type,
        userOffer: this.userOfferDiscount?.offerType,
        needSaveAddress: true,
        coupon: this.coupon ? this.coupon?._id : null,
        providerType: this.selectedPaymentProviderType,
        incompleteOrderId: this.incompleteOrderId ?? null,
        affiliateId: this.affiliateSessionData
          ? this.affiliateSessionData.affiliateId
          : null,
        affiliateProductId: this.affiliateSessionData
          ? this.affiliateSessionData.affiliateProductId
          : null,
      },
      ...this.paymentInfoForm.value,
    };
  }

  private get getAdvancePaymentAmount(): number {
    const hasValidProvider = (providers: any[]) => {
      const validProviders = [
        'Bkash',
        'Nagad',
        'Rocket',
        'SSl Commerz',
        'Upay',
        'Stripe',
        'PayStation',
        'EPS',
        'ZiniPay',
        'ShurjoPay',
      ];
      return providers.some((provider) =>
        validProviders.includes(provider.providerName)
      );
    };

    if (!hasValidProvider(this.allPaymentProvider?.paymentMethods ?? [])) {
      return 0;
    }

    if (
      this.advancePayment &&
      this.advancePayment.length &&
      this.selectedPaymentProvider === 'Cash on Delivery'
    ) {
      // Find the custom_advance_payment object
      const customAdvance = this.advancePayment.find(
        (item) =>
          item.providerName === 'custom_advance_payment' &&
          item.status === 'active' &&
          this.cartSaleSubTotal >= item.minimumAmount
      );

      // If custom_advance_payment meets criteria, return its advancePaymentAmount
      if (customAdvance) {
        return customAdvance.advancePaymentAmount ?? 0;
      }

      // Else, check for advance_delivery_payment and matching division
      const deliveryAdvance = this.advancePayment.find(
        (item) =>
          item.providerName === 'advance_delivery_payment' &&
          item.status === 'active' &&
          item.division &&
          item.division.includes(this.shippingAddress.division)
      );

      if (deliveryAdvance) {
        return this.productSetting?.isEnableAdvancePayment &&
          this.cartAdvancePaymentTotal > 0
          ? this.hasZeroAdvancePayment
            ? this.cartAdvancePaymentTotal + this.deliveryChargeAmount
            : this.cartAdvancePaymentTotal
          : this.deliveryChargeAmount;
      }

      //   // If none match, return 0
      //   return 0;
      // } else {
      //   return 0;
      // }

      // If none match,
      // return 0;
      return this.productSetting?.isEnableAdvancePayment &&
        this.cartAdvancePaymentTotal > 0
        ? this.hasZeroAdvancePayment
          ? this.cartAdvancePaymentTotal + this.deliveryChargeAmount
          : this.cartAdvancePaymentTotal
        : 0;
    } else {
      return this.productSetting?.isEnableAdvancePayment &&
        this.cartAdvancePaymentTotal > 0
        ? this.hasZeroAdvancePayment
          ? this.cartAdvancePaymentTotal + this.deliveryChargeAmount
          : this.cartAdvancePaymentTotal
        : 0;
    }
  }

  /**
   * ON Change Methods
   * onChangeAddress()
   * onChangeDeliveryCharge()
   * onChangePaymentMethod()
   * onChangeUserDiscount()
   */
  // onChangeAddress(event: UserAddress) {
  //   this.shippingAddress = event;
  //   this.division = this.shippingAddress.division;
  //   console.log("eeeeeee",event)
  //
  //   let phoneNo :string
  //
  //
  //   if ( this.incompleteOrderData?.isEnableIncompleteOrder &&  event?.phoneNo && typeof event.phoneNo === 'string' && event.phoneNo.length === 11 && (phoneNo !==event.phoneNo)) {
  //     // Valid 11-digit phone number
  //     phoneNo = event.phoneNo;
  //     console.log('phoneNo',phoneNo)
  //     console.log('yes')
  //     this.incompleteOrder()
  //   }
  //
  //
  //
  //
  // }

  onChangeAddress(event: UserAddress): void {
    this.shippingAddress = event;
    this.division = event.division;
    // console.log('eeeeeee', event);
    // console.log('this.incompleteOrderData', this.incompleteOrderData);

    const isIncompleteOrderEnabled =
      this.incompleteOrderData?.isEnableIncompleteOrder;
    const isPhoneValid =
      typeof event?.phoneNo === 'string' && event.phoneNo.length === 11;
    const isPhoneChanged = this.phoneNo !== event.phoneNo;
    const isShippingAddress =
      typeof event?.shippingAddress === 'string' &&
      event.shippingAddress.trim().length > 0;
    const isShippingAddressString =
      this.shippingAddress !== event.shippingAddress;

    if (
      isIncompleteOrderEnabled &&
      (isPhoneValid || isShippingAddress) &&
      (isPhoneChanged || isShippingAddressString) &&
      !this.isIncompleteOrderId
    ) {
      this.phoneNo = event.phoneNo;
      this.shippingAddressString = event.shippingAddress;
      setTimeout(() => {
        this.incompleteOrder();
      }, 50);
    } else {
      if (
        isIncompleteOrderEnabled &&
        (isPhoneValid || isShippingAddress) &&
        (isPhoneChanged || isShippingAddressString) &&
        this.incompleteOrderId &&
        this.isIncompleteOrderId
      ) {
        this.phoneNo = event.phoneNo;
        this.shippingAddressString = event.shippingAddress;
        this.updateIncompleteOrderById();
      }
    }
  }

  onChangeDeliveryCharge(event: DeliveryCharge) {
    this.deliveryCharge = event;
    // this.deliveryChargeAmount = event.deliveryCharge ?? 0;
    this.updateDeliveryChargeAmount();
  }

  // updateDeliveryChargeAmount() {
  //   this.deliveryChargeAmount =
  //     this.deliveryCharge?.freeDeliveryMinAmount && this.cartSaleSubTotal >= this.deliveryCharge.freeDeliveryMinAmount
  //       ? 0
  //       : this.deliveryCharge?.deliveryCharge ?? 0;
  // }

  // updateDeliveryChargeAmount() {
  //
  //   const isFreeDelivery = this.deliveryCharge?.freeDeliveryMinAmount &&
  //     this.cartSaleSubTotal >= this.deliveryCharge.freeDeliveryMinAmount;
  //
  //   if (this.productSetting?.isEnableDeliveryCharge && this.cartDeliveryChargeTotal > 0) {
  //     this.deliveryChargeAmount = isFreeDelivery
  //       ? this.cartDeliveryChargeTotal :
  //       this.hasZeroDeliveryCharge ? this.cartDeliveryChargeTotal + (this.deliveryCharge?.deliveryCharge ?? 0) : this.cartDeliveryChargeTotal;
  //   } else {
  //     this.deliveryChargeAmount = isFreeDelivery
  //       ? 0
  //       : (this.deliveryCharge?.deliveryCharge ?? 0);
  //   }
  //
  //
  //   console.log("  this.deliveryChargeAmount",  this.deliveryChargeAmount)
  // }

  updateDeliveryChargeAmount() {
    const isFreeDelivery =
      this.deliveryCharge?.freeDeliveryMinAmount &&
      this.cartSaleSubTotal >= this.deliveryCharge.freeDeliveryMinAmount;

    this.deliveryChargeAmount = isFreeDelivery
      ? 0
      : this.cartDeliveryChargeTotal ?? 0;

    // console.log("  this.deliveryChargeAmount", this.deliveryChargeAmount)
  }

  onChangePaymentMethod(event: any) {
    this.selectedPaymentProvider = event;
  }

  onChangePaymentType(event: any) {
    this.selectedPaymentProviderType = event;
  }

  allPaymentMethod(event: any) {
    this.allPaymentProvider = event;
  }

  onChangeUserDiscount(event: any) {
    this.userOfferDiscount = event;
  }

  // Selected items only
  get selectedCarts(): Cart[] {
    return (this.carts || []).filter((item) => !!item?.isSelected);
  }

  // Totals calculated from selected items only
  get cartRegularSubTotal(): number {
    return this.selectedCarts
      .map(
        (item) =>
          this.productPricePipe.transform(
            item.product,
            'regularPrice',
            item.variation?._id,
            item.selectedQty
          ) as number
      )
      .reduce((acc, value) => acc + value, 0);
  }

  get cartSaleSubTotal(): number {
    return this.selectedCarts
      .map(
        (item) =>
          this.productPricePipe.transform(
            item.product,
            'salePrice',
            item.variation?._id,
            item.selectedQty,
            item?.isWholesale
          ) as number
      )
      .reduce((acc, value) => acc + value, 0);
  }

  get cartDiscountAmount(): number {
    return this.selectedCarts
      .map(
        (item) =>
          this.productPricePipe.transform(
            item.product,
            'discountAmount',
            item.variation?._id,
            item.selectedQty
          ) as number
      )
      .reduce((acc, value) => acc + value, 0);
  }

  // get cartDeliveryChargeTotal(): number {
  //   // Dhaka হলে insideCity, না হলে outsideCity ধরবে
  //   const isInsideCity = this.deliveryCharge?.city === this.division;
  //
  //   // console.log("this.deliveryCharge?.insideCity",this.deliveryCharge)
  //   this.hasZeroDeliveryCharge = false;
  //
  //   const total = this.carts
  //     .map((item: any) => {
  //       const deliveryCharge = isInsideCity
  //         ? item.product?.deliveryCharge?.insideCity || 0
  //         : item.product?.deliveryCharge?.outsideCity || 0;
  //
  //       if (deliveryCharge === 0) {
  //         this.hasZeroDeliveryCharge = true;
  //
  //       }
  //
  //       // return deliveryCharge * item?.selectedQty;
  //       return deliveryCharge;
  //     })
  //     .reduce((acc, value) => acc + value, 0);
  //
  //   console.log(" totaltotaltotal this.deliveryChargeAmount",total)
  //   return total;
  // }

  get cartDeliveryChargeTotal(): number {
    // ---- Detect inside city using division ----
    const currentDivision = (this.division ?? '')
      .toString()
      .trim()
      .toLowerCase();
    const deliveryCity = (this.deliveryCharge?.city ?? '')
      .toString()
      .trim()
      .toLowerCase();
    const isInsideCity =
      currentDivision && deliveryCity && currentDivision === deliveryCity;

    this.hasZeroDeliveryCharge = false;

    // ---- Global delivery charge ----
    const globalCharge = Number(this.deliveryCharge?.deliveryCharge) || 0;

    // ---- Calculate per-product delivery charge ----
    const productCharges = (this.carts ?? []).map((item: any) => {
      const pd = item?.product?.deliveryCharge;
      const enabled = pd?.isEnableDeliveryCharge === true;

      if (enabled) {
        const rawCharge = isInsideCity ? pd?.insideCity : pd?.outsideCity;
        const charge = Number(rawCharge);

        if (Number.isFinite(charge)) {
          if (charge === 0) this.hasZeroDeliveryCharge = true;
          return charge;
        }
      }

      // fallback → will use global charge later
      return null;
    });

    // ---- Sum all valid product charges ----
    const perProductTotal = productCharges
      .filter((x) => x !== null)
      .reduce((acc, val) => acc + val, 0);

    const needsGlobal = productCharges.some((x) => x === null);

    const total = perProductTotal + (needsGlobal ? globalCharge : 0);

    if (needsGlobal && globalCharge === 0) {
      this.hasZeroDeliveryCharge = true;
    }

    return total;
  }

  get cartAdvancePaymentTotal(): number {
    this.hasZeroAdvancePayment = false;

    const total = this.carts
      .map((item: any) => {
        if (item.product.advancePayment === 0) {
          this.hasZeroAdvancePayment = true;

          console.log('this.hasZeroAdvancePayment', this.hasZeroAdvancePayment);
        }
        // return (item.product.advancePayment || 0) * item.selectedQty;
        return item.product.advancePayment || 0;
      })
      .reduce((acc, value) => acc + value, 0);

    return total;
  }

  /**
   * Cart Methods
   * onIncrementQty()
   * onDecrementQty()
   */
  onIncrementQty(cartId: string, index: number) {
    // Map selected list index back to full carts index
    const selectedItem = this.selectedCarts[index];
    const realIndex = this.carts.findIndex(
      (m) =>
        (m?._id && m?._id === selectedItem?._id) ||
        (m?.product && m?.product['_id'] === selectedItem?.product['_id'])
    );
    if (realIndex < 0) {
      return;
    }
    if (this.userService.isUser) {
      if (this.carts[realIndex].selectedQty === this.cartMaxQuantity) {
        this.uiService.message(
          `Maximum product quantity is ${this.cartMaxQuantity}`,
          'warn'
        );
      } else {
        this.carts[realIndex].selectedQty += 1;
        this.updateCartQty(this.carts[realIndex]?._id, {
          selectedQty: 1,
          type: 'increment',
        });
      }
    } else {
      const data = this.cartService.getCartItemFromLocalStorage();
      if (data && data[realIndex].selectedQty !== this.cartMaxQuantity) {
        data[realIndex].selectedQty += 1;
        this.carts[realIndex].selectedQty += 1;
        this.cartService.updateCartItemFromLocalStorage(data);
      }
    }
    this.updateDeliveryChargeAmount();
  }

  onDecrementQty(cartId: string, index: number, sQty: number) {
    // Map selected list index back to full carts index
    const selectedItem = this.selectedCarts[index];
    const realIndex = this.carts.findIndex(
      (m) =>
        (m?._id && m?._id === selectedItem?._id) ||
        (m?.product && m?.product['_id'] === selectedItem?.product['_id'])
    );
    if (realIndex < 0) {
      return;
    }
    if (this.userService.isUser) {
      if (sQty === 1) {
        this.uiService.message('Minimum quantity is 1', 'warn');
      } else {
        this.carts[realIndex].selectedQty -= 1;
        this.updateCartQty(this.carts[realIndex]?._id, {
          selectedQty: 1,
          type: 'decrement',
        });
      }
    } else {
      const data = this.cartService.getCartItemFromLocalStorage();
      if (data && data[realIndex].selectedQty !== 1) {
        data[realIndex].selectedQty -= 1;
        this.carts[realIndex].selectedQty -= 1;
        this.cartService.updateCartItemFromLocalStorage(data);
      }
    }
    this.updateDeliveryChargeAmount();
  }
  //
  // /**
  //  * Calculation
  //  * cartRegularSubTotal()
  //  * cartSaleSubTotal()
  //  * cartDiscountAmount()
  //  */
  //
  // get cartRegularSubTotal(): number {
  //   return this.carts.map(item => {
  //     return this.productPricePipe.transform(
  //       item.product,
  //       'regularPrice',
  //       item.variation?._id,
  //       item.selectedQty
  //     ) as number;
  //   }).reduce((acc, value) => acc + value, 0);
  // }
  //
  // get cartSaleSubTotal(): number {
  //   return this.carts.map(item => {
  //     return this.productPricePipe.transform(
  //       item.product,
  //       'salePrice',
  //       item.variation?._id,
  //       item.selectedQty,
  //       item?.isWholesale
  //     ) as number;
  //   }).reduce((acc, value) => acc + value, 0);
  // }
  //
  // get cartDiscountAmount(): number {
  //   return this.carts.map(item => {
  //     return this.productPricePipe.transform(
  //       item.product,
  //       'discountAmount',
  //       item.variation?._id,
  //       item.selectedQty,
  //       item?.isWholesale
  //     ) as number;
  //   }).reduce((acc, value) => acc + value, 0);
  // }

  get grandTotal(): number {
    return (
      this.cartSaleSubTotal +
      (this.deliveryChargeAmount ?? 0) -
      (this.userOfferDiscount?.amount ?? 0) -
      (this.couponDiscount ?? 0)
    );
  }

  get formattedDiscount(): number {
    const amount: any = this.userOfferDiscount?.amount ?? 0;
    return parseFloat(Number(amount).toFixed(2));
  }

  /**
   * Dialog View
   * openPopupDialog()
   */

  openAdvancePaymentDialog() {
    const dialogRef = this.dialog.open(PayAdvanceComponent, {
      maxWidth: '900px',
      width: '100%',
      height: '100%',
      maxHeight: '650px',
      autoFocus: false,

      data: {
        paymentProviders: this.allPaymentProvider?.paymentMethods ?? [],
        amount: this.getAdvancePaymentAmount,
        // country: this.country,
        // isEnableAdvancePayment: this.productSetting?.isEnableAdvancePayment && this.cartAdvancePaymentTotal > 0,
        // advancePayment: this.advancePayment
      },
    });
    const subscription = dialogRef.afterClosed().subscribe((dialogResult) => {
      if (dialogResult) {
        const mData = {
          ...this.orderFinalData,
          ...dialogResult,
          ...{
            advancePayment: this.getAdvancePaymentAmount,
          },
        };
        this.addOrder(mData);
      }
    });
    this.subscriptions?.push(subscription);
  }

  /**
   * COUPON HANDLE
   * checkCouponAvailability()
   * calculateCouponDiscount()
   * onRemoveCoupon()
   */


  private calculateCouponDiscount() {
    if (this.coupon.discountType === DiscountTypeEnum.PERCENTAGE) {
      this.couponDiscount = Math.floor(
        (this.coupon.discountAmount / 100) * this.cartSaleSubTotal
      );
    } else {
      this.couponDiscount = Math.floor(this.coupon.discountAmount);
    }
  }

  onRemoveCoupon() {
    this.couponDiscount = 0;
    this.couponCode = null;
    this.coupon = null;
  }

  /**
   * OTP HANDLE START
   */
  onOtpEnter(value: string): void {
    this.otpCode = value;
  }

  closePopup() {
    this.isSendOtp = false;
  }


  private startCountdown(): void {
    this.countdown = 60;
    clearInterval(this.countdownInterval); // আগের টাইমার বন্ধ

    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  /**
   * OTP HANDLE END
   */

  /**
   * Utils
   * generateEventId()
   */
  private generateEventId() {
    this.eventId = this.utilsService.generateEventId();
  }

  private initiateCheckoutEvent(): void {
    if (!this.carts?.length) return;

    // 1️⃣ Generate Unique Event ID
    this.generateEventId();

    // 2️⃣ Get hashed user data
    const user_data = this.utilsService.getUserData({
      email: this.userService.getUserLocalDataByField('email'),
      phoneNo: this.userService.getUserLocalDataByField('phoneNo'),
      external_id: this.userService.getUserLocalDataByField('userId'),
      firstName: this.userService.getUserLocalDataByField('name'),
      city: this.userService.getUserLocalDataByField('division'),
    });

    // 3) custom_data (Meta standard)
    const contents = this.carts.map((c) => ({
      id: String(c.product['_id']), // ⚠️ ক্যাটালগে যে ID আছে সেটা ইউজ করা ভালো (SKU হলে SKU)
      quantity: Number(c.selectedQty ?? 1),
      item_price: Number(c.product['salePrice']),
    }));

    // 3️⃣ Prepare custom_data

    const custom_data = {
      contents,
      content_type: 'product',
      value: Number(this.grandTotal ?? 0),
      currency: 'BDT',
      num_items: Number(this.selectedCarts.length),
      // optional enrichment (safe)
      content_category: this.carts[0]?.product['category']['name'],
    };

    const eventTime = Math.floor(Date.now() / 1000);
    const original_event_data = {
      event_name: 'InitiateCheckout',
      event_time: eventTime,
    };

    // 4️⃣ Server-side payload for CAPI
    const trackData: any = {
      event_name: 'InitiateCheckout',
      event_time: eventTime,
      creationTime: eventTime, // Add creationTime field for Conversions API
      event_id: this.eventId,
      action_source: 'website',
      event_source_url: location.href,
      custom_data,
      original_event_data,
      ...(Object.keys(user_data).length > 0 && { user_data }),
    };

    // 5️⃣ Browser: Facebook Pixel (if not managed via GTM)
    if (!this.gtmService.isManageFbPixelByTagManager) {
      this.gtmService.trackByFacebookPixel(
        'InitiateCheckout',
        custom_data,
        this.eventId
      );

      // 7️⃣ Server: Send to Conversions API
      this.gtmService.trackInitiateCheckout(trackData).subscribe({
        next: () => { },
        error: () => { },
      });
    }

    // 6️⃣ Browser: GTM dataLayer push
    if (this.gtmService?.tagManagerId) {
      // Calculate total value
      const totalValue = this.selectedCarts.reduce((sum, m) => {
        return sum + (m.product['salePrice'] * m.selectedQty);
      }, 0);

      // Push GA4 compatible event
      this.gtmService.pushToDataLayer({
        event: 'begin_checkout',
        event_id: this.eventId,
        page_url: window.location.href,
        event_time: Math.floor(Date.now() / 1000),
        value: totalValue,
        currency: 'BDT',
        items: this.selectedCarts.map((m) => ({
          item_id: m.product['_id'],
          item_name: m.product['name'],
          item_category: m.product['category']?.['name'],
          price: m.product['salePrice'],
          quantity: m.selectedQty,
        })),
      });

      // Also push original Facebook Pixel format for compatibility
      this.gtmService.pushToDataLayer({
        event: 'InitiateCheckout',
        event_id: this.eventId,
        page_url: window.location.href,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        ecommerce: {
          checkout: {
            actionField: {
              num_items: this.selectedCarts.length,
            },
            products: this.selectedCarts.map((m) => ({
              id: m.product['_id'],
              name: m.product['name'],
              category: m.product['category']?.['name'],
              price: m.product['salePrice'],
              quantity: m.selectedQty,
            })),
            custom_data,
            original_event_data,
            ...(Object.keys(user_data).length > 0 && { user_data }),
          },
        },
      });
    }
  }

  onSelectCouponOpen() {
    this.isCoupon = true;
  }

  onSelectCouponClose() {
    this.isCoupon = false;
  }

  // Window Resize Event Handler
  @HostListener('window:resize')
  onGetInnerWidth(): void {
    this.isMobile = window.innerWidth;
  }
  /**
   * On Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
  }
}
