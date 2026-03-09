import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.css',
})
export class AdminPage implements OnInit {
  activeTab: 'products' | 'orders' | 'users' = 'products';

  // ---- Products ----
  products: any[] = [];
  productLoading = false;
  showModal = false;
  editingProduct: any = null;
  deleteConfirmId: string | null = null;
  searchQuery = '';
  isSaving = false;

  form: any = this.emptyForm();

  // helpers for comma-separated inputs
  sizesInput = '';
  colorsInput = '';
  tagsInput = '';

  // ---- Orders ----
  orders: any[] = [];
  ordersLoading = false;

  // ---- Users ----
  users: any[] = [];
  usersLoading = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  // ============ Products ============
  loadProducts(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.productLoading = true;
    this.api.getProducts().subscribe({
      next: (data) => { this.products = data; this.productLoading = false; this.cdr.detectChanges(); },
      error: () => { this.productLoading = false; this.cdr.detectChanges(); }
    });
  }

  get filteredProducts(): any[] {
    if (!this.searchQuery.trim()) return this.products;
    const q = this.searchQuery.toLowerCase();
    return this.products.filter(p =>
      p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }

  openAddModal(): void {
    this.editingProduct = null;
    this.form = this.emptyForm();
    this.sizesInput = '';
    this.colorsInput = '';
    this.tagsInput = '';
    this.showModal = true;
  }

  openEditModal(product: any): void {
    this.editingProduct = product;
    this.form = {
      name: product.name || '',
      category: product.category || '',
      price: product.price || '',
      originalPrice: product.originalPrice || '',
      discount: product.discount || '',
      image: (product.image || '').replace(/^\/assets\/images\//, ''),
      description: product.description || '',
      stock: product.stock ?? '',
      isNewArrival: product.isNewArrival || false,
      isBestSeller: product.isBestSeller || false,
      material: product.material || '',
    };
    this.sizesInput = (product.sizes || []).join(', ');
    this.colorsInput = (product.colors || []).join(', ');
    this.tagsInput = (product.tags || []).join(', ');
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingProduct = null;
  }

  saveProduct(): void {
    if (this.isSaving) return;
    this.isSaving = true;
    const imageShort = this.form.image.trim();
    const payload = {
      ...this.form,
      image: imageShort ? '/assets/images/' + imageShort : '',
      price: Number(this.form.price),
      originalPrice: this.form.originalPrice ? Number(this.form.originalPrice) : undefined,
      discount: this.form.discount ? Number(this.form.discount) : undefined,
      stock: this.form.stock !== '' ? Number(this.form.stock) : 0,
      sizes: this.sizesInput.split(',').map(s => s.trim()).filter(Boolean),
      colors: this.colorsInput.split(',').map(s => s.trim()).filter(Boolean),
      tags: this.tagsInput.split(',').map(s => s.trim()).filter(Boolean),
    };

    if (this.editingProduct) {
      this.api.updateProduct(this.editingProduct._id, payload).subscribe({
        next: () => { this.isSaving = false; this.closeModal(); this.loadProducts(); },
        error: (e) => { this.isSaving = false; alert('Error: ' + e.message); }
      });
    } else {
      this.api.createProduct(payload).subscribe({
        next: () => { this.isSaving = false; this.closeModal(); this.loadProducts(); },
        error: (e) => { this.isSaving = false; alert('Error: ' + e.message); }
      });
    }
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  doDelete(): void {
    if (!this.deleteConfirmId) return;
    this.api.deleteProduct(this.deleteConfirmId).subscribe({
      next: () => { this.deleteConfirmId = null; this.loadProducts(); },
      error: (e) => alert('Error: ' + e.message)
    });
  }

  // ============ Orders ============
  loadOrders(): void {
    this.ordersLoading = true;
    this.api.getOrders().subscribe({
      next: (data) => { this.orders = data; this.ordersLoading = false; },
      error: () => { this.ordersLoading = false; }
    });
  }

  // ============ Users ============
  loadUsers(): void {
    this.usersLoading = true;
    this.api.getUsers().subscribe({
      next: (data) => { this.users = data; this.usersLoading = false; },
      error: () => { this.usersLoading = false; }
    });
  }

  // ============ Tabs ============
  setTab(tab: 'products' | 'orders' | 'users'): void {
    this.activeTab = tab;
    if (tab === 'orders' && !this.orders.length) this.loadOrders();
    if (tab === 'users' && !this.users.length) this.loadUsers();
  }

  private emptyForm() {
    return {
      name: '', category: '', price: '', originalPrice: '',
      discount: '', image: '', description: '', stock: '',
      isNewArrival: false, isBestSeller: false, material: ''
    };
  }

  getStatusClass(status: string): string {
    const map: any = { pending: 'status-pending', processing: 'status-processing', completed: 'status-completed', cancelled: 'status-cancelled' };
    return map[status] || '';
  }
}
