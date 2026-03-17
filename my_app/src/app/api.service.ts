import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

// ── User ──
export interface User {
  _id: string;
  email: string;
  password?: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  role?: string;
  avatar?: string;
  image?: string;
  membershipLevel?: string;
  totalSpent?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface AdminAccount {
  _id: string;
  email: string;
  name: string;
  role: 'admin';
  accountType: 'admin';
  permissions?: string[];
  lastLoginAt?: string;
}

// ── Product ──
export interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image?: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  stock?: number;
  rating?: number;
  soldCount?: number;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  tags?: string[];
  material?: string;
  careInstructions?: string;
}

// ── Cart ──
export interface CartItem {
  _id?: string;
  productId: string;
  productName?: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

export interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
}

// ── Order ──
export interface OrderItem {
  productId: string;
  productName?: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface Order {
  _id: string;
  userId: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress?: string;
  paymentMethod?: string;
  status?: string;
  createdAt?: string;
}

// ── Wishlist ──
export interface WishlistItem {
  _id: string;
  userId: string;
  productId: string;
  productName?: string;
  image?: string;
  price?: number;
  category?: string;
  createdAt?: string;
}

// ── Returns ──
export interface ReturnRequest {
  _id: string;
  userId: string;
  orderId: string;
  orderNumber: string;
  reason?: string;
  status?: string;
  adminNote?: string;
  reviewedAt?: string;
  items?: OrderItem[];
  totalAmount?: number;
  createdAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';
  private productsCache$: Observable<Product[]> | null = null;
  private usersCache$: Observable<User[]> | null = null;
  private ordersCache$: Observable<Order[]> | null = null;
  private returnsCache$: Observable<ReturnRequest[]> | null = null;

  constructor(private http: HttpClient) {}

  private invalidateProductsCache(): void {
    this.productsCache$ = null;
  }

  private invalidateUsersCache(): void {
    this.usersCache$ = null;
  }

  private invalidateOrdersCache(): void {
    this.ordersCache$ = null;
  }

  private invalidateReturnsCache(): void {
    this.returnsCache$ = null;
  }

  private handleError(err: any): Observable<never> {
    let message = 'Something went wrong. Please try again.';
    if (err.error) {
      if (typeof err.error === 'string') {
        try {
          const parsed = JSON.parse(err.error);
          message = parsed.message || message;
        } catch {
          message = err.error || message;
        }
      } else if (typeof err.error === 'object') {
        message = err.error.message || message;
      }
    } else if (err.message) {
      message = err.message;
    }
    return throwError(() => ({ error: { message } }));
  }

