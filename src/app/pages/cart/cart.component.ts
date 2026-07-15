import { isPlatformBrowser, JsonPipe, NgClass, NgStyle } from '@angular/common';
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CART_MAX_QUANTITY } from '../../core/utils/app-data';
import { Cart } from '../../interfaces/common/cart.interface';
import { Product } from '../../interfaces/common/product.interface';
import { ThemeViewSetting } from '../../interfaces/common/setting.interface';
import { FilterData } from '../../interfaces/core/filter-data';
import { Pagination } from '../../interfaces/core/pagination';
import { CartService } from '../../services/common/cart.service';
import { ProductService } from '../../services/common/product.service';
import { UserService } from '../../services/common/user.service';
import { AppConfigService } from '../../services/core/app-config.service';
import { GtmService } from '../../services/core/gtm.service';
import { ReloadService } from '../../services/core/reload.service';
import { UiService } from '../../services/core/ui.service';
import { UtilsService } from '../../services/core/utils.service';
import { OrderService } from '../../services/common/order.service';
import { CurrencyService } from '../../services/core/currency.service';
import { ProductCard1Component } from '../../shared/components/product-cards/product-card-1/product-card-1.component';
import { ProductCard2Component } from '../../shared/components/product-cards/product-card-2/product-card-2.component';
import { ProductCard3Component } from '../../shared/components/product-cards/product-card-3/product-card-3.component';
import { ProductCard4Component } from '../../shared/components/product-cards/product-card-4/product-card-4.component';
import { EmptyDataComponent } from '../../shared/components/ui/empty-data/empty-data.component';
import { OnlyNumberDirective } from '../../shared/directives/number-only.directive';
import { CartLoaderComponent } from '../../shared/loader/cart-loader/cart-loader.component';
import { ProductCardLoaderComponent } from '../../shared/loader/product-card-loader/product-card-loader.component';
import { CurrencyCtrPipe } from '../../shared/pipes/currency.pipe';
import { ProductPricePipe } from '../../shared/pipes/product-price.pipe';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { VariationInfoInlinePipe } from '../../shared/pipes/variation-info-inline.pipe';
import { OrderSummaryComponent } from './order-summary/order-summary.component';

@Component({
    selector: 'app-cart',
    templateUrl: './cart.component.html',
    styleUrls: ['./cart.component.scss'],
    providers: [ProductPricePipe],
    imports: [
        FormsModule,
        OnlyNumberDirective,
        CartLoaderComponent,
        EmptyDataComponent,
        VariationInfoInlinePipe,
        ProductPricePipe,
        ProductCard1Component,
        ProductCardLoaderComponent,
        ProductCard2Component,
        OrderSummaryComponent,
        NgStyle,
        NgClass,
        RouterLink,
        ProductCard3Component,
        CurrencyCtrPipe,
        TranslatePipe,
        ProductCard4Component,
        JsonPipe,
    ]
})
export class CartComponent implements OnInit, OnDestroy {
  // Theme Views
  productCardViews: string;

  // Store Data
  carts: Cart[] = [];
  cartMaxQuantity: number = CART_MAX_QUANTITY;
  showMobileContent: boolean = false;
  isLoading: boolean = false;
  isLoadMore = false;
  isHydrated = false;
  products: Product[] = [];
  payMethod = 'card';
  form = { firstName: '', lastName: '', email: '', phoneCode: '🇮🇹 +39', phone: '', terms: false };

  // Pagination
  currentPage = 1;
  totalProducts = 0;
  productsPerPage = 5;

  // Inject
  private readonly appConfigService = inject(AppConfigService);
  private readonly reloadService = inject(ReloadService);
  private readonly userService = inject(UserService);
  private readonly cartService = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly uiService = inject(UiService);
  private readonly productPricePipe = inject(ProductPricePipe);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly gtmService = inject(GtmService);
  private readonly utilsService = inject(UtilsService);
  private readonly orderService = inject(OrderService);
  public readonly currencyService = inject(CurrencyService);

  // Subscriptions
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.carts = this.cartService?.cartItems;
    if (isPlatformBrowser(this.platformId)) {
      this.getCartsItems();
      this.trackPageViewEvent();
    }

