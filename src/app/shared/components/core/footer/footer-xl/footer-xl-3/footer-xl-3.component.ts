import { NgOptimizedImage } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ShopInformation } from '../../../../../../interfaces/common/shop-information.interface';
import { ImgCtrlPipe } from '../../../../../pipes/img-ctrl.pipe';

@Component({
  selector: 'app-footer-xl-3',
  standalone: true,
  imports: [RouterLink, ImgCtrlPipe, NgOptimizedImage],
  templateUrl: './footer-xl-3.component.html',
  styleUrl: './footer-xl-3.component.scss',
})
export class FooterXl3Component implements OnInit {
  // Decorator
  @Input() shopInfo: ShopInformation;
  isHomeRoute: boolean = false;

  // Store Data
  protected readonly rawSrcset: string = '384w, 640w';

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.isHomeRoute = this.router.url === '/'; // Check if it's the home route
    });
  }

  /**
   * HTTP REQUEST
   * getSocialLink()
   */

  getSocialLink(type: string): string {
    switch (type) {
      case 'facebook':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 0)?.value ?? null
        );

      case 'youtube':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 1)?.value ?? null
        );

      case 'twitter':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 2)?.value ?? null
        );

      case 'instagram':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 3)?.value ?? null
        );

      case 'linkedin':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 4)?.value ?? null
        );

      case 'tiktok':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 5)?.value ?? null
        );

      case 'appstore':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 10)?.value ?? null
        );

      case 'playstore':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 11)?.value ?? null
        );

      default:
        return null;
    }
  }
}
