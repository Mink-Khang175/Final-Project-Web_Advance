import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { ApiService } from '../api.service';

interface HomeProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  sale?: number;
  salePercent?: number;
  soldOut?: boolean;
  category?: string;
}

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit, OnDestroy, AfterViewInit {
  currentSlide = 0;
  slides: NodeListOf<Element> | null = null;
  slider: HTMLElement | null = null;
  slideInterval: any;
  private sliderInitAttempts = 0;
  private readonly maxSliderInitAttempts = 10;

  // Slide typewriter
  slideQuoteText = '';
  slideAuthor = '';
  slideQuoteDone = false;
  private slideTypewriterInterval: any;
  private slideTypewriterTimeout: any;
  private readonly slideQuotes = [
    {
      text: 'Believe you can and you\'re halfway there.\nBelieve in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.',
      author: 'Avant Atelier'
    },
    {
      text: '"Confidence is quiet. Belief in\nyourself is louder than any\nobstacle."',
      author: 'Drew Feig'
    },
    {
      text: 'Style is a way to say who you are\nwithout having to speak.',
      author: 'Avant Atelier'
    }
  ];

  aboutVisible = false;
  typedText = '';
  private aboutTypewriterStarted = false;
  private typewriterInterval: any;
  private typewriterTimeout: any;

  newArrivals: HomeProduct[] = [];

  @ViewChild('stackContainer', { static: false }) stackContainer!: ElementRef;
  private stackScrollHandler: (() => void) | null = null;
  private activeStackCardId = '';
  private aboutObserver: IntersectionObserver | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
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

      // Handle fragment navigation (e.g. /home#about from header links on other pages)
      const fragment = this.route.snapshot.fragment;
      if (fragment) {
        setTimeout(() => {
          const container = this.stackContainer?.nativeElement as HTMLElement | undefined;
          const target = document.getElementById(fragment);
          if (!container || !target) return;

          const targetSection = target.closest('section[id]') as HTMLElement | null;
          const targetSectionId = targetSection?.id || target.id;

          const allSections = Array.from(container.querySelectorAll<HTMLElement>('section[id]'));
          let offset = 0;
          for (const s of allSections) {
            if (s.id === targetSectionId) break;
            offset += s.scrollHeight || s.offsetHeight;
          }
          container.scrollTo({ top: offset, behavior: 'smooth' });
        }, 700);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.slideInterval) clearInterval(this.slideInterval);
    if (this.slideTypewriterInterval) clearInterval(this.slideTypewriterInterval);
    if (this.slideTypewriterTimeout) clearTimeout(this.slideTypewriterTimeout);
    if (this.typewriterInterval) clearInterval(this.typewriterInterval);
    if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);
    if (this.aboutObserver) {
      this.aboutObserver.disconnect();
      this.aboutObserver = null;
    }
    this.destroyStackFade();
  }

  loadNewArrivals(): void {
    // Try loading from backend API first, fallback to local JSON
    this.api.getProducts().subscribe({
      next: (products) => {
        this.newArrivals = products
          .filter((p: any) => p.isNewArrival)
          .slice(0, 4)
          .map((p: any) => ({
            id: p._id,
            name: p.name,
            price: p.price,
            image: p.image || '',
            images: p.images,
            sale: p.originalPrice && p.discount ? p.price : undefined,
            salePercent: p.discount,
            soldOut: (p.stock ?? 0) <= 0,
            category: p.category
          }));
        // If no new arrivals flagged, show first 4
        if (this.newArrivals.length === 0) {
          this.newArrivals = products.slice(0, 4).map((p: any) => ({
            id: p._id,
            name: p.name,
            price: p.originalPrice || p.price,
            image: p.image || '',
            images: p.images,
            sale: p.discount ? p.price : undefined,
            salePercent: p.discount,
            soldOut: (p.stock ?? 0) <= 0,
            category: p.category
          }));
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback to local JSON
        this.loadFromLocalJson();
      }
    });
  }

  private loadFromLocalJson(): void {
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
    setTimeout(() => this.tryInitSlider(), 300);
  }

  private tryInitSlider(): void {
    this.sliderInitAttempts += 1;
    this.slides = document.querySelectorAll('.slide');
    this.slider = document.querySelector('.slider');

    if (this.slides?.length && this.slider) {
      this.startSlideTypewriter();
      return;
    }

    if (this.sliderInitAttempts < this.maxSliderInitAttempts) {
      setTimeout(() => this.tryInitSlider(), 200);
    }
  }

  private startSlideTypewriter(): void {
    if (this.slideTypewriterInterval) clearInterval(this.slideTypewriterInterval);
    if (this.slideTypewriterTimeout) clearTimeout(this.slideTypewriterTimeout);

    const quote = this.slideQuotes[this.currentSlide];
    this.slideQuoteText = '';
    this.slideAuthor = quote.author;
    this.slideQuoteDone = false;
    this.cdr.detectChanges();

    let index = 0;
    this.slideTypewriterInterval = setInterval(() => {
      if (index < quote.text.length) {
        this.slideQuoteText += quote.text.charAt(index);
        index++;
        this.cdr.detectChanges();
      } else {
        clearInterval(this.slideTypewriterInterval);
        this.slideQuoteDone = true;
        this.cdr.detectChanges();
        // After quote finishes, wait 2.5s then advance slide
        this.slideTypewriterTimeout = setTimeout(() => {
          this.moveSlide(1);
        }, 2500);
      }
    }, 40);
  }

  moveSlide(direction: number): void {
    if (!this.slides || !this.slider) return;
    this.currentSlide = (this.currentSlide + direction + this.slides.length) % this.slides.length;
    this.slider.style.transform = `translateX(-${this.currentSlide * 100}%)`;
    this.cdr.detectChanges();
    // Start typewriter for the new slide
    setTimeout(() => this.startSlideTypewriter(), 850);
  }

  // Called from prev/next buttons — cancels auto-advance then resumes
  moveSlideManual(direction: number): void {
    if (this.slideTypewriterInterval) clearInterval(this.slideTypewriterInterval);
    if (this.slideTypewriterTimeout) clearTimeout(this.slideTypewriterTimeout);
    this.moveSlide(direction);
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
          this.revealAboutContent();
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

      if (!this.aboutVisible && scrollTop + viewHeight >= container.scrollHeight - viewHeight * 0.9) {
        this.revealAboutContent();
      }

      cards.forEach((card: HTMLElement) => {
        const naturalTop = card.offsetTop;
        const coverProgress = (scrollTop - naturalTop) / viewHeight;

        if (coverProgress > 0.05 && coverProgress < 1.5) {
          // Being covered - fade out smoothly
          const depth = Math.min(Math.max(coverProgress, 0), 1);
          const opacity = Math.max(0, 1 - coverProgress * 0.85);
          const scale = 1 - depth * 0.04;
          const translateY = -depth * 18;
          const blur = depth * 3;
          card.style.opacity = String(opacity);
          card.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
          card.style.filter = `blur(${blur}px) saturate(${1 - depth * 0.18})`;
          // Disable pointer events when fading out to allow scroll through
          card.style.pointerEvents = opacity < 0.3 ? 'none' : 'auto';
        } else if (coverProgress >= 1.5) {
          // Fully covered
          card.style.opacity = '0';
          card.style.transform = 'translate3d(0, -24px, 0) scale(0.95)';
          card.style.filter = 'blur(4px) saturate(0.82)';
          card.style.pointerEvents = 'none';
        } else {
          // Visible / not yet reached
          card.style.opacity = '1';
          card.style.transform = '';
          card.style.filter = '';
          card.style.pointerEvents = 'auto';
        }
      });

      this.updateActiveStackCard(cards, scrollTop);
    };

    container.addEventListener('scroll', this.stackScrollHandler, { passive: true });
    // Run once immediately to set initial state
    this.stackScrollHandler();
  }

  private updateActiveStackCard(cards: NodeListOf<HTMLElement>, scrollTop: number): void {
    if (!cards.length) return;

    let activeCard = cards[0];
    let minDistance = Number.POSITIVE_INFINITY;

    cards.forEach(card => {
      const distance = Math.abs(card.offsetTop - scrollTop);
      if (distance < minDistance) {
        minDistance = distance;
        activeCard = card;
      }
    });

    if (!activeCard.id || activeCard.id === this.activeStackCardId) return;
    this.activeStackCardId = activeCard.id;

    cards.forEach(card => card.classList.remove('is-current'));
    activeCard.classList.add('is-current');
  }

  private revealAboutContent(): void {
    this.aboutVisible = true;
    if (!this.aboutTypewriterStarted) {
      this.aboutTypewriterStarted = true;
      this.startTypewriter();
    }
    this.cdr.detectChanges();
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

  getProductDetailUrl(product: HomeProduct): string {
    return `/product-detail?id=${encodeURIComponent(product.id)}`;
  }

  handleBuyNow(product: HomeProduct): void {
    this.router.navigate(['/product-detail'], { queryParams: { id: product.id } });
  }

  handleAddToCart(product: HomeProduct): void {
    const user = localStorage.getItem('loggedInUser');
    if (!user) {
      this.router.navigate(['/auth']);
      return;
    }
    const userData = JSON.parse(user);
    this.api.addToCart(userData._id, {
      productId: product.id,
      productName: product.name,
      price: product.sale || product.price,
      quantity: 1,
      image: product.image
    }).subscribe({
      next: () => {
        window.dispatchEvent(new Event('cart-updated'));
        window.dispatchEvent(new Event('cart-item-added'));
      },
      error: () => {}
    });
  }

  /* ============================================
     MAGNETIC BUTTON EFFECT
     ============================================ */
  onMagneticMove(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    btn.style.transition = 'none';
    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.5}px)`;
  }

  onMagneticEnter(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    btn.style.transition = 'none';
  }

  onMagneticLeave(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    btn.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    btn.style.transform = 'translate(0px, 0px)';
  }
}
