import { Component } from '@angular/core';
import {NgxSkeletonLoaderModule} from 'ngx-skeleton-loader';


@Component({
    selector: 'app-cart-loader',
    imports: [
    NgxSkeletonLoaderModule
],
    templateUrl: './cart-loader.component.html',
    styleUrl: './cart-loader.component.scss'
})
export class CartLoaderComponent {

}
