import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
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
export class HomePage implements OnInit, OnDestroy {
  currentSlide = 0;
  slides: NodeListOf<Element> | null = null;
  slider: HTMLElement | null = null;
  slideInterval: any;
  
  aboutVisible = false;
  typedText = '';
  private typewriterInterval: any;
  private typewriterTimeout: any;
  
  contactForm = {
    name: '',
    email: '',
    message: ''
  };
  
  showThankYou = false;
  thankYouMessage = '';
  
  newArrivals: Product[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadNewArrivals();
      this.initSlider();
      this.initAboutSection();
    }
  }

  ngOnDestroy(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }
    if (this.typewriterTimeout) {
      clearTimeout(this.typewriterTimeout);
    }
  }

  loadNewArrivals(): void {
    fetch('/assets/data/NewArrivals.json')
      .then(res => res.json())
      .then(arrivals => {
        this.newArrivals = arrivals.slice(0, 4);
        this.cdr.detectChanges(); // Force update view
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

  initAboutSection(): void {
    setTimeout(() => {
      const aboutContent = document.getElementById('aboutContent');
      if (!aboutContent) {
        console.error('About content not found!');
        return;
      }

      console.log('About section initialized, setting up observer...');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          console.log('Intersection:', entry.isIntersecting, 'Visible:', this.aboutVisible);
          if (entry.isIntersecting && !this.aboutVisible) {
            this.aboutVisible = true;
            console.log('Starting typewriter...');
            this.startTypewriter();
            observer.disconnect();
          }
        });
      }, { threshold: 0.35 });

      observer.observe(aboutContent);
    }, 100);
  }

  startTypewriter(): void {
    const fullText = "Avant Atelier was born from late-night sketchbooks, playlists on repeat, and a belief that clothes should feel like home. We curate small-batch pieces, partner with artisan makers, and obsess over every hem so you can dress with intention. Each collection is our love letter to mindful style, blending Vietnamese roots with global street sensibilities crafted for the bold, the curious, and everyone rewriting their own narrative.";
    let index = 0;
    const typingSpeed = 45;

    console.log('Typewriter started! Text length:', fullText.length);
    this.typedText = ''; // Reset text

    this.typewriterInterval = setInterval(() => {
      if (index < fullText.length) {
        this.typedText += fullText.charAt(index);
        index++;
        this.cdr.detectChanges(); // Force Angular to update view
      } else {
        console.log('Typewriter finished, will restart after 15s');
        clearInterval(this.typewriterInterval);
        this.typewriterTimeout = setTimeout(() => {
          console.log('Restarting typewriter...');
          this.typedText = '';
          this.cdr.detectChanges();
          this.startTypewriter();
        }, 15000);
      }
    }, typingSpeed);
  }

  onContactSubmit(event: Event): void {
    event.preventDefault();
    
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      alert('Please fill out all fields before submitting.');
      return;
    }
    
    this.thankYouMessage = `Thank you, ${this.contactForm.name}! Your message has been sent successfully.`;
    this.showThankYou = true;
    
    setTimeout(() => {
      this.showThankYou = false;
    }, 3000);
    
    this.contactForm = { name: '', email: '', message: '' };
  }

  getProductDetailUrl(product: Product): string {
    return `top-detail.html?src=new&id=${encodeURIComponent(product.id)}&return=index.html`;
  }

  handleBuyNow(product: Product): void {
    console.log('Buy now:', product);
    // Navigate to checkout or product detail
    window.location.href = this.getProductDetailUrl(product);
  }

  handleAddToCart(product: Product): void {
    console.log('Add to cart:', product);
    // Add to cart logic here
    alert(`${product.name} added to cart!`);
  }
}
