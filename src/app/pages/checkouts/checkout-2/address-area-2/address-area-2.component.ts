import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AsyncPipe, CommonModule, NgClass, TitleCasePipe } from "@angular/common";
import {
  Component,
  EventEmitter,
  inject,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  NgForm,
  ReactiveFormsModule,
  ValidationErrors, ValidatorFn,
  Validators
} from '@angular/forms';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from "@angular/material/input";
import { MatRadioButton, MatRadioGroup } from "@angular/material/radio";
import { MatSelectModule } from '@angular/material/select';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ADDRESS_TYPES } from '../../../../core/utils/app-data';
import { Division } from '../../../../interfaces/common/division.interface';
import { DeliveryCharge } from '../../../../interfaces/common/setting.interface';
import { User, UserAddress } from '../../../../interfaces/common/user.interface';
import { FilterData } from '../../../../interfaces/core/filter-data';
import { Select } from '../../../../interfaces/core/select';
import { UserDataService } from '../../../../services/common/user-data.service';
import { UserService } from '../../../../services/common/user.service';
import { CurrencyCtrPipe } from '../../../../shared/pipes/currency.pipe';
import { TranslatePipe } from "../../../../shared/pipes/translate.pipe";

@Component({
  selector: 'app-address-area-2',
  templateUrl: './address-area-2.component.html',
  standalone: true,
  imports: [
    CommonModule,
    TitleCasePipe,
    NgClass,
    ReactiveFormsModule,
    FormsModule,
    AsyncPipe,
    TranslatePipe,
    CurrencyCtrPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatRadioGroup,
    MatRadioButton,
    MatIconModule,
  ],
  styleUrl: './address-area-2.component.scss'
})
export class AddressArea2Component implements OnInit, OnChanges, OnDestroy {

  // Decorator
  @Input() user: User;
  // @Input() cityName!: string;
  @Input() needRefreshForm: boolean = false;
  @Input() deliveryOptionType!: any;
  @Input() productSetting!: any;
  @Input() orderPhoneValidation!: any;
  @Input() deliveryCharge: DeliveryCharge;
  @Output() formData = new EventEmitter<any>();
  @ViewChild('formElement') formElement: NgForm;
  @Input() country: any;

  filteredDivisions$ = new BehaviorSubject<any[]>([]);
  // divisionControl = new FormControl('');

  // Store Data
  addressTypes: Select[] = ADDRESS_TYPES;
  selectedAddress: UserAddress;
  addresses: UserAddress[] = [];
  titleData = 'Delivery Address';
  titleDataForDeliveryOption = 'Select Delivery Option';
  divisions?: Division[] = [];
  selectedCityOption: string | null = null;
  isMobile = false;
  isLoadingPhoneNo: boolean = false;

  // Form Control
  dataForm: FormGroup;


  private readonly userDataService = inject(UserDataService);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly bottomSheet = inject(MatBottomSheet);
  private breakpointObserver = inject(BreakpointObserver);
  @Inject(PLATFORM_ID) private platformId: Object;


  // Subscriptions
  private subscriptions: Subscription[] = [];


