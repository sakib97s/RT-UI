import {Component, HostListener, inject, Input, ViewChild} from '@angular/core';
import {RouterLink, Router} from "@angular/router";
import {Cart} from '../../../../../interfaces/common/cart.interface';
import {AppConfigService} from "../../../../../services/core/app-config.service";
import {NavigationService} from "../../../../../services/core/navigation.service";
import {SideNavComponent} from "../../header-1/header-sm-1/side-nav/side-nav.component";
import {NgClass} from "@angular/common";

@Component({
  selector: 'app-header-sm-2',
  standalone: true,
  imports: [
    RouterLink,
    SideNavComponent,
    NgClass
  ],
  templateUrl: './header-sm-2.component.html',
  styleUrl: './header-sm-2.component.scss'
})
export class HeaderSm2Component {

  // Theme Settings
  searchHints: string[] = [];

  // Decorator
  @Input() currentUrl: string;
  @Input() carts: Cart[] = [];
  @Input() shopInfo: any;
  @Input() categories: any;
  @ViewChild('sideNav') sideNav!: SideNavComponent;
  menuOpen = false;

  // Store Data
  protected readonly rawSrcset: string = '384w, 640w';
  isHeaderFixed: boolean = false;
  isHeaderTopHidden: boolean = false;

  // Inject
  private readonly appConfigService = inject(AppConfigService);
  private readonly navigationService = inject(NavigationService);
  private readonly router = inject(Router);

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
    if (this.sideNav) {
      this.sideNav.onShowCategory();
    }
  }

  onCategoryClosed() {
    this.menuOpen = false;
  }

  navigateToSearch() {
    this.router.navigate(['/search']);
  }

  get isVisible() {
    if(this.currentUrl === '/search') {
      return false;
    }else {
      return true;
    }
  }

  goBack(): void {
    this.navigationService.back();
  }
}
