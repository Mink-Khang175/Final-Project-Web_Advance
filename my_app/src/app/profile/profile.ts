import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { MembershipCard } from '../membership-card/membership-card';
import { ChatAI } from '../chat-ai/chat-ai';
import { ApiService, Order as ApiOrder, ReturnRequest, WishlistItem } from '../api.service';

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
  imports: [CommonModule, Header, Footer, MembershipCard, FormsModule, RouterModule, ChatAI],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
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
  returnRequests: ReturnRequest[] = [];
  loadingReturns = false;
  returnReasonByOrderId: Record<string, string> = {};
  returnPanelOpenByOrderId: Record<string, boolean> = {};
  orderNotice: { type: 'success' | 'error'; text: string } | null = null;
  wishlistItems: WishlistItem[] = [];
  loadingWishlist = false;
  returnSubmittingOrderIds: string[] = [];
  private orderNoticeTimer: any = null;

  // Logged in user ID from MongoDB
  userId = '';
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}
  
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserData();
      this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
        const tab = (params['tab'] || '').toString().toLowerCase();
        const supportedTabs = ['information', 'orders', 'returns', 'wishlist', 'alerts', 'help', 'deactivate'];
        if (supportedTabs.includes(tab)) {
          this.setActiveMenu(tab);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.orderNoticeTimer) {
      clearTimeout(this.orderNoticeTimer);
      this.orderNoticeTimer = null;
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
      this.userPhoto = userData.image || userData.avatar || '';

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
            const latestPhoto = user.image || user.avatar || userData.image || userData.avatar || this.userPhoto || '';
            this.userPhoto = latestPhoto;
            const merged = {
              ...userData,
              ...user,
              image: user.image || userData.image || user.avatar || userData.avatar || '',
              avatar: user.avatar || userData.avatar || user.image || userData.image || ''
            };
            localStorage.setItem('loggedInUser', JSON.stringify(merged));
            window.dispatchEvent(new Event('user-profile-updated'));
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
            const existingRaw = localStorage.getItem('loggedInUser');
            const existing = existingRaw ? JSON.parse(existingRaw) : {};
            localStorage.setItem('loggedInUser', JSON.stringify({ ...existing, ...updatedUser }));
            window.dispatchEvent(new Event('user-profile-updated'));
            this.isEditMode = false;
            this.tempUserInfo = null;
            alert('Your information has been updated successfully!');
          },
          error: () => {
            // Fallback: save locally
            const existingRaw = localStorage.getItem('loggedInUser');
            const existing = existingRaw ? JSON.parse(existingRaw) : {};
            localStorage.setItem('loggedInUser', JSON.stringify({
              ...existing,
              name: this.userInfo.fullName,
              fullName: this.userInfo.fullName,
              email: this.userInfo.email,
              password: this.userInfo.password,
              phone: this.userInfo.phone,
              address: this.userInfo.address,
              city: this.userInfo.city,
              postalCode: this.userInfo.postalCode,
              country: this.userInfo.country,
              dateOfBirth: this.userInfo.dateOfBirth,
              gender: this.userInfo.gender
            }));
            window.dispatchEvent(new Event('user-profile-updated'));
            this.isEditMode = false;
            this.tempUserInfo = null;
            alert('Saved locally (server unavailable).');
          }
        });
      } else {
        const existingRaw = localStorage.getItem('loggedInUser');
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        localStorage.setItem('loggedInUser', JSON.stringify({
          ...existing,
          name: this.userInfo.fullName,
          fullName: this.userInfo.fullName,
          email: this.userInfo.email,
          password: this.userInfo.password,
          phone: this.userInfo.phone,
          address: this.userInfo.address,
          city: this.userInfo.city,
          postalCode: this.userInfo.postalCode,
          country: this.userInfo.country,
          dateOfBirth: this.userInfo.dateOfBirth,
          gender: this.userInfo.gender
        }));
        window.dispatchEvent(new Event('user-profile-updated'));
        this.isEditMode = false;
        this.tempUserInfo = null;
      }
    }
  }
  
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onAvatarChanged(imageBase64: string): void {
    this.userPhoto = imageBase64;
    // Sync into localStorage so header/other components reflect immediately
    const saved = localStorage.getItem('loggedInUser');
    if (saved) {
      const userData = JSON.parse(saved);
      userData.image = imageBase64;
      userData.avatar = imageBase64;
      localStorage.setItem('loggedInUser', JSON.stringify(userData));
      window.dispatchEvent(new Event('user-profile-updated'));
    }
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

    if (menu === 'returns' && this.userId) {
      this.loadingReturns = true;
      this.api.getReturnsByUser(this.userId).subscribe({
        next: (list) => {
          this.returnRequests = (list || []).filter(r => (r.status || '').toLowerCase() === 'approved');
          this.loadingReturns = false;
        },
        error: () => {
          this.returnRequests = [];
          this.loadingReturns = false;
        }
      });
    }

    if (menu === 'wishlist' && this.userId) {
      this.loadingWishlist = true;
      this.api.getWishlist(this.userId).subscribe({
        next: (list) => {
          this.wishlistItems = list || [];
          this.syncWishlistCache(this.wishlistItems);
          this.loadingWishlist = false;
        },
        error: () => {
          this.wishlistItems = [];
          this.loadingWishlist = false;
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
    window.dispatchEvent(new Event('user-profile-updated'));
    this.router.navigate(['/auth']);
  }

  requestReturn(order: ApiOrder): void {
    if (!this.userId || !order._id || this.returnSubmittingOrderIds.includes(order._id)) return;

    const reason = (this.returnReasonByOrderId[order._id] || '').trim();
    if (!reason) {
      this.showOrderNotice('error', 'Please enter a return reason before submitting.');
      return;
    }

    this.returnSubmittingOrderIds.push(order._id);
    this.api.createReturn({
      userId: this.userId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason,
      totalAmount: order.totalAmount,
      items: order.items
    }).subscribe({
      next: () => {
        this.orders = this.orders.map(o => o._id === order._id ? { ...o, status: 'return_requested' } : o);
        this.returnReasonByOrderId[order._id!] = '';
        this.returnPanelOpenByOrderId[order._id!] = false;
        this.showOrderNotice('success', `Return request sent successfully for order #${order.orderNumber}. Waiting for admin approval.`);
        this.returnSubmittingOrderIds = this.returnSubmittingOrderIds.filter(id => id !== order._id);
      },
      error: (err) => {
        this.showOrderNotice('error', err?.error?.message || 'Unable to request return for this order.');
        this.returnSubmittingOrderIds = this.returnSubmittingOrderIds.filter(id => id !== order._id);
      }
    });
  }

  private showOrderNotice(type: 'success' | 'error', text: string): void {
    this.orderNotice = { type, text };
    if (this.orderNoticeTimer) {
      clearTimeout(this.orderNoticeTimer);
    }
    this.orderNoticeTimer = setTimeout(() => {
      this.orderNotice = null;
      this.orderNoticeTimer = null;
    }, 4000);
  }

  canRequestReturn(order: ApiOrder): boolean {
    const status = (order.status || '').toLowerCase();
    return !['return_requested', 'returned', 'cancelled'].includes(status);
  }

  toggleReturnPanel(orderId?: string): void {
    if (!orderId) return;
    this.returnPanelOpenByOrderId[orderId] = !this.returnPanelOpenByOrderId[orderId];
  }

  isReturnPanelOpen(orderId?: string): boolean {
    if (!orderId) return false;
    return !!this.returnPanelOpenByOrderId[orderId];
  }

  isSubmittingReturn(orderId?: string): boolean {
    if (!orderId) return false;
    return this.returnSubmittingOrderIds.includes(orderId);
  }

  openWishlistProduct(wish: WishlistItem): void {
    const productId = (wish?.productId || '').trim();
    if (!productId) return;
    this.router.navigate(['/product-detail'], { queryParams: { id: productId } });
  }

  private syncWishlistCache(items: WishlistItem[]): void {
    if (!isPlatformBrowser(this.platformId) || !this.userId) return;
    const ids = (items || [])
      .map(item => item?.productId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    localStorage.setItem(`wishlistProductIds:${this.userId}`, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent('wishlist:sync'));
  }
}
