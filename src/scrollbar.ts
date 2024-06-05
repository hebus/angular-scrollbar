import { NgStyle } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'scrollbar',
  standalone: true,
  imports: [NgStyle],
  styleUrl: './scrollbar.css',
  template: `
<div class="container">
			<div class="content" id="custom-scrollbars-content" #contentRef>
				<ng-content/>
			</div>
			<div class="scrollbar">
				<button
					class="button button--up"
					(click)="handleScrollButton('up')"
				>
					↑
				</button>
				<div
					class="track-and-thumb"
					role="scrollbar"
					aria-controls="custom-scrollbars-content"
				>
					<div
						class="track"
						#scrollTrackRef
						(click)="handleTrackClick($event)"
						[ngStyle]="{'cursor': isDragging() ? 'grabbing' : undefined}"
					></div>
					<div
						class="thumb"
						#scrollThumbRef
						(mousedown)="handleThumbMousedown($event)"
						[style.height]="thumbHeight() + 'px'"
						[ngStyle]="{'cursor': isDragging() ? 'grabbing' : 'grab'}"
					></div>
				</div>
				<button
					class="button button--down"
					(click)="handleScrollButton('down')"
				>
					↓
				</button>
			</div>
		</div>
    `,
})
export class ScrollbarComponent {
  contentRef = viewChild<ElementRef>('contentRef');
  scrollTrackRef = viewChild<ElementRef<HTMLDivElement>>('scrollTrackRef');
  scrollThumbRef = viewChild<ElementRef<HTMLDivElement>>('scrollThumbRef');

  thumbHeight = signal(20);
  isDragging = signal(false);
  scrollStartPosition = signal(0);
  initialContentScrollTop = signal(0);

  handleResize() {
    if (
      this.scrollTrackRef()!.nativeElement &&
      this.contentRef()!.nativeElement
    ) {
      const { clientHeight: trackSize } = this.scrollTrackRef()!.nativeElement;
      const { clientHeight: contentVisible, scrollHeight: contentTotalHeight } =
        this.contentRef()!.nativeElement;
      this.thumbHeight.set(
        Math.max((contentVisible / contentTotalHeight) * trackSize, 20)
      );
    }
  }

  handleThumbPosition() {
    if (
      !this.contentRef() ||
      !this.scrollTrackRef() ||
      !this.scrollThumbRef()
    ) {
      return;
    }

    const { scrollTop: contentTop, scrollHeight: contentHeight } =
      this.contentRef()!.nativeElement;
    const { clientHeight: trackHeight } = this.scrollTrackRef()!.nativeElement;

    let newTop = (contentTop / contentHeight) * trackHeight;
    newTop = Math.min(newTop, trackHeight - this.thumbHeight());

    const thumb = this.scrollThumbRef()!.nativeElement;
    requestAnimationFrame(() => {
      thumb.style.top = `${newTop}px`;
    });
  }

  handleThumbMousedown(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.scrollStartPosition.set(e.clientY);
    if (this.contentRef()?.nativeElement)
      this.initialContentScrollTop.set(
        this.contentRef()!.nativeElement.scrollTop
      );
    this.isDragging.set(true);
  }

  @HostListener('mouseup', ['$event'])
  handleThumbMouseup(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (this.isDragging()) {
      this.isDragging.set(false);
    }
  }

  @HostListener('mousemove', ['$event'])
  handleThumbMousemove(e: MouseEvent) {
    if (this.contentRef()?.nativeElement) {
      e.preventDefault();
      e.stopPropagation();
      if (this.isDragging()) {
        const {
          scrollHeight: contentScrollHeight,
          clientHeight: contentClientHeight,
        } = this.contentRef()?.nativeElement || {
          scrollHeight: 0,
          clientHeight: 0,
        };

        const deltaY =
          (e.clientY - this.scrollStartPosition()) *
          (contentClientHeight / this.thumbHeight());

        const newScrollTop = Math.min(
          this.initialContentScrollTop() + deltaY,
          contentScrollHeight - contentClientHeight
        );

        this.contentRef()!.nativeElement.scrollTop = newScrollTop;
      }
    }
  }

  handleTrackClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { nativeElement: track } = this.scrollTrackRef() || {};
    const { nativeElement: content } = this.contentRef() || {};
    if (track && content) {
      const { clientY } = e;
      const target = e.target as HTMLDivElement;
      const rect = target.getBoundingClientRect();
      const trackTop = rect.top;
      const thumbOffset = -(this.thumbHeight() / 2);
      const clickRatio =
        (clientY - trackTop + thumbOffset) / track.clientHeight;
      const scrollAmount = Math.floor(clickRatio * content.scrollHeight);
      content.scrollTo({
        top: scrollAmount,
        behavior: 'smooth',
      });
    }
  }

  handleScrollButton(direction: 'up' | 'down') {
    const { nativeElement: content } = this.contentRef() || {};
    if (content) {
      const scrollAmount = direction === 'down' ? 200 : -200;
      content.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  }

  constructor() {}

  ngAfterViewInit() {
    if (this.contentRef()) {
      const content = this.contentRef()!.nativeElement;
      const observer = new ResizeObserver(() => {
        this.handleResize();
      });
      observer.observe(content);
			content.addEventListener('scroll', this.handleThumbPosition.bind(this))
    }
  }
}
