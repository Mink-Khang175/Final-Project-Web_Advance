import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';

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
  imports: [CommonModule, Header, Footer, FormsModule],
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
  activeMenu = 'orders';
  
  // User Information
  userInfo: UserInfo = {
    fullName: 'JOHN DOE',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Fashion Street',
    city: 'New York',
    postalCode: '10001',
    country: 'United States',
    dateOfBirth: '1990-01-15',
    gender: 'male',
    password: '••••••••',
    newsletter: true,
    notifications: true
  };
  
  // Edit Mode
  isEditMode = false;
  tempUserInfo: UserInfo | null = null;
  showPassword = false;
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}
  
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserData();
    }
  }
  
  loadUserData(): void {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      this.userInfo = { ...this.userInfo, ...userData };
      this.userName = this.userInfo.fullName;
      this.userEmail = this.userInfo.email;
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
      // Update membership card
      this.userName = this.userInfo.fullName;
      this.userEmail = this.userInfo.email;
      
      // Save to localStorage
      localStorage.setItem('loggedInUser', JSON.stringify(this.userInfo));
      
      // Exit edit mode
      this.isEditMode = false;
      this.tempUserInfo = null;
      
      alert('Your information has been updated successfully!');
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
    // Logout logic here
    console.log('Logging out...');
  }
}
