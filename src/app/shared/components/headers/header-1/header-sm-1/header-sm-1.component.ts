import {Component, HostListener, inject, Input, ViewChild} from '@angular/core';
import {RouterLink} from "@angular/router";
import {Cart} from '../../../../../interfaces/common/cart.interface';
import {NavigationService} from '../../../../../services/core/navigation.service';
import {ImgCtrlPipe} from '../../../../pipes/img-ctrl.pipe';
import {CommonModule, NgClass, NgIf, NgOptimizedImage} from '@angular/common';
import {AppConfigService} from '../../../../../services/core/app-config.service';
import {SideNavComponent} from "./side-nav/side-nav.component";

@Component({
  selector: 'app-header-sm-1',
  standalone: true,
  imports: [
    RouterLink,
    ImgCtrlPipe,
    NgOptimizedImage,
    NgIf,
    CommonModule,
    NgClass,
    SideNavComponent
  ],
  templateUrl: './header-sm-1.component.html',
  styleUrl: './header-sm-1.component.scss'
})
export class HeaderSm1Component {
  @ViewChild('sideNav') sideNav!: SideNavComponent;
  menuOpen = false;

  // Theme Settings
  searchHints: string[] = [];

  // Decorator
  @Input() currentUrl: string;
  @Input() carts: Cart[] = [];
  @Input() shopInfo: any;
  @Input() categories: any;
  @Input() bottomNavViews: any;

  // Store Data
  protected readonly rawSrcset: string = '384w, 640w';
  isHeaderFixed: boolean = false;
  isHeaderTopHidden: boolean = false;

  // Inject
  private readonly appConfigService = inject(AppConfigService);
  private readonly navigationService = inject(NavigationService);

  ngOnInit() {
    // Theme Settings
    this.getSettingData();
  }

  /**
   * Initial Landing Page Setting
   * getSettingData()
   */

  private getSettingData() {
    const searchHintsSetting = this.appConfigService.getSettingData('searchHints');
    const baseResults = searchHintsSetting.split(',').map((item: string) => item.trim());
    this.searchHints = [...baseResults, baseResults[0]];
  }

  @HostListener('window:scroll')
  onScroll() {
    this.isHeaderFixed = window.scrollY > 0;
    this.isHeaderTopHidden = window.scrollY > 250;
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.sideNav.onShowCategory();
  }
  onCategoryClosed() {
    this.menuOpen = false;
  }


  // get isVisible() {
  //   if (this.currentUrl === '/search') {
  //     return false;
  //   }else {
  //     return true;
  //   }
  // }

  get isVisible() {
    // কোন কোন route এ header লুকানো থাকবে সেটা এখানে দাও
    const hiddenRoutes = ['/search', '/login', '/register', '/checkout'];
  
    // current route যদি hiddenRoutes এর মধ্যে না থাকে তাহলে header দেখাও
    return !hiddenRoutes.includes(this.currentUrl);
  }
  

  goBack(): void {
    this.navigationService.back();
  }
}