  ngOnInit() {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
    });

    // this.dataForm = this.fb.group({
    //   addressType: [''],
    //   name: ['', Validators.required],
    //   phoneNo: ['',[Validators.required, this.mobileOrEmailValidator]],
    //   division: [''],
    //   area: [''],
    //   zone: [''],
    //   shippingAddress: [''],
    //   email: [''],
    // });

    this.dataForm = this.fb.group({
      addressType: [''],
      name: ['', Validators.required],
      phoneNo: ['', [Validators.required, this.mobileOrEmailValidator]],
      division: [
        (
          (this.deliveryOptionType?.isEnableInsideCityOutsideCity ?? true) &&
          this.productSetting?.productType !== 'digitalProduct'
        )
          ? 'outside-dhaka'
          : ''
      ],
      area: [''],
      zone: [''],
      shippingAddress: [''],
      email: [''],
    });


    // ✅ INITIAL PHONE VALIDATOR SETUP
    this.setPhoneNoValidator();

    this.dataForm.valueChanges.subscribe((value) => {
      if (this.productSetting?.productType === 'digitalProduct') {
        if (!this.productSetting?.digitalProduct?.isAddressEnable) {
          this.dataForm.get('shippingAddress')?.setValue('N/A', { emitEvent: false });
        }

        if (!this.productSetting?.digitalProduct?.isDivisionEnable) {
          this.dataForm.get('division')?.setValue('outside-dhaka', { emitEvent: false });
        }

        this.formData.emit(this.dataForm.getRawValue());
      } else {
        // Validate phone number before emitting
        this.validatePhoneNumber();
        this.formData.emit(value);
      }
    });

    // Base Data
    if (this.userService.isUser) {
      this.getUserAddress();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.needRefreshForm) {
      // console.log('ddd')
      this.dataForm.markAllAsTouched();
    }
    if (this.user && !this.addresses.length) {
      this.dataForm.patchValue({ name: this.user?.name, phoneNo: this.user?.phoneNo });
    }

    // ✅ Country চেঞ্জ হলে Validator রিফ্রেশ করো
    if (this.orderPhoneValidation) {
      this.setPhoneNoValidator();
    }
  }

  phoneOnInput(e: Event) {
    const el = e.target as HTMLInputElement;
    let v = this.toLocalBdPhone(el.value);

    el.value = v;
    const ctrl = this.dataForm.get('phoneNo')!;
    ctrl.setValue(v, { emitEvent: false });

    // mustStart01 চেক
    if (v && !v.startsWith('01')) {
      this.setCtrlError(ctrl, 'mustStart01');
    } else {
      this.clearCtrlError(ctrl, 'mustStart01');
    }

    // valid হলে API কল
    if (/^01[3-9]\d{8}$/.test(v)) {
      this.isLoadingPhoneNo = true;
      this.handlePhoneNumberFilled({ phoneNo: v });
    }
  }

  phoneOnPaste(e: ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') || '';
    const v = this.toLocalBdPhone(text);

    const ctrl = this.dataForm.get('phoneNo')!;
    ctrl.setValue(v);
    ctrl.markAsTouched();

    if (/^01[3-9]\d{8}$/.test(v)) {
      this.isLoadingPhoneNo = true;
      this.handlePhoneNumberFilled({ phoneNo: v });
    } else {
      this.setCtrlError(ctrl, 'mustStart01');
    }
  }

  // ---------- Helper ----------

  private setCtrlError(ctrl: AbstractControl, key: string, value: any = true) {
    const existing = (ctrl.errors || {}) as ValidationErrors;
    ctrl.setErrors({ ...existing, [key]: value });
    ctrl.markAsTouched();
  }

  private toLocalBdPhone(raw: string): string {
    let d = (raw || '').replace(/\D+/g, ''); // শুধু digit রাখো

    if (d.startsWith('00880')) d = d.slice(5);
    else if (d.startsWith('880')) d = d.slice(3);

    if (d.startsWith('1')) d = '0' + d;

    return d.slice(0, 11); // সর্বোচ্চ ১১ digit
  }
  private clearCtrlError(ctrl: AbstractControl, key: string) {
    const existing = { ...(ctrl.errors || {}) } as ValidationErrors;
    delete (existing as any)[key]; // bracket notation ব্যবহার করো
    ctrl.setErrors(Object.keys(existing).length ? existing : null);
  }

  handlePhoneNumberFilled(data: any): void {
    // Call your function and stop the spinner after completion
    setTimeout(() => {
      // this.getUserDataByPhoneNo(data)
    }, 1000); // Simulating API call or function processing delay
  }

  // getUserDataByPhoneNo(data: any) {
  //   const subscription = this.orderService.getUserDataByPhoneNo(data)
  //     .subscribe({
  //       next: async res => {
  //         this.isLoadingPhoneNo = false;
  //         if (res.success) {
  //           this.dataForm.patchValue({shippingAddress: res.data?.shippingAddress})
  //           // console.log(res.data?.shippingAddress)
  //         } else {
  //           this.uiService.message(res.message, 'warn');
  //         }
  //       },
  //       error: err => {
  //         this.uiService.message(err?.error?.message[0], 'wrong');
  //         this.isLoadingPhoneNo = false;
  //         console.log(err)
  //       }
  //     })
  //   this.subscriptions.push(subscription);
  // }


  // setPhoneNoValidator() {
  //   if (!this.dataForm) return; // dataForm না থাকলে কিছু করো না
  //   const phoneNoControl = this.dataForm.get('phoneNo');
  //   phoneNoControl?.clearValidators();
  //
  //   if (this.country?.code === 'BD') {
  //     phoneNoControl?.setValidators([Validators.required, this.mobileOrEmailValidator]);
  //   } else {
  //     phoneNoControl?.setValidators([]); // বা ফাঁকা রাখতে পারো, যদি অন্য দেশে ফোন না লাগে
  //   }
  //
  //   phoneNoControl?.updateValueAndValidity();
  // }
  setPhoneNoValidator() {
    if (!this.dataForm) return;

    const phoneNoControl = this.dataForm.get('phoneNo');
    phoneNoControl?.clearValidators();

    if (this.orderPhoneValidation?.isEnableOutsideBd) {
      // ✅ Outside BD হলে config অনুযায়ী min/max
      const validators = [Validators.required];

      if (this.orderPhoneValidation?.minLength) {
        validators.push(Validators.minLength(this.orderPhoneValidation.minLength));
      }
      if (this.orderPhoneValidation?.maxLength) {
        validators.push(Validators.maxLength(this.orderPhoneValidation.maxLength));
      }

      phoneNoControl?.setValidators(validators);
    } else {
      // ✅ Bangladesh হলে regex validation
      phoneNoControl?.setValidators([
        Validators.required,
        this.mobileOrEmailValidator
      ]);
    }

    phoneNoControl?.updateValueAndValidity();
  }


  private getUserAddress() {
    const subscription = this.userDataService.getUserAddress().subscribe({
      next: res => {
        this.addresses = res.data;
        this.getNextAddressType();
        if (this.addresses.length) {
          this.selectedAddress = this.addresses[0];
          this.dataForm.patchValue(this.selectedAddress);
        }
      },
      error: err => {
        console.log(err);
      }
    });
    this.subscriptions?.push(subscription);
  }


  /***
   * On Selection Change
   * onChangeDivision()
   * onChangeArea()
   */

  onSelectAddress(item: UserAddress) {
    this.selectedAddress = item;
    this.dataForm.patchValue(this.selectedAddress);
  }

  onAddNewAddress() {
    this.selectedAddress = null;
    this.formElement.resetForm();
    this.getNextAddressType();
  }

  getNextAddressType() {
    const usedTypes = this.addresses.map(addr => addr.addressType);
    const unusedType = this.addressTypes.find(type => !usedTypes.includes(type.value));
    const result = unusedType ? unusedType.value : null;
    this.dataForm.patchValue({ addressType: result });
  }

  private filterDivisions(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.divisions.filter(division =>
      division.name.toLowerCase().includes(filterValue)
    );
  }


  restrictMaxLength(event: any): void {
    const input = event.target;
    if (input.value.length > 11) {
      input.value = input.value.slice(0, 11);
    }
    this.dataForm.get('phoneNo')?.setValue(input.value);
  }

  mobileOrEmailValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    const isMobile = /^(?:\+88)?01[3-9]\d{8}$/.test(value);

    if (!isMobile) {
      return { invalidInput: true };
    }
    if (isMobile && value.length > 11) {
      return { maxlength: true };
    }
    return null;
  }

  private validatePhoneNumber(): void {
    if (!this.dataForm) return;

    const phoneNoControl = this.dataForm.get('phoneNo');
    if (!phoneNoControl) return;

    const phoneNo = phoneNoControl.value || '';

    // Only validate for Bangladesh
    if (this.country?.code === 'BD' && phoneNo) {
      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      if (!bdPhoneRegex.test(phoneNo)) {
        phoneNoControl.setErrors({ invalidInput: true });
        phoneNoControl.markAsTouched();
      } else {
        // Clear invalidInput error if phone is valid
        const errors = { ...phoneNoControl.errors };
        delete errors['invalidInput'];
        phoneNoControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
  }

  /**
   * On Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach(sub => sub?.unsubscribe());
  }

}
