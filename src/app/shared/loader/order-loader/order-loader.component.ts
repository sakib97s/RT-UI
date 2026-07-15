import { Component } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
    selector: 'app-order-loader',
    imports: [
        NgxSkeletonLoaderModule,
    ],
    templateUrl: './order-loader.component.html',
    styleUrl: './order-loader.component.scss'
})
export class OrderLoaderComponent {

}