  // ────────────── USER ──────────────
  register(data: { email: string; password: string; name: string; phone?: string; address?: string }): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.base}/users/register`, data).pipe(
      map(r => r.data),
      catchError(err => this.handleError(err))
    );
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.base}/users/login`, { email, password }).pipe(
      map(r => r.data),
      catchError(err => this.handleError(err))
    );
  }

  loginAdmin(email: string, password: string): Observable<AdminAccount> {
    return this.http.post<ApiResponse<AdminAccount>>(`${this.base}/admin/login`, { email, password }).pipe(
      map(r => r.data),
      catchError(err => this.handleError(err))
    );
  }

  getUsers(): Observable<User[]> {
    if (!this.usersCache$) {
      this.usersCache$ = this.http.get<ApiResponse<User[]>>(`${this.base}/users`).pipe(
        map(r => r.data),
        shareReplay(1),
        catchError((err) => {
          this.invalidateUsersCache();
          return this.handleError(err);
        })
      );
    }
    return this.usersCache$;
  }

  getUser(id: string): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.base}/users/${id}`).pipe(map(r => r.data));
  }

  updateUser(id: string, data: Partial<User>): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.base}/users/${id}`, data).pipe(
      map(r => r.data),
      tap(() => this.invalidateUsersCache())
    );
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/users/${id}`).pipe(
      tap(() => this.invalidateUsersCache())
    );
  }

  // ────────────── PRODUCT ──────────────
  getProducts(): Observable<Product[]> {
    if (!this.productsCache$) {
      this.productsCache$ = this.http.get<ApiResponse<Product[]>>(`${this.base}/products`).pipe(
        map(r => r.data),
        // Reuse one in-flight/result stream across pages to avoid duplicate requests.
        shareReplay(1),
        catchError((err) => {
          this.invalidateProductsCache();
          return this.handleError(err);
        })
      );
    }
    return this.productsCache$;
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.base}/products/${id}`).pipe(map(r => r.data));
  }

  getProductsByCategory(category: string): Observable<Product[]> {
    return this.http.get<ApiResponse<Product[]>>(`${this.base}/products/category/${category}`).pipe(map(r => r.data));
  }

  searchProducts(keyword: string): Observable<Product[]> {
    return this.http.get<ApiResponse<Product[]>>(`${this.base}/products/search/${keyword}`).pipe(map(r => r.data));
  }

  createProduct(data: Partial<Product>): Observable<Product> {
    return this.http.post<ApiResponse<Product>>(`${this.base}/products`, data).pipe(
      map(r => r.data),
      tap(() => this.invalidateProductsCache())
    );
  }

  updateProduct(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.put<ApiResponse<Product>>(`${this.base}/products/${id}`, data).pipe(
      map(r => r.data),
      tap(() => this.invalidateProductsCache())
    );
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/products/${id}`).pipe(
      tap(() => this.invalidateProductsCache())
    );
  }

  // ────────────── CART ──────────────
  getCart(userId: string): Observable<Cart> {
    return this.http.get<ApiResponse<Cart>>(`${this.base}/cart/${userId}`).pipe(map(r => r.data));
  }

  addToCart(userId: string, item: CartItem): Observable<Cart> {
    return this.http.post<ApiResponse<Cart>>(`${this.base}/cart`, { userId, item }).pipe(map(r => r.data));
  }

  updateCartItem(userId: string, itemId: string, quantity: number): Observable<Cart> {
    return this.http.put<ApiResponse<Cart>>(`${this.base}/cart/${userId}/item/${itemId}`, { quantity }).pipe(map(r => r.data));
  }

  removeCartItem(userId: string, itemId: string): Observable<Cart> {
    return this.http.delete<ApiResponse<Cart>>(`${this.base}/cart/${userId}/item/${itemId}`).pipe(map(r => r.data));
  }

  clearCart(userId: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/cart/${userId}`);
  }

  // ────────────── ORDER ──────────────
  getOrders(): Observable<Order[]> {
    if (!this.ordersCache$) {
      this.ordersCache$ = this.http.get<ApiResponse<Order[]>>(`${this.base}/orders`).pipe(
        map(r => r.data),
        shareReplay(1),
        catchError((err) => {
          this.invalidateOrdersCache();
          return this.handleError(err);
        })
      );
    }
    return this.ordersCache$;
  }

  getOrdersByUser(userId: string): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(`${this.base}/orders/user/${userId}`).pipe(map(r => r.data));
  }

  createOrder(data: Partial<Order>): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(`${this.base}/orders`, data).pipe(
      map(r => r.data),
      tap(() => this.invalidateOrdersCache())
    );
  }

  updateOrder(id: string, data: Partial<Order>): Observable<Order> {
    return this.http.put<ApiResponse<Order>>(`${this.base}/orders/${id}`, data).pipe(
      map(r => r.data),
      tap(() => this.invalidateOrdersCache())
    );
  }

  deleteOrder(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/orders/${id}`).pipe(
      tap(() => this.invalidateOrdersCache())
    );
  }

  // ────────────── WISHLIST ──────────────
  getWishlist(userId: string): Observable<WishlistItem[]> {
    return this.http.get<ApiResponse<WishlistItem[]>>(`${this.base}/wishlist/${userId}`).pipe(map(r => r.data));
  }

  addToWishlist(data: Partial<WishlistItem>): Observable<WishlistItem> {
    return this.http.post<ApiResponse<WishlistItem>>(`${this.base}/wishlist`, data).pipe(map(r => r.data));
  }

  removeFromWishlist(userId: string, productId: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/wishlist/${userId}/${productId}`);
  }

  // ────────────── RETURNS ──────────────
  getReturnsByUser(userId: string): Observable<ReturnRequest[]> {
    return this.http.get<ApiResponse<ReturnRequest[]>>(`${this.base}/returns/user/${userId}`).pipe(map(r => r.data));
  }

  getReturns(): Observable<ReturnRequest[]> {
    if (!this.returnsCache$) {
      this.returnsCache$ = this.http.get<ApiResponse<ReturnRequest[]>>(`${this.base}/returns`).pipe(
        map(r => r.data),
        shareReplay(1),
        catchError((err) => {
          this.invalidateReturnsCache();
          return this.handleError(err);
        })
      );
    }
    return this.returnsCache$;
  }

  createReturn(data: Partial<ReturnRequest>): Observable<ReturnRequest> {
    return this.http.post<ApiResponse<ReturnRequest>>(`${this.base}/returns`, data).pipe(
      map(r => r.data),
      tap(() => {
        this.invalidateReturnsCache();
        this.invalidateOrdersCache();
      })
    );
  }

  decideReturn(id: string, approved: boolean, adminNote?: string): Observable<ReturnRequest> {
    return this.http.put<ApiResponse<ReturnRequest>>(`${this.base}/returns/${id}/decision`, {
      approved,
      adminNote
    }).pipe(
      map(r => r.data),
      tap(() => {
        this.invalidateReturnsCache();
        this.invalidateOrdersCache();
      })
    );
  }

  // ────────────── AI CHAT ──────────────
  askAssistant(
    message: string,
    history: ChatMessage[],
    userName?: string,
    options?: { model?: string; apiVersion?: string }
  ): Observable<string> {
    return this.http.post<ApiResponse<{ reply: string }>>(`${this.base}/chat/assistant`, {
      message,
      history,
      userName,
      model: options?.model,
      apiVersion: options?.apiVersion
    }).pipe(map(r => r.data.reply));
  }
}
