import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
  membershipLevel?: string;
  totalSpent?: number;
  isActive?: boolean;
  createdAt?: string;
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

// ── Category ──
export interface Category {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

// ── Review ──
export interface Review {
  _id: string;
  productId: string;
  userId: string;
  rating: number;
  comment?: string;
  userName?: string;
  userAvatar?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';

  constructor(private http: HttpClient) {}

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

  getUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.base}/users`).pipe(map(r => r.data));
  }

  getUser(id: string): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.base}/users/${id}`).pipe(map(r => r.data));
  }

  updateUser(id: string, data: Partial<User>): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.base}/users/${id}`, data).pipe(map(r => r.data));
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/users/${id}`);
  }

  // ────────────── PRODUCT ──────────────
  getProducts(): Observable<Product[]> {
    return this.http.get<ApiResponse<Product[]>>(`${this.base}/products`).pipe(map(r => r.data));
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
    return this.http.post<ApiResponse<Product>>(`${this.base}/products`, data).pipe(map(r => r.data));
  }

  updateProduct(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.put<ApiResponse<Product>>(`${this.base}/products/${id}`, data).pipe(map(r => r.data));
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/products/${id}`);
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
    return this.http.get<ApiResponse<Order[]>>(`${this.base}/orders`).pipe(map(r => r.data));
  }

  getOrdersByUser(userId: string): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(`${this.base}/orders/user/${userId}`).pipe(map(r => r.data));
  }

  createOrder(data: Partial<Order>): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(`${this.base}/orders`, data).pipe(map(r => r.data));
  }

  updateOrder(id: string, data: Partial<Order>): Observable<Order> {
    return this.http.put<ApiResponse<Order>>(`${this.base}/orders/${id}`, data).pipe(map(r => r.data));
  }

  deleteOrder(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/orders/${id}`);
  }

  // ────────────── CATEGORY ──────────────
  getCategories(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(`${this.base}/categories`).pipe(map(r => r.data));
  }

  // ────────────── REVIEW ──────────────
  getReviewsByProduct(productId: string): Observable<Review[]> {
    return this.http.get<ApiResponse<Review[]>>(`${this.base}/reviews/product/${productId}`).pipe(map(r => r.data));
  }

  createReview(data: Partial<Review>): Observable<Review> {
    return this.http.post<ApiResponse<Review>>(`${this.base}/reviews`, data).pipe(map(r => r.data));
  }

  deleteReview(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/reviews/${id}`);
  }
}
