import {Component, ElementRef, HostListener, inject, Input, PLATFORM_ID,} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {isPlatformBrowser, NgClass, NgOptimizedImage} from '@angular/common';
import {ShopInformation} from '../../../../../interfaces/common/shop-information.interface';
import {Subscription, timer} from 'rxjs';
import {TagService} from '../../../../../services/common/tag.service';
import {AppConfigService} from '../../../../../services/core/app-config.service';
import {ImgCtrlPipe} from '../../../../pipes/img-ctrl.pipe';
import {Title} from '@angular/platform-browser';
import {UtilsService} from '../../../../../services/core/utils.service';

@Component({
    selector: 'app-bottom-navbar-2',
    imports: [RouterLink, RouterLinkActive, NgClass, ImgCtrlPipe, NgOptimizedImage],
    templateUrl: './bottom-navbar-2.component.html',
    styleUrl: './bottom-navbar-2.component.scss'
})
export class BottomNavbar2Component {
  // Decorator
  @Input() currentUrl: string;
  @Input() shopInfo: ShopInformation;
  @Input() chatLink: any;
  @Input() tag: any;
  @Input() index: number = 0;
  @Input() tags: any[]; // Receive tags from parent for dynamic menu
  private observer!: IntersectionObserver;

  products: any[] = [];
  private subscriptions: Subscription[] = [];
  // Store Data
  isLoading: boolean = true;
  chatStyle: boolean = false;
  protected pageTitle: string = '';
  protected pageLink: string = '';
  protected msg: string = 'Hello!%20I%20need%20help%20with%20your%20services';

  // For responsive logo images (same as header-sm-1)
  protected readonly rawSrcset: string = '384w, 640w';

  private readonly title = inject(Title);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly tagService = inject(TagService);
  private readonly appConfigService = inject(AppConfigService);
  private readonly router = inject(Router);
  private readonly utilsService = inject(UtilsService);

  //  private readonly appConfigService = inject(AppConfigService);
  // private readonly navigationService = inject(NavigationService);
  /**
   * Other Methods
   * isVisible
   * getSocialLink()
   * onClick()
   * chatOpen()
   **/

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupIntersectionObserver();
      // this.setupRouteChangeTracking();
    } else {
      // Fallback for SSR - Load without intersection
      this.loadProducts();
    }
  }

  protected get shopId(): string {
    return this.appConfigService.getSettingData('shop');
  }

  private setupRouteChangeTracking(): void {
    const subscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.getTest();
      }
    });
    this.subscriptions.push(subscription);
  }

  private getTest() {
    // 3️⃣ Prepare custom_data
    setTimeout(() => {
      this.pageTitle = this.title.getTitle();
      this.pageLink = this.utilsService.removeUrlQuery(this.router.url);

      if (this.pageTitle !== '/') {
        this.msg = this.pageTitle;
      }
      // const page_title = document.title;
      // const referrer = document.referrer || 'N/A';

      console.log('pageTitle', this.pageTitle);
      console.log('pageLink', this.pageLink);
    }, 500)

  }


  get isVisible() {
    return (
      !['/cart', '/checkout', '/easy-checkout'].includes(this.currentUrl) &&
      !this.currentUrl.startsWith('/product-details/')
    );
  }

  getSocialLink(type: string): any {
    switch (type) {
      case 'messenger':
        return this.chatLink?.find((f) => f.chatType === 'messenger') ?? null;
      case 'whatsapp':
        return this.chatLink?.find((f) => f.chatType === 'whatsapp') ?? null;
      case 'phone':
        return this.chatLink?.find((f) => f.chatType === 'phone') ?? null;
      default:
        return null;
    }
  }

  loadProducts() {
    const delayTime = this.index * 200; // 200ms delay per tag index
    timer(delayTime).subscribe(() => {
      // Adds a 200ms delay before loading products
      // this.getAllProducts();
      this.getAllTags();
    });
  }

  getAllTags() {
    const subscription = this.tagService.getAllTags()
      .subscribe({
        next: res => {
          this.tags = res.data;
        },
        error: (err) => {
          console.log(err)
        }
      });
    this.subscriptions?.push(subscription);
  }

  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadProducts();
          this.observer.disconnect();
        }
      });
    });
    this.observer.observe(this.el.nativeElement);
  }

  // private getAllProducts() {
  //   const subscription = this.productService
  //     .getAllProductsByUi(
  //       { status: 'publish', 'tags.name': this.tag?.name },
  //       1,
  //       6
  //     )
  //     .subscribe({
  //       next: (res) => {
  //         this.products = res.data;
  //         this.isLoading = false;
  //       },
  //       error: (err) => {
  //         console.log(err);
  //         this.isLoading = false;
  //       },
  //     });
  //   this.subscriptions.push(subscription);
  // }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.chat')) {
      this.chatStyle = false;
    }
  }

  chatOpen() {
    this.chatStyle = !this.chatStyle;
  }

  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    document.body.style.overflow = this.isSidebarOpen ? 'hidden' : 'auto';
  }
}
