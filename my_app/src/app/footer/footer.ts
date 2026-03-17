import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements OnInit {
  currentYear = new Date().getFullYear();
  newsletterEmail = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Initialize footer
  }

  onNewsletterSubmit(event: Event): void {
    event.preventDefault();
    if (this.newsletterEmail) {
      console.log('Newsletter subscription:', this.newsletterEmail);
      alert('Thank you for subscribing!');
      this.newsletterEmail = '';
    }
  }

  goToNewArrivals(event: Event): void {
    event.preventDefault();

    const path = this.router.url.split('?')[0].split('#')[0];
    if (path !== '/home' && path !== '/') {
      this.router.navigate(['/home'], { fragment: 'new-arrivals-poster' });
      return;
    }

    const container = document.querySelector('.stack-container') as HTMLElement | null;
    const target = document.getElementById('new-arrivals-poster') as HTMLElement | null;
    if (!container || !target) {
      this.router.navigate(['/home'], { fragment: 'new-arrivals-poster' });
      return;
    }

    const section = target.closest('section[id]') as HTMLElement | null;
    const sectionId = section?.id;
    if (!sectionId) return;

    const sections = Array.from(container.querySelectorAll('section[id]')) as HTMLElement[];
    let offset = 0;
    for (const s of sections) {
      if (s.id === sectionId) break;
      offset += s.scrollHeight || s.offsetHeight;
    }

    container.scrollTo({ top: offset, behavior: 'smooth' });
  }
}
