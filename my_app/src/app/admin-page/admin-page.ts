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
  activeTab: 'dashboard' | 'products' | 'orders' | 'returns' | 'users' | 'sales' | 'inventory' = 'dashboard';

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

  // ---- Returns ----
  returns: any[] = [];
  returnsLoading = false;
  decidingReturnId: string | null = null;
  private returnsRefreshTimer: any = null;

  // ---- Sales Report ----
  salesPeriod: 'week' | 'month' | 'year' = 'month';

  // ---- Inventory ----
  inventoryFilter: 'all' | 'low' | 'out' = 'all';
  inventorySearch = '';
  editingStockId: string | null = null;
  editingStockValue = 0;

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const raw = localStorage.getItem('loggedInUser');
    const current = raw ? JSON.parse(raw) : null;
    const isAdmin = current?.role === 'admin' || current?.accountType === 'admin';
    if (!isAdmin) {
      this.router.navigate(['/auth']);
      return;
    }
    this._loadAll();
    this.startReturnsAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.returnsRefreshTimer) {
      clearInterval(this.returnsRefreshTimer);
      this.returnsRefreshTimer = null;
    }
  }

  loadReturns(showLoader = true): void {
    if (showLoader || this.returns.length === 0) {
      this.returnsLoading = true;
    }
    this.api.getReturns().subscribe({
      next: (data) => {
        this.returns = data;
        this.returnsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.returnsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private _loadAll(): void {
    this.productLoading = true;
    this.ordersLoading = true;
    this.usersLoading = true;
    this.returnsLoading = true;
    this.api.getProducts().subscribe({
      next: (data) => { this.products = data; this.productLoading = false; this.cdr.detectChanges(); },
      error: () => { this.productLoading = false; this.cdr.detectChanges(); }
    });
    this.api.getOrders().subscribe({
      next: (data) => { this.orders = data; this.ordersLoading = false; this.cdr.detectChanges(); },
      error: () => { this.ordersLoading = false; this.cdr.detectChanges(); }
    });
    this.api.getUsers().subscribe({
      next: (data) => { this.users = data; this.usersLoading = false; this.cdr.detectChanges(); },
      error: () => { this.usersLoading = false; this.cdr.detectChanges(); }
    });
    this.loadReturns();
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

  // ============ Tabs ============
  setTab(tab: 'dashboard' | 'products' | 'orders' | 'returns' | 'users' | 'sales' | 'inventory'): void {
    this.activeTab = tab;
    if (tab === 'returns') {
      this.loadReturns(this.returns.length === 0);
    }
  }

  private startReturnsAutoRefresh(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.returnsRefreshTimer) {
      clearInterval(this.returnsRefreshTimer);
    }
    this.returnsRefreshTimer = setInterval(() => {
      if (this.activeTab === 'returns' && !this.decidingReturnId) {
        this.loadReturns(false);
      }
    }, 7000);
  }

  approveReturn(ret: any): void {
    if (!ret?._id || this.decidingReturnId) return;
    const adminNote = prompt('Optional approval note for customer:', '') || '';
    const prev = { ...ret };
    const reviewedAt = new Date().toISOString();
    this.returns = this.returns.map(r => r._id === ret._id ? { ...r, status: 'approved', adminNote, reviewedAt } : r);
    this.orders = this.orders.map(o => o._id === ret.orderId ? { ...o, status: 'returned' } : o);
    this.decidingReturnId = ret._id;
    this.api.decideReturn(ret._id, true, adminNote).subscribe({
      next: (updated) => {
        this.returns = this.returns.map(r => r._id === updated._id ? updated : r);
        this.orders = this.orders.map(o => o._id === updated.orderId ? { ...o, status: 'returned' } : o);
        this.decidingReturnId = null;
        this.loadReturns();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.returns = this.returns.map(r => r._id === prev._id ? prev : r);
        this.decidingReturnId = null;
        alert(e?.error?.message || 'Failed to approve return');
      }
    });
  }

  rejectReturn(ret: any): void {
    if (!ret?._id || this.decidingReturnId) return;
    const adminNote = prompt('Reason for rejection (required):', '') || '';
    if (!adminNote.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    const prev = { ...ret };
    const reviewedAt = new Date().toISOString();
    this.returns = this.returns.map(r => r._id === ret._id ? { ...r, status: 'rejected', adminNote: adminNote.trim(), reviewedAt } : r);
    this.orders = this.orders.map(o => o._id === ret.orderId ? { ...o, status: 'completed' } : o);
    this.decidingReturnId = ret._id;
    this.api.decideReturn(ret._id, false, adminNote.trim()).subscribe({
      next: (updated) => {
        this.returns = this.returns.map(r => r._id === updated._id ? updated : r);
        this.orders = this.orders.map(o => o._id === updated.orderId ? { ...o, status: 'completed' } : o);
        this.decidingReturnId = null;
        this.loadReturns();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.returns = this.returns.map(r => r._id === prev._id ? prev : r);
        this.decidingReturnId = null;
        alert(e?.error?.message || 'Failed to reject return');
      }
    });
  }

  canDecideReturn(ret: any): boolean {
    const status = (ret?.status || '').toLowerCase();
    return status === 'requested';
  }

  private emptyForm() {
    return {
      name: '', category: '', price: '', originalPrice: '',
      discount: '', image: '', description: '', stock: '',
      isNewArrival: false, isBestSeller: false, material: ''
    };
  }

  getStatusClass(status: string): string {
    const map: any = {
      pending: 'status-pending',
      processing: 'status-processing',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      requested: 'status-pending',
      approved: 'status-completed',
      rejected: 'status-cancelled',
      return_requested: 'status-pending',
      returned: 'status-completed'
    };
    return map[status] || '';
  }

  // ============ Dashboard KPIs ============
  get dashboardLoading(): boolean {
    return this.productLoading || this.ordersLoading || this.usersLoading;
  }

  get totalRevenue(): number {
    return this.orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
  }

  get avgOrderValue(): number {
    const valid = this.orders.filter(o => o.status !== 'cancelled');
    return valid.length ? this.totalRevenue / valid.length : 0;
  }

  get revenueByMonth(): { label: string; total: number; barPct: number }[] {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const total = this.orders
        .filter(o => o.status !== 'cancelled' && o.createdAt)
        .filter(o => { const od = new Date(o.createdAt); return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth(); })
        .reduce((s, o) => s + (o.totalAmount || 0), 0);
      return { label, total };
    });
    const max = Math.max(1, ...months.map(m => m.total));
    return months.map(m => ({ ...m, barPct: Math.round((m.total / max) * 100) }));
  }

  get orderStatusDist(): { status: string; count: number; pct: number; cls: string }[] {
    const map: Record<string, number> = {};
    this.orders.forEach(o => { const s = o.status || 'unknown'; map[s] = (map[s] || 0) + 1; });
    const total = this.orders.length || 1;
    const clsMap: Record<string, string> = { pending: 'status-pending', processing: 'status-processing', completed: 'status-completed', cancelled: 'status-cancelled' };
    return Object.entries(map)
      .map(([status, count]) => ({ status, count, pct: Math.round((count / total) * 100), cls: clsMap[status] || '' }))
      .sort((a, b) => b.count - a.count);
  }

  get topProducts(): { name: string; revenue: number; count: number }[] {
    const map: Record<string, { revenue: number; count: number }> = {};
    this.orders.filter(o => o.status !== 'cancelled').forEach(o => {
      (o.items || []).forEach((item: any) => {
        const name = item.productName || item.name || 'Unknown';
        if (!map[name]) map[name] = { revenue: 0, count: 0 };
        map[name].revenue += (item.price || 0) * (item.quantity || 1);
        map[name].count += item.quantity || 1;
      });
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }

  // ============ Sales Report ============
  get salesRows(): { label: string; orders: number; revenue: number }[] {
    const now = new Date();
    if (this.salesPeriod === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(now.getDate() - (6 - i));
        const label = d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const dayOrders = this.orders.filter(o => o.createdAt && new Date(o.createdAt).toDateString() === d.toDateString());
        return { label, orders: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0) };
      });
    }
    if (this.salesPeriod === 'year') {
      return Array.from({ length: 3 }, (_, i) => {
        const year = now.getFullYear() - (2 - i);
        const yearOrders = this.orders.filter(o => o.createdAt && new Date(o.createdAt).getFullYear() === year);
        return { label: year.toString(), orders: yearOrders.length, revenue: yearOrders.reduce((s, o) => s + (o.totalAmount || 0), 0) };
      });
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const monthOrders = this.orders.filter(o => {
        if (!o.createdAt) return false;
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });
      return { label, orders: monthOrders.length, revenue: monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0) };
    });
  }

  get salesChartRows(): { label: string; orders: number; revenue: number; barPct: number }[] {
    const rows = this.salesRows;
    const max = Math.max(1, ...rows.map(r => r.revenue));
    return rows.map(r => ({ ...r, barPct: Math.round((r.revenue / max) * 100) }));
  }

  get salesTotal(): { orders: number; revenue: number } {
    return this.salesRows.reduce((acc, r) => ({ orders: acc.orders + r.orders, revenue: acc.revenue + r.revenue }), { orders: 0, revenue: 0 });
  }

  // ============ Inventory ============
  get filteredInventory(): any[] {
    let result = [...this.products];
    if (this.inventoryFilter === 'low') result = result.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10);
    else if (this.inventoryFilter === 'out') result = result.filter(p => (p.stock ?? 0) === 0);
    if (this.inventorySearch.trim()) {
      const q = this.inventorySearch.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    return result.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  }

  get lowStockCount(): number { return this.products.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10).length; }
  get outOfStockCount(): number { return this.products.filter(p => (p.stock ?? 0) === 0).length; }

  startEditStock(p: any): void { this.editingStockId = p._id; this.editingStockValue = p.stock ?? 0; }

  saveStock(p: any): void {
    this.api.updateProduct(p._id, { ...p, stock: this.editingStockValue }).subscribe({
      next: () => { p.stock = this.editingStockValue; this.editingStockId = null; this.cdr.detectChanges(); },
      error: () => alert('Failed to update stock')
    });
  }

  cancelEditStock(): void { this.editingStockId = null; }

  // ============ CSV Export ============
  exportOrdersCsv(): void {
    const headers = ['Order ID', 'User', 'Total ($)', 'Status', 'Date'];
    const rows = this.orders.map(o => [
      o._id, o.userId?.name || o.userId || '', (o.totalAmount || 0).toFixed(2), o.status || '', (o.createdAt || '').split('T')[0]
    ]);
    this._downloadCsv('orders.csv', [headers, ...rows]);
  }

  exportProductsCsv(): void {
    const headers = ['Name', 'Category', 'Price', 'Original Price', 'Discount %', 'Stock', 'Status'];
    const rows = this.products.map(p => [
      p.name, p.category || '', String(p.price || 0), String(p.originalPrice || ''),
      String(p.discount || ''), String(p.stock ?? 0),
      (p.stock ?? 0) === 0 ? 'Out of Stock' : (p.stock ?? 0) <= 10 ? 'Low Stock' : 'In Stock'
    ]);
    this._downloadCsv('products.csv', [headers, ...rows]);
  }

  exportSalesCsv(): void {
    const headers = ['Period', 'Orders', 'Revenue ($)'];
    const rows = this.salesRows.map(r => [r.label, String(r.orders), r.revenue.toFixed(2)]);
    this._downloadCsv(`sales-${this.salesPeriod}.csv`, [headers, ...rows]);
  }

  private _downloadCsv(filename: string, rows: string[][]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
