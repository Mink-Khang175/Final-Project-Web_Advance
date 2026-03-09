import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ApiService, CartItem } from '../api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  isLoggedIn = false;
  searchActive = false;
  searchQuery = '';
  isScrolled = false;
  isHomePage = false;
  activeSection = 'home';

  // Cart dropdown
  cartOpen = false;
  cartItems: CartItem[] = [];
  cartCount = 0;
  cartTotal = 0;
  private cartHoverTimeout: any;
  private userId = '';
  private cartEventListener: (() => void) | null = null;

  private sectionObserver: IntersectionObserver | null = null;
  private observedElements: Element[] = [];
  private scrollContainer: Element | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private api: ApiService
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Check if we're on home page (ignore query params and fragments)
        const urlPath = event.url.split('?')[0].split('#')[0];
        const wasHomePage = this.isHomePage;
        this.isHomePage = urlPath === '/home' || urlPath === '/';
        
        if (this.isHomePage) {
          // Reset scroll state when entering home page
          if (!wasHomePage) {
            this.isScrolled = false;
            this.activeSection = 'home';
          }
          setTimeout(() => this.initSectionObserver(), 600);
        } else {
          this.destroySectionObserver();
          this.activeSection = '';
        }
        
        // Trigger change detection
        this.cdr.detectChanges();
      }
    });
  }

  /* Computed property for header light/dark mode */
  get isOnLightSection(): boolean {
    if (!this.isHomePage) return true;
    return this.activeSection === 'services' || this.activeSection === 'portfolio';
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled = window.scrollY > 50;
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.checkLoginStatus();
      this.loadCart();
      // Listen for cart update events dispatched by other components
      this.cartEventListener = () => this.loadCart();
      window.addEventListener('cart-updated', this.cartEventListener);
      // Check if we're on home page (ignore query params and fragments)
      const urlPath = this.router.url.split('?')[0].split('#')[0];
      this.isHomePage = urlPath === '/home' || urlPath === '/';
      
      if (this.isHomePage) {
        this.activeSection = 'home';
        setTimeout(() => this.initSectionObserver(), 600);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroySectionObserver();
    if (this.cartHoverTimeout) clearTimeout(this.cartHoverTimeout);
    if (this.cartEventListener) window.removeEventListener('cart-updated', this.cartEventListener);
  }

  initSectionObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.destroySectionObserver();

    this.scrollContainer = document.querySelector('.stack-container');
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length || !this.scrollContainer) return;

    // Reset scroll position to top when observer is initialized
    if (this.scrollContainer.scrollTop > 0) {
      this.scrollContainer.scrollTop = 0;
    }

    const observerOptions: IntersectionObserverInit = {
      root: this.scrollContainer,
      threshold: [0.1, 0.3, 0.5, 0.7],
      rootMargin: '-10% 0px -10% 0px'
    };

    this.sectionObserver = new IntersectionObserver((entries) => {
      let maxRatio = 0;
      let maxSection = this.activeSection;
      let hasVisibleSection = false;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          maxSection = entry.target.id;
          hasVisibleSection = true;
        }
      });

      // Special handling: check if scrolled near bottom for about section
      if (this.scrollContainer) {
        const container = this.scrollContainer;
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const scrollHeight = container.scrollHeight;
        
        if (scrollTop + containerHeight >= scrollHeight - containerHeight * 0.8) {
          maxSection = 'about';
          hasVisibleSection = true;
        }
      }

      if (hasVisibleSection && this.activeSection !== maxSection) {
        this.zone.run(() => {
          this.activeSection = maxSection;
          this.cdr.detectChanges();
        });
      }
    }, observerOptions);

    sections.forEach((section) => {
      this.sectionObserver!.observe(section);
      this.observedElements.push(section);
    });

    // Scroll listener for more responsive tracking
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.onStackScroll);
    }
  }

  private onStackScroll = (): void => {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;

    // Detect "about" section near bottom
    if (scrollTop + containerHeight >= scrollHeight - containerHeight * 0.7) {
      if (this.activeSection !== 'about') {
        this.zone.run(() => { this.activeSection = 'about'; this.cdr.detectChanges(); });
      }
      return;
    }

    // For sticky-stack layout each section is ~100vh.
    // Use el.offsetTop directly (natural flow position relative to scroll container)
    // which is unaffected by sticky visual repositioning.
    const sectionIds = ['home', 'services', 'portfolio'];
    let activeId = 'home';

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      // Activate this section when scrollTop has passed its natural top minus half a viewport
      if (scrollTop >= el.offsetTop - containerHeight * 0.5) {
        activeId = id;
      }
    }

    if (this.activeSection !== activeId) {
      this.zone.run(() => { this.activeSection = activeId; this.cdr.detectChanges(); });
    }
  }

  destroySectionObserver(): void {
    if (this.sectionObserver) {
      this.observedElements.forEach((el) => this.sectionObserver!.unobserve(el));
      this.sectionObserver.disconnect();
      this.sectionObserver = null;
      this.observedElements = [];
    }
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.onStackScroll);
      this.scrollContainer = null;
    }
  }

  navigateSection(event: Event, sectionId: string): void {
    event.preventDefault();
    if (this.isHomePage) {
      this.scrollToSection(sectionId);
    } else {
      this.router.navigate(['/home'], { fragment: sectionId });
    }
  }

  scrollToSection(sectionId: string): void {
    const container = document.querySelector('.stack-container');
    const section = document.getElementById(sectionId);
    if (container && section) {
      // Temporarily enable all pointer events to ensure proper scroll behavior
      const allCards = container.querySelectorAll('.stack-card') as NodeListOf<HTMLElement>;
      allCards.forEach(card => {
        card.style.pointerEvents = 'auto';
      });
      
      // For sticky sections, calculate cumulative offset
      const allSections = Array.from(container.querySelectorAll('section[id], .about-footer-wrapper'));
      let cumulativeOffset = 0;
      
      for (const sect of allSections) {
        if ((sect as HTMLElement).id === sectionId || sect.querySelector(`#${sectionId}`)) {
          break;
        }
        // Use scrollHeight for accurate height including all content
        const el = sect as HTMLElement;
        cumulativeOffset += Math.max(el.scrollHeight, el.offsetHeight);
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
      
      // Re-run fade logic after scroll settles
      setTimeout(() => {
        const scrollEvent = new Event('scroll');
        container.dispatchEvent(scrollEvent);
      }, 100);
    } else if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }

  checkLoginStatus(): void {
    const user = localStorage.getItem('loggedInUser');
    this.isLoggedIn = !!user;
    if (user) {
      this.userId = JSON.parse(user)._id || '';
    }
  }

  loadCart(): void {
    const user = localStorage.getItem('loggedInUser');
    if (!user) { this.cartItems = []; this.cartCount = 0; this.cartTotal = 0; return; }
    const userId = JSON.parse(user)._id || '';
    if (!userId) return;
    this.api.getCart(userId).subscribe({
      next: (cart) => {
        this.cartItems = cart?.items || [];
        this.cartCount = this.cartItems.reduce((s, i) => s + i.quantity, 0);
        this.cartTotal = cart?.totalAmount || this.cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
        this.cdr.detectChanges();
      },
      error: () => { this.cartItems = []; this.cartCount = 0; this.cartTotal = 0; }
    });
  }

  openCart(): void {
    if (this.cartHoverTimeout) clearTimeout(this.cartHoverTimeout);
    this.cartOpen = true;
    this.loadCart();
  }

  closeCart(): void {
    this.cartHoverTimeout = setTimeout(() => { this.cartOpen = false; }, 200);
  }

  toggleCart(event: Event): void {
    event.preventDefault();
    this.cartOpen = !this.cartOpen;
    if (this.cartOpen) this.loadCart();
  }

  removeFromCart(item: CartItem): void {
    const user = localStorage.getItem('loggedInUser');
    if (!user || !item._id) return;
    const userId = JSON.parse(user)._id || '';
    this.api.removeCartItem(userId, item._id).subscribe({
      next: () => this.loadCart(),
      error: () => {}
    });
  }

  toggleSubmenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const button = event.target as HTMLElement;
    const parentLi = button.closest('.has-submenu');
    if (parentLi) {
      parentLi.classList.toggle('submenu-open');
    }
  }

  toggleSearch(event: Event): void {
    event.preventDefault();
    this.searchActive = !this.searchActive;
    if (this.searchActive) {
      setTimeout(() => {
        const input = document.querySelector('.search-container .search-input') as HTMLInputElement;
        if (input) input.focus();
      }, 400);
    }
  }

  onSearchBlur(): void {
    if (!this.searchQuery.trim()) {
      setTimeout(() => {
        this.searchActive = false;
      }, 200);
    }
  }

  onSearchInput(): void {
    console.log('Searching for:', this.searchQuery);
  }

  closeMenu(): void {
    const menuToggler = document.getElementById('menu-toggler') as HTMLInputElement;
    if (menuToggler) {
      menuToggler.checked = false;
    }
  }
}
