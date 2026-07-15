
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output, DOCUMENT } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Product, VariationList } from '../../../interfaces/common/product.interface';
import { OrderService } from '../../../services/common/order.service';
import { SettingService } from '../../../services/common/setting.service';
import { UserService } from '../../../services/common/user.service';
import { UiService } from '../../../services/core/ui.service';
import { FileUploadService } from '../../../services/gallery/file-upload.service';
import { CurrencyCtrPipe } from "../../pipes/currency.pipe";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { ProductPricePipe } from "../../pipes/product-price.pipe";
import { PricePipe } from "../../pipes/price.pipe";
import { Coupon } from '../../../interfaces/common/coupon.interface';
import { DiscountTypeEnum } from '../../../enum/product.enum';
import { AppConfigService } from "../../../services/core/app-config.service";

@Component({
    selector: 'app-custom-order-modal',
    templateUrl: './custom-order-modal.component.html',
    styleUrl: './custom-order-modal.component.scss',
    imports: [ReactiveFormsModule, FormsModule, CurrencyCtrPipe, TranslatePipe, ProductPricePipe],
    providers: [PricePipe]
})
export class CustomOrderModalComponent implements OnInit, OnDestroy {
  @Input() product: Product = null;
  @Input() selectedVariationList: VariationList = null;
  @Input() quantity: number = 1;
  @Input() selectedVariation: string = null;
  @Input() selectedVariation2: string = null;
  @Input() isVisible: boolean = false;
  @Input() isCustomProduct!: any;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() orderSubmitted = new EventEmitter<any>();
  @Output() variationSelected = new EventEmitter<any>();

  customOrderForm: FormGroup;
  selectedCustomSize: string = null;
  selectedImage: File = null;
  uploadedImageUrl: string = null;
  prefilledName: string = '';
  prefilledPhone: string = '';
  isSubmittingOrder = false;
  deliveryChargeAmount: number = 0;
  deliveryCharge: any = null;
  allowedShopIds1 = ['692d89a8597c97480fcceb9f'];
  // isEnableOrderNote: boolean = false;

  // Local state for variations
  localSelectedVariation: string = null;
  localSelectedVariation2: string = null;

  // Coupon variables
  couponCode: string = '';
  couponDiscount: number = 0;
  coupon: Coupon = null;
  isCoupon: boolean = false;

  private subscriptions: Subscription[] = [];

  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly uiService = inject(UiService);
  private readonly router = inject(Router);
  private readonly pricePipe = inject(PricePipe);
  private readonly orderService = inject(OrderService);
  private readonly settingService = inject(SettingService);
  private readonly document = inject(DOCUMENT);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly appConfigService = inject(AppConfigService);

  ngOnInit() {
    this.initCustomOrderForm();
    this.prefilledName = this.userService.getUserLocalDataByField('name') || '';
    this.prefilledPhone = this.userService.getUserLocalDataByField('phoneNo') || '';
    this.getDeliveryCharges();
    // this.getOrderNoteSetting();

    // Initialize local variation state from inputs
    this.localSelectedVariation = this.selectedVariation;
    this.localSelectedVariation2 = this.selectedVariation2;
  }

  // private getOrderNoteSetting() {
  //   const subscription = this.settingService.getSetting()
  //     .subscribe({
  //       next: (res) => {
  //         if (res.data) {
  //           this.isEnableOrderNote = res.data.orderSetting?.isEnableOrderNote || false;
  //         }
  //       },
  //       error: (err) => {
  //         console.error('Failed to get order note setting:', err);
  //       }
  //     });
  //   this.subscriptions.push(subscription);
  // }

  private initCustomOrderForm() {
    this.customOrderForm = this.fb.group({
      name: ['', Validators.required],
      phoneNo: ['', [Validators.required, Validators.minLength(11)]],
      address: ['', Validators.required],
      deliveryArea: ['outside-dhaka', Validators.required],
      deliveryNote: [''],
    });

    // Set prefilled values
    if (this.prefilledName) {
      this.customOrderForm.patchValue({ name: this.prefilledName });
    }
    if (this.prefilledPhone) {
      this.customOrderForm.patchValue({ phoneNo: this.prefilledPhone });
    }
  }

