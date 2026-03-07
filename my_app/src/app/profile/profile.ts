import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { MembershipCard } from '../membership-card/membership-card';
import { ApiService, Order as ApiOrder } from '../api.service';

interface UserInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  dateOfBirth: string;
  gender: string;
  password: string;
  newsletter: boolean;
  notifications: boolean;
}

@Component({
  selector: 'app-profile',
  imports: [CommonModule, Header, Footer, MembershipCard, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  // User Data
  userName = 'JOHN DOE';
  userEmail = 'john.doe@example.com';
  userPhoto = '';
  userIllustration = '';
  cardNumber = '220225 - FW342 - 02';
  barcodeNumber = 'LOOK 2-25-M';
  memberSince = '2025 F/W';
  memberStatus = 'PREMIUM';
  
  // Active Menu State
  activeMenu = 'information';
  
  // User Information
  userInfo: UserInfo = {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    dateOfBirth: '',
    gender: 'male',
    password: '',
    newsletter: true,
    notifications: true
  };
  
  // Edit Mode
  isEditMode = false;
  tempUserInfo: UserInfo | null = null;
  showPassword = false;

  // Orders from API
  orders: ApiOrder[] = [];
  loadingOrders = false;

  // Logged in user ID from MongoDB
  private userId = '';
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private api: ApiService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserData();
    }
  }
  
  loadUserData(): void {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      this.userId = userData._id || '';
      this.userInfo = {
        ...this.userInfo,
        fullName: userData.name || userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        city: userData.city || '',
        postalCode: userData.postalCode || '',
        country: userData.country || '',
        dateOfBirth: userData.dateOfBirth || '',
        gender: userData.gender || 'male',
        password: userData.password || ''
      };
      this.userName = this.userInfo.fullName;
      this.userEmail = this.userInfo.email;
      this.memberStatus = userData.membershipLevel || 'Silver';

      // Load fresh data from backend
      if (this.userId) {
        this.api.getUser(this.userId).subscribe({
          next: (user) => {
            this.userInfo.fullName = user.name;
            this.userInfo.email = user.email;
            this.userInfo.phone = user.phone || '';
            this.userInfo.address = user.address || '';
            this.userInfo.city = user.city || '';
            this.userInfo.postalCode = user.postalCode || '';
            this.userInfo.country = user.country || '';
            this.userInfo.dateOfBirth = user.dateOfBirth || '';
            this.userInfo.gender = user.gender || 'male';
            this.userInfo.password = user.password || '';
            this.userName = user.name;
            this.userEmail = user.email;
            this.memberStatus = user.membershipLevel || 'Silver';
          },
          error: () => {} // Use cached data
        });
      }
    } else {
      this.router.navigate(['/auth']);
    }
  }
  
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode) {
      // Save current data as temp
      this.tempUserInfo = { ...this.userInfo };
    } else {
      // Cancel edit - restore from temp
      if (this.tempUserInfo) {
        this.userInfo = { ...this.tempUserInfo };
        this.tempUserInfo = null;
      }
    }
  }
  
  saveUserInfo(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.userName = this.userInfo.fullName;
      this.userEmail = this.userInfo.email;

      // Save to backend
      if (this.userId) {
        this.api.updateUser(this.userId, {
          name: this.userInfo.fullName,
          email: this.userInfo.email,
          password: this.userInfo.password,
          phone: this.userInfo.phone,
          address: this.userInfo.address,
          city: this.userInfo.city,
          postalCode: this.userInfo.postalCode,
          country: this.userInfo.country,
          dateOfBirth: this.userInfo.dateOfBirth,
          gender: this.userInfo.gender
        }).subscribe({
          next: (updatedUser) => {
            localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
            this.isEditMode = false;
            this.tempUserInfo = null;
            alert('Your information has been updated successfully!');
          },
          error: () => {
            // Fallback: save locally
            localStorage.setItem('loggedInUser', JSON.stringify(this.userInfo));
            this.isEditMode = false;
            this.tempUserInfo = null;
            alert('Saved locally (server unavailable).');
          }
        });
      } else {
        localStorage.setItem('loggedInUser', JSON.stringify(this.userInfo));
        this.isEditMode = false;
        this.tempUserInfo = null;
      }
    }
  }
  
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  setActiveMenu(menu: string, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.activeMenu = menu;

    // Load orders when tab is activated
    if (menu === 'orders' && this.userId) {
      this.loadingOrders = true;
      this.api.getOrdersByUser(this.userId).subscribe({
        next: (orders) => {
          this.orders = orders || [];
          this.loadingOrders = false;
        },
        error: () => {
          this.orders = [];
          this.loadingOrders = false;
        }
      });
    }

    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const contentHeader = document.querySelector('.content-header');
        if (contentHeader) {
          const headerOffset = 80; // fixed header height
          const elementTop = contentHeader.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: elementTop - headerOffset, behavior: 'smooth' });
        }
      }, 0);
    }
  }

  getActiveMenuTitle(): string {
    const titles: { [key: string]: string } = {
      'orders': 'MY ORDERS',
      'returns': 'MY RETURNS',
      'wishlist': 'MY WISHLIST',
      'alerts': 'MY ALERTS',
      'information': 'MY INFORMATION',
      'credits': 'MY CREDITS & E-CARDS',
      'payment': 'MY PAYMENT METHODS',
      'help': 'IN NEED OF HELP',
      'deactivate': 'DEACTIVATE MY ACCOUNT'
    };
    return titles[this.activeMenu] || 'MY PROFILE';
  }

  logout(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    localStorage.removeItem('loggedInUser');
    this.router.navigate(['/auth']);
  }
}
