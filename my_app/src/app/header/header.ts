import { Component, OnInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  isLoggedIn = false;
  searchActive = false;
  searchQuery = '';
  isScrolled = false;
  isHomePage = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {
    // Listen to route changes
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isHomePage = event.url === '/home' || event.url === '/';
      }
    });
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
      this.initSubmenuHandlers();
      // Check initial route
      this.isHomePage = this.router.url === '/home' || this.router.url === '/';
    }
  }

  checkLoginStatus(): void {
    const user = localStorage.getItem('loggedInUser');
    this.isLoggedIn = !!user;
  }

  toggleSubmenu(event: Event): void {
    event.preventDefault();
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
      // Focus input after animation
      setTimeout(() => {
        const input = document.querySelector('.search-container .search-input') as HTMLInputElement;
        if (input) input.focus();
      }, 400);
    }
  }

  onSearchBlur(): void {
    // Close search if empty
    if (!this.searchQuery.trim()) {
      setTimeout(() => {
        this.searchActive = false;
      }, 200);
    }
  }

  onSearchInput(): void {
    // Implement search logic here
    console.log('Searching for:', this.searchQuery);
  }

  closeMenu(): void {
    const menuToggler = document.getElementById('menu-toggler') as HTMLInputElement;
    if (menuToggler) {
      menuToggler.checked = false;
    }
  }

  initSubmenuHandlers(): void {
    setTimeout(() => {
      const submenuControls = document.querySelectorAll('.submenu-control');
      submenuControls.forEach(control => {
        control.addEventListener('click', (e) => {
          e.preventDefault();
          const parentLi = (e.target as HTMLElement).closest('.has-submenu');
          if (parentLi) {
            parentLi.classList.toggle('submenu-open');
          }
        });
      });
    }, 0);
  }
}