  onSelectCustomSize(size: string) {
    this.selectedCustomSize = size;
  }

  // ===== Variation Selection Methods =====
  onSelectVariation(variation: string) {
    this.localSelectedVariation = variation;
    this.updateSelectedVariationList();
    this.variationSelected.emit({ variation: this.localSelectedVariation, variation2: this.localSelectedVariation2 });
  }

  onSelectVariation2(variation: string) {
    this.localSelectedVariation2 = variation;
    this.updateSelectedVariationList();
    this.variationSelected.emit({ variation: this.localSelectedVariation, variation2: this.localSelectedVariation2 });
  }

  private updateSelectedVariationList() {
    if (!this.product?.variationList) return;

    // Find the matching variation in the list
    this.selectedVariationList = this.product.variationList.find(v => {
      if (this.product?.variation && this.product?.variation2) {
        return v.name.toLowerCase().includes(this.localSelectedVariation?.toLowerCase()) &&
          v.name.toLowerCase().includes(this.localSelectedVariation2?.toLowerCase());
      } else if (this.product?.variation) {
        return v.name.toLowerCase().includes(this.localSelectedVariation?.toLowerCase());
      }
      return false;
    }) || null;
  }

  convertToLowercase(inputString: string): string {
    return inputString?.toLowerCase()?.trim();
  }

