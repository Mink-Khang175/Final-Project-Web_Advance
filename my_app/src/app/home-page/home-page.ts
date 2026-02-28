import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { ProductCard, Product } from '../product-card/product-card';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, FormsModule, Header, Footer, ProductCard],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit, OnDestroy, AfterViewInit {
  currentSlide = 0;
  slides: NodeListOf<Element> | null = null;
  slider: HTMLElement | null = null;
  slideInterval: any;

  aboutVisible = false;
  typedText = '';
  private typewriterInterval: any;
  private typewriterTimeout: any;

  newArrivals: Product[] = [];

  @ViewChild('stackContainer', { static: false }) stackContainer!: ElementRef;
  private stackScrollHandler: (() => void) | null = null;
  private aboutObserver: IntersectionObserver | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadNewArrivals();
      this.initSlider();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Delay to ensure DOM is fully rendered after ViewChild is available
      setTimeout(() => {
        this.initAboutSection();
        this.initStackFade();
      }, 300);
    }
  }

  ngOnDestroy(): void {
    if (this.slideInterval) clearInterval(this.slideInterval);
    if (this.typewriterInterval) clearInterval(this.typewriterInterval);
    if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);
    if (this.aboutObserver) {
      this.aboutObserver.disconnect();
      this.aboutObserver = null;
    }
    this.destroyStackFade();
  }

  loadNewArrivals(): void {
    fetch('/assets/data/NewArrivals.json')
      .then(res => res.json())
      .then(arrivals => {
        this.newArrivals = arrivals.slice(0, 4).map((p: any) => ({
          ...p,
          image: p.image?.startsWith('/') ? p.image : '/assets/' + p.image,
          imageHover: p.hoverImage
            ? (p.hoverImage.startsWith('/') ? p.hoverImage : '/assets/' + p.hoverImage)
            : undefined
        }));
        this.cdr.detectChanges();
      })
      .catch(err => console.error('Error loading arrivals:', err));
  }

  initSlider(): void {
    setTimeout(() => {
      this.slides = document.querySelectorAll('.slide');
      this.slider = document.querySelector('.slider');
      if (this.slides && this.slider) {
        this.slideInterval = setInterval(() => this.moveSlide(1), 5000);
      }
    }, 100);
  }

  moveSlide(direction: number): void {
    if (!this.slides || !this.slider) return;
    this.currentSlide = (this.currentSlide + direction + this.slides.length) % this.slides.length;
    this.slider.style.transform = `translateX(-${this.currentSlide * 100}%)`;
  }

  /* ============================================
     ABOUT SECTION - IntersectionObserver with
     stack-container as root (fixes hard refresh)
     ============================================ */
  initAboutSection(): void {
    const aboutContent = document.getElementById('aboutContent');
    const container = this.stackContainer?.nativeElement;

    if (!aboutContent || !container) {
      // Retry if DOM not ready yet
      setTimeout(() => this.initAboutSection(), 500);
      return;
    }

    this.aboutObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.aboutVisible) {
          this.aboutVisible = true;
          this.startTypewriter();
          this.cdr.detectChanges();
          this.aboutObserver?.disconnect();
        }
      });
    }, { threshold: [0.05, 0.1, 0.2], root: container });

    this.aboutObserver.observe(aboutContent);
  }

  startTypewriter(): void {
    const fullText = "Avant Atelier was born from late-night sketchbooks, playlists on repeat, and a belief that clothes should feel like home. We curate small-batch pieces, partner with artisan makers, and obsess over every hem so you can dress with intention. Each collection is our love letter to mindful style, blending Vietnamese roots with global street sensibilities crafted for the bold, the curious, and everyone rewriting their own narrative.";
    let index = 0;
    const typingSpeed = 45;
    this.typedText = '';

    this.typewriterInterval = setInterval(() => {
      if (index < fullText.length) {
        this.typedText += fullText.charAt(index);
        index++;
        this.cdr.detectChanges();
      } else {
        clearInterval(this.typewriterInterval);
        this.typewriterTimeout = setTimeout(() => {
          this.typedText = '';
          this.cdr.detectChanges();
          this.startTypewriter();
        }, 15000);
      }
    }, typingSpeed);
  }

  /* ============================================
     STICKY STACKING - Fade previous cards
     as next card overlaps them
     ============================================ */
  initStackFade(): void {
    const container = this.stackContainer?.nativeElement;
    if (!container) return;

    this.stackScrollHandler = () => {
      const scrollTop = container.scrollTop;
      const viewHeight = container.clientHeight;
      const cards = container.querySelectorAll('.stack-card') as NodeListOf<HTMLElement>;

      cards.forEach((card: HTMLElement) => {
        const naturalTop = card.offsetTop;
        const coverProgress = (scrollTop - naturalTop) / viewHeight;

        if (coverProgress > 0.05 && coverProgress < 1.5) {
          // Being covered - fade out smoothly
          const opacity = Math.max(0, 1 - coverProgress * 0.85);
          card.style.opacity = String(opacity);
          // Disable pointer events when fading out to allow scroll through
          card.style.pointerEvents = opacity < 0.3 ? 'none' : 'auto';
        } else if (coverProgress >= 1.5) {
          // Fully covered
          card.style.opacity = '0';
          card.style.pointerEvents = 'none';
        } else {
          // Visible / not yet reached
          card.style.opacity = '1';
          card.style.pointerEvents = 'auto';
        }
      });
    };

    container.addEventListener('scroll', this.stackScrollHandler, { passive: true });
    // Run once immediately to set initial state
    this.stackScrollHandler();
  }

  destroyStackFade(): void {
    const container = this.stackContainer?.nativeElement;
    if (container && this.stackScrollHandler) {
      container.removeEventListener('scroll', this.stackScrollHandler);
      this.stackScrollHandler = null;
    }
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const container = this.stackContainer?.nativeElement;
    const section = document.getElementById(sectionId);
    if (container && section) {
      // Temporarily enable all pointer events for proper scroll
      const allCards = container.querySelectorAll('.stack-card') as NodeListOf<HTMLElement>;
      allCards.forEach(card => {
        card.style.pointerEvents = 'auto';
      });
      
      // Calculate cumulative offset for sticky sections
      const allSections = container.querySelectorAll('section[id], .about-footer-wrapper');
      let cumulativeOffset = 0;
      
      for (let i = 0; i < allSections.length; i++) {
        const sect = allSections[i] as HTMLElement;
        if (sect.id === sectionId || sect.querySelector(`#${sectionId}`)) {
          break;
        }
        cumulativeOffset += Math.max(sect.scrollHeight, sect.offsetHeight);
      }
      
      // If target is about section inside wrapper
      if (sectionId === 'about' && section.parentElement?.classList.contains('about-footer-wrapper')) {
        const wrapper = section.parentElement;
        const previousSiblings = Array.from(wrapper.children);
        const aboutIndex = previousSiblings.indexOf(section);
        for (let i = 0; i < aboutIndex; i++) {
          cumulativeOffset += (previousSiblings[i] as HTMLElement).offsetHeight;
        }
      }
      
      container.scrollTo({
        top: cumulativeOffset,
        behavior: 'smooth'
      });
      
      // Trigger fade handler after scroll to update pointer events
      setTimeout(() => {
        if (this.stackScrollHandler) {
          this.stackScrollHandler();
        }
      }, 100);
    }
  }

  getProductDetailUrl(product: Product): string {
    return `top-detail.html?src=new&id=${encodeURIComponent(product.id)}&return=index.html`;
  }

  handleBuyNow(product: Product): void {
    window.location.href = this.getProductDetailUrl(product);
  }

  handleAddToCart(product: Product): void {
    alert(`${product.name} added to cart!`);
  }
}