    // Base Data
    this.checkHydrated();
    this.getSettingData();
  }

  /**
   * Initial Landing Page Setting
   * getSettingData()
   */

  private getSettingData() {
    const themeViewSettings: ThemeViewSetting[] =
      this.appConfigService.getSettingData('themeViewSettings');
    this.productCardViews = themeViewSettings
      .find((f) => f.type == 'productCardViews')
      .value.join();
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

  /**
   * HTTP Request Handle
   * getAllProducts()
   * getCartsItems()
   * getCarsItemFromLocal()
   * updateCartQty()
   * updateCart()
   */

  private getAllProducts(loadMore?: boolean) {
    const pagination: Pagination = {
      pageSize: Number(this.productsPerPage),
      currentPage: Number(this.currentPage) - 1,
    };
    const filterData: FilterData = {
      filter: { status: 'publish' },
      pagination: pagination,
      select: {
        name: 1,
        isVariation: 1,
        variation1: 1,
        variation: 1,
        variations: 1,
        variationsOptions: 1,
        variationOptions: 1,
        variation2Options: 1,
        variationList: 1,
        images: 1,
        prices: 1,
        tags: 1,
        slug: 1,
        salePrice: 1,
        quantity: 1,
        totalSold: 1,
        discountType: 1,
        discountAmount: 1,
        minimumWholesaleQuantity: 1,
        wholesalePrice: 1,
      },
      sort: { priority: -1 },
    };
    this.isLoading = true;
    const subscription = this.productService
      .getAllProducts(filterData, null)
      .subscribe({
        next: (res) => {
          this.isLoading = false;

          setTimeout(() => {
            this.isLoadMore = false;
          }, 500);

          if (loadMore) {
            this.products = [...this.products, ...res.data];
          } else {
            this.products = res.data;
          }
          this.totalProducts = res.count;
        },
        error: (err) => {
          this.isLoadMore = false;
          console.log(err);
        },
      });
    this.subscriptions?.push(subscription);
  }

  private getCartsItems(refresh?: boolean) {
    this.isLoading = true;
    if (this.userService.isUser) {
      const subscription = this.cartService.getCartByUser().subscribe({
        next: (res) => {
          // Ensure items have a defined selection state (default to selected)
          this.carts = (res.data || []).map((item) => ({
            ...item,
            isSelected: item?.isSelected ?? true,
          }));
          this.isLoading = false;

          this.cartService.updateCartList(this.carts);

          // Track view_cart event after carts are loaded
          if (isPlatformBrowser(this.platformId)) {
            this.trackViewCartEvent();
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.log(err);
        },
      });
      this.subscriptions?.push(subscription);
    } else {
      this.getCarsItemFromLocal(refresh);
    }
    this.getAllProducts();
  }

  private getCarsItemFromLocal(refresh?: boolean) {
    const items = this.cartService.getCartItemFromLocalStorage();
    if (items && items.length) {
      const ids: string[] = items.map((m) => m.product as string);
      const select =
        'name slug salePrice regularPrice images quantity category isVariation variationList minimumWholesaleQuantity wholesalePrice ';
      const subscription = this.productService
        .getProductByIds(ids, select)
        .subscribe({
          next: (res) => {
            const products = res.data;
            this.isLoading = false;

            if (products && products.length) {
              this.carts = items
                .map((t1) => ({
                  ...t1,
                  ...{ product: products.find((t2) => t2._id === t1.product) },
                }))
                .map((item) => ({
                  // Ensure items have a defined selection state (default to selected)
                  ...item,
                  isSelected: item?.isSelected ?? true,
                }));
              this.cartService.updateCartList(this.carts);

              // Track view_cart event after carts are loaded
              if (isPlatformBrowser(this.platformId)) {
                this.trackViewCartEvent();
              }
            }
            this.isLoading = false;
          },
          error: (error) => {
            this.isLoading = false;
            console.log(error);
          },
        });
      this.subscriptions?.push(subscription);
    } else {
      this.isLoading = false;
      this.carts = [];
      this.cartService.updateCartList(this.carts);

      // Track view_cart event even if cart is empty
      if (isPlatformBrowser(this.platformId)) {
        this.trackViewCartEvent();
      }
    }
  }

  private updateCartQty(cartId: string, data: any) {
    const subscription = this.cartService
      .updateCartQty(cartId, data)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.reloadService.needRefreshCart$();
          }
        },
        error: (err) => {
          console.log(err);
        },
      });
    this.subscriptions?.push(subscription);
  }

  private updateCart(data: any) {
    const subscription = this.cartService.updateCart(data).subscribe({
      next: () => {
        this.reloadService.needRefreshCart$();
      },
      error: (err) => {
        console.log(err);
      },
    });
    this.subscriptions?.push(subscription);
  }

  getProductImage(item: any): string {
    return (
      item?.variation?.image ||
      item?.product?.images?.[0] ||
      'https://cdn.saleecom.com/upload/images/placeholder.png'
    );
  }

  /**
   * Cart Methods
   * onIncrementQty()
   * onDecrementQty()
   * onDeleteCartItem()
   * toggleSelectAll()
   * onChangeSelect()
   * isSelectedCount()
   */
  onIncrementQty(cartId: string, index: number) {
    if (this.userService.isUser) {
      if (this.carts[index].selectedQty === this.cartMaxQuantity) {
        this.uiService.message(
          `Maximum product quantity is ${this.cartMaxQuantity}`,
          'warn'
        );
      } else {
        this.carts[index].selectedQty += 1;
        this.updateCartQty(cartId, { selectedQty: 1, type: 'increment' });
      }
    } else {
      const data = this.cartService.getCartItemFromLocalStorage();
      if (data && data[index].selectedQty !== this.cartMaxQuantity) {
        data[index].selectedQty += 1;
        this.carts[index].selectedQty += 1;
        this.cartService.updateCartItemFromLocalStorage(data);
      }
    }
  }

  onDecrementQty(cartId: string, index: number, sQty: number) {
    if (this.userService.isUser) {
      if (sQty === 1) {
        this.uiService.message('Minimum quantity is 1', 'warn');
      } else {
        this.carts[index].selectedQty -= 1;
        this.updateCartQty(cartId, { selectedQty: 1, type: 'decrement' });
      }
    } else {
      const data = this.cartService.getCartItemFromLocalStorage();
      if (data && data[index].selectedQty !== 1) {
        data[index].selectedQty -= 1;
        this.carts[index].selectedQty -= 1;
        this.cartService.updateCartItemFromLocalStorage(data);
      }
    }
  }

  onDeleteSingleCartItem(item: any) {
    if (this.userService.isUser) {
      this.cartService.deleteCartById(item._id).subscribe({
        next: () => {
          this.carts = this.carts.filter((cart) => {
            return typeof cart !== 'object' || cart?._id !== item._id;
          });
          this.reloadService.needRefreshCart$(true);
        },
        error: (error) => {
          console.error('Error deleting cart item:', error);
        },
      });
    } else {
      // For guest users, delete from local storage
      this.cartService.deleteCartItemFromLocalStorage([item.product._id]);
      this.carts = this.carts.filter((cart) => {
        return (
          typeof cart.product !== 'object' ||
          cart.product?._id !== item.product._id
        );
      });
      this.reloadService.needRefreshCart$(true);
    }
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.carts.forEach((item) => (item.isSelected = checked));
    if (this.userService.isUser) {
      const data = { ids: this.carts.map((m) => m._id), isSelected: checked };
      this.updateCart(data);
    } else {
      const data = this.cartService.getCartItemFromLocalStorage();
      if (data && data.length) {
        data.forEach((item) => (item.isSelected = checked));
        this.cartService.updateCartItemFromLocalStorage(data);
      }
    }
  }

  onChangeSelect(event: any, index: number) {
    if (this.userService.isUser) {
      const data = { ids: [this.carts[index]._id], isSelected: event };
      this.updateCart(data);
    } else {
      const data = this.cartService.getCartItemFromLocalStorage();
      if (data) {
        data[index].isSelected = event;
        this.carts[index].isSelected = event;
        this.cartService.updateCartItemFromLocalStorage(data);
      }
    }
  }

  get isSelectedCount() {
    return this.carts.filter((f) => f.isSelected).length;
  }

  /**
   * Bottom Tab View
   * openSummeryBottomSheet()
   */

  openSummeryBottomSheet() {
    const mData = {
      cartRegularSubTotal: this.cartRegularSubTotal,
      cartDiscountAmount: this.cartDiscountAmount,
      cartSaleSubTotal: this.cartSaleSubTotal,
    };
    this.bottomSheet.open(OrderSummaryComponent, {
      data: mData,
    });
  }

  /**
   * Calculation
   * cartRegularSubTotal()
   * cartSaleSubTotal()
   * cartDiscountAmount()
   */

  get cartRegularSubTotal(): number {
    return this.carts
      .filter((item) => !!item?.isSelected)
      .map((item) => {
        return this.productPricePipe.transform(
          item.product,
          'regularPrice',
          item.variation?._id,
          item.selectedQty
        ) as number;
      })
      .reduce((acc, value) => acc + value, 0);
  }

  get cartSaleSubTotal(): number {
    return this.carts
      .filter((item) => !!item?.isSelected)
      .map((item) => {
        return this.productPricePipe.transform(
          item.product,
          'salePrice',
          item.variation?._id,
          item.selectedQty,
          item?.isWholesale
        ) as number;
      })
      .reduce((acc, value) => acc + value, 0);
  }

  get cartDiscountAmount(): number {
    return this.carts
      .filter((item) => !!item?.isSelected)
      .map((item) => {
        return this.productPricePipe.transform(
          item.product,
          'discountAmount',
          item.variation?._id,
          item.selectedQty,
          item?.isWholesale
        ) as number;
      })
      .reduce((acc, value) => acc + value, 0);
  }

  /**
   * Analytics Events
   * trackPageViewEvent()
   * trackViewCartEvent()
   */

  private trackPageViewEvent(): void {
    if (!this.gtmService.tagManagerId) return;

    const page_url = window.location.href;
    const page_title = document.title;
    const referrer = document.referrer || undefined;

    this.gtmService.pushToDataLayer({
      event: 'page_view',
      page_data: {
        url: page_url,
        title: page_title,
        referrer: referrer,
      },
    });
  }

  private trackViewCartEvent(): void {
    if (!this.gtmService.tagManagerId || !this.carts || this.carts.length === 0) return;

    // Calculate total value and prepare items array
    const items = this.carts
      .filter((item) => {
        // Ensure product is an object, not a string
        return item?.product &&
               typeof item.product === 'object' &&
               item?.isSelected !== false;
      })
      .map((item) => {
        const product = item.product as Product;
        const unitPrice = this.productPricePipe.transform(
          product,
          'salePrice',
          item.variation?._id,
          1,
          item?.isWholesale
        ) as number;

        return {
          item_id: product?._id,
          item_name: product?.name,
          item_category: Array.isArray(product?.category) ? product.category[0]?.name : (product?.category as any)?.name,
          item_category2: product?.subCategory?.name,
          price: unitPrice || 0,
          quantity: item.selectedQty || 1,
        };
      })
      .filter((item) => item.item_id); // Filter out invalid items

    if (items.length === 0) return;

    // Calculate total value
    const totalValue = items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    // Push GA4 view_cart event
    this.gtmService.pushToDataLayer({
      event: 'view_cart',
      currency: 'BDT',
      value: totalValue,
      items: items,
    });
  }

  /**
   * On Destroy
   */
  placeOrder() {
    if (!this.carts.length) {
      this.uiService.message('Empty Cart! Sorry, your cart is empty.', "warn");
      return;
    }

    if (!this.form.firstName || !this.form.lastName) {
      this.uiService.message('Please enter traveler name', "warn");
      return;
    }

    if (!this.form.email) {
      this.uiService.message('Please enter traveler email', "warn");
      return;
    }

    if (!this.form.phone) {
      this.uiService.message('Please enter traveler phone number', "warn");
      return;
    }

    if (!this.form.terms) {
      this.uiService.message('Please agree to the Terms & Conditions', "warn");
      return;
    }

    const data: any = {
      orderType: this.userService.isUser ? 'user' : 'anonymous',
      carts: this.carts.map(m => m._id),
      name: `${this.form.firstName} ${this.form.lastName}`,
      phoneNo: `${this.form.phoneCode} ${this.form.phone}`,
      shippingAddress: 'Online Tour Booking',
      division: 'Rome',
      area: 'Lazio',
      zone: 'Italy',
      addressType: 'Home',
      email: this.form.email,
      providerName: this.payMethod,
      note: '',
      deliveryType: 'Standard',
    };

    this.isLoading = true;
    this.orderService.addOrder(data, this.userService.isUser).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          if (this.userService.isUser) {
             this.reloadService.needRefreshCart$(true);
          } else {
             this.cartService.deleteCartItemFromLocalStorage(this.carts.map(m => m.product._id));
             this.reloadService.needRefreshCart$(true);
          }
          this.router.navigate(['/success-order'], { queryParams: { orderId: res.data._id } });
        } else {
          this.uiService.message(res.message, 'warn');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        this.uiService.message('Failed to confirm order. Please try again.', 'warn');
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
  }
}