  getVariationImage(name: string): string | undefined {
    return this.product?.variationList?.find((v) =>
      v?.name.toLowerCase().includes(name.toLowerCase())
    )?.image;
  }

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
      this.uploadImage(file);
    }
  }

  private uploadImage(file: File) {
    const folderPath = 'order-images';
    const fileName = `${Date.now()}-${file.name}`;

    const subscription = this.fileUploadService
      .uploadSingleImage({
        folderPath,
        file,
        fileName
      })
      .subscribe({
        next: (res) => {
          this.uploadedImageUrl = res.url;
        },
        error: (err) => {
          console.error('Image upload failed:', err);
          this.uiService.message('Failed to upload image', 'warn');
        }
      });

    this.subscriptions.push(subscription);
  }

  closeModal() {
    this.isVisible = false;
    this.isSubmittingOrder = false;
    this.selectedImage = null;
    this.uploadedImageUrl = null;
    this.selectedCustomSize = null;
    // Reset form but keep prefilled data
    this.customOrderForm.patchValue({
      name: this.prefilledName || '',
      phoneNo: this.prefilledPhone || '',
      address: '',
      deliveryArea: 'outside-dhaka'
    });
    // Mark all fields as untouched
    Object.keys(this.customOrderForm.controls).forEach(key => {
      this.customOrderForm.get(key)?.markAsUntouched();
    });
    this.updateDeliveryCharge();
    this.closeEvent.emit();
  }

  onSubmitCustomOrder(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.isSubmittingOrder) {
      return;
    }

    // Mark all fields as touched to show validation errors
    Object.keys(this.customOrderForm.controls).forEach(key => {
      this.customOrderForm.get(key)?.markAsTouched();
    });

    if (this.product?.isVariation && !this.selectedVariationList) {
      this.uiService.message('Please select all required variations', 'warn');
      return;
    }

    if (this.customOrderForm.invalid) {
      // Scroll to first error field
      const firstErrorField = document.querySelector('.form-input.error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    this.isSubmittingOrder = true;
    const formData = this.customOrderForm.value;

    this.processCustomOrder({
      productId: this.product._id,
      quantity: this.quantity,
      size: this.selectedCustomSize,
      name: formData.name,
      phoneNo: formData.phoneNo,
      address: formData.address,
      deliveryArea: formData.deliveryArea,
      image: this.selectedImage,
    });
  }

  private processCustomOrder(orderData: any) {
    const cartData = {
      product: this.product._id,
      selectedQty: this.quantity,
      variation: this.selectedVariationList || null,
      customFields: {
        size: orderData.size,
        name: orderData.name,
        phoneNo: orderData.phoneNo,
        address: orderData.address,
        deliveryArea: orderData.deliveryArea,
      }
    };

    let productPrice = 0;
    if (this.selectedVariationList) {
      productPrice = this.selectedVariationList.salePrice || 0;
    } else {
      productPrice = this.product.salePrice || 0;
    }
    const subtotal = productPrice * this.quantity;
    const grandTotal = subtotal + this.deliveryChargeAmount - this.couponDiscount;

    const orderPayload: any = {
      user: null,
      orderType: 'anonymous',
      carts: [this.product._id],
      cartData: [cartData],
      name: orderData.name,
      phoneNo: orderData.phoneNo,
      shippingAddress: orderData.address,
      division: orderData.deliveryArea,
      orderFrom: 'Website',
      providerName: 'Cash on Delivery',
      deliveryType: 'regular',
      deliveryCharge: this.deliveryChargeAmount,
      subTotal: subtotal,
      grandTotal: grandTotal,
      coupon: this.coupon ? this.coupon._id : null,
      couponDiscount: this.couponDiscount,
      needSaveAddress: true,
      orderImages: this.uploadedImageUrl ? [this.uploadedImageUrl] : [],
      deliveryNote: this.customOrderForm.get('deliveryNote')?.value || '',
    };

    if (this.userService.isUser) {
      // orderPayload.user = this.userService.getUserLocalDataByField('userId');
      orderPayload.email = this.userService.getUserLocalDataByField('email');
    }

    this.closeModal();

    const subscription = this.orderService.addOrder(orderPayload, false).subscribe({
      next: (res) => {
        this.isSubmittingOrder = false;

        if (res.success) {
          this.uiService.message('Order placed successfully!', 'success');
          this.orderSubmitted.emit(res.data);

          switch (res.data.providerName) {
            case 'Cash on Delivery':
              this.router.navigate(['/success-order'], {
                queryParams: { orderId: res.data.orderId },
              }).then();
              break;
            case 'Bkash':
              if (res.data.link) {
                this.document.location.href = res.data.link;
              }
              break;
            case 'SSl Commerz':
              if (res.data.link) {
                this.document.location.href = res.data.link;
              }
              break;
          }
        } else {
          this.uiService.message(res.message || 'Order failed', 'warn');
        }
      },
      error: (error) => {
        console.log(error);
        this.isSubmittingOrder = false;
        this.uiService.message('Order failed, please try again', 'warn');
      }
    });

    this.subscriptions?.push(subscription);
  }

  private getDeliveryCharges() {
    const subscription = this.settingService.getDeliveryChargesEasyCheckout(null)
      .subscribe({
        next: (res) => {
          if (res.data && res.data.length > 0) {
            const regularCharge = res.data.find(dc => dc.type === 'regular') || res.data[0];
            this.deliveryCharge = regularCharge;
            this.updateDeliveryCharge();
          }
        },
        error: (err) => {
          console.log(err);
        }
      });
    this.subscriptions?.push(subscription);
  }

  private updateDeliveryCharge() {
    const selectedArea = this.customOrderForm?.value?.deliveryArea;

    if (!this.deliveryCharge) {
      this.deliveryChargeAmount = 0;
      return;
    }

    const isInside = selectedArea === (this.deliveryCharge?.city || 'Dhaka');

    if (isInside) {
      this.deliveryChargeAmount = this.deliveryCharge?.insideCity || 0;
    } else {
      this.deliveryChargeAmount = this.deliveryCharge?.outsideCity || 0;
    }
  }

  onDeliveryAreaChange() {
    this.updateDeliveryCharge();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}