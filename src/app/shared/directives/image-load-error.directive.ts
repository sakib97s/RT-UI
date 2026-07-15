import { Directive, ElementRef, Input } from '@angular/core';


@Directive({
  selector: '[checkImageDefault]',
  standalone: true,
  host: {
    '[attr.src]': 'checkPath(src)',
    '(error)': 'onError()'
  }
})
export class ImageLoadErrorDirective {

  @Input() src: string = '';
  public defaultImg: string = 'https://cdn.saleecom.com/upload/images/placeholder.png';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  public onError() {
    this.el.nativeElement.src = this.defaultImg;
  }

  public checkPath(src: string) {
    return src ? src : this.defaultImg;
  }
}
