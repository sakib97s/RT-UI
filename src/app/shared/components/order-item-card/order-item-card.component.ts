import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CART_MAX_QUANTITY } from '../../../core/utils/app-data';
import { CartService } from '../../../services/common/cart.service';
import { UserService } from '../../../services/common/user.service';
import { ReloadService } from '../../../services/core/reload.service';
import { OnlyNumberDirective } from '../../directives/number-only.directive';
import { CurrencyCtrPipe } from '../../pipes/currency.pipe';
import { ProductPricePipe } from '../../pipes/product-price.pipe';
import { VariationInfoInlinePipe } from '../../pipes/variation-info-inline.pipe';

@Component({
    selector: 'app-order-item-card',
    templateUrl: './order-item-card.component.html',
    styleUrl: './order-item-card.component.scss',
    imports: [
        OnlyNumberDirective,
        FormsModule,
        VariationInfoInlinePipe,
        ProductPricePipe,
        CurrencyCtrPipe,
    ]
})
export class OrderItemCardComponent implements OnInit, OnDestroy {
  // Decorator
  @Input() data: any;
  @Output() private onIncrementCartQty = new EventEmitter<string>();
  @Output() private onDecrementCartQty = new EventEmitter<string>();

  // Store Data
  readonly cartMaxQuantity: number = CART_MAX_QUANTITY;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Inject
  private readonly userService = inject(UserService);
  private readonly cartService = inject(CartService);
  private readonly reloadService = inject(ReloadService);

  ngOnInit() {
    const subscription = this.reloadService.refreshCart$.subscribe(
      (isRefresh) => {
        if (isRefresh) {
          this.data;
        }
      }
    );
    this.subscriptions?.push(subscription);
  }

  /**
   * Cart Methods
   * onIncrementQty()
   * onDecrementQty()
   */

  onIncrementQty(cartId: string) {
    this.onIncrementCartQty.emit(cartId);
  }

  onDecrementQty(cartId: string) {
    this.onDecrementCartQty.emit(cartId);
  }

  onDeleteSingleCartItem(item: any) {
    if (this.userService.isUser) {
      this.cartService.deleteCartById(item._id).subscribe({
        next: () => {
          this.reloadService.needRefreshCart$(true);
        },
        error: (error) => {
          console.error('Error deleting cart item:', error);
        },
      });
    } else {
      // For guest users, delete from local storage
      this.cartService.deleteCartItemFromLocalStorage([item.product._id]);

      this.reloadService.needRefreshCart$(true);
    }
  }

  getProductImage(item: any): string {
    return (
      item?.variation?.image ||
      item?.product?.images?.[0] ||
      'https://cdn.saleecom.com/upload/images/placeholder.png'
    );
  }

  /**
   * On Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
  }
}
