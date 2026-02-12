import { Component, OnDestroy, OnInit, Renderer2, Inject, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-intro',
  standalone: true, // Quan trọng: Đánh dấu là Standalone Component
  templateUrl: './intro.html',
  styleUrls: ['./intro.css'],
  host: { 'class': 'intro-component' }
})
export class IntroComponent implements OnInit, OnDestroy {
  
  private portalTriggered = false;
  // Khai báo kiểu cụ thể hoặc any cho ambient để tránh lỗi TS
  private ambient: any = {
    ctx: null,
    osc: null,
    gain: null,
    failed: false
  };
  private unlistenFuncs: Function[] = []; 

  constructor(
    private router: Router,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Logic giữ nguyên
    this.unlistenFuncs.push(
      this.renderer.listen('window', 'keydown', (e) => this.onKeydown(e)),
      this.renderer.listen('window', 'wheel', () => this.onInteraction()),
      this.renderer.listen('window', 'touchstart', () => this.ensureAmbientAudio()),
      this.renderer.listen('window', 'pointermove', () => this.ensureAmbientAudio())
    );
  }

  ngOnDestroy(): void {
    this.unlistenFuncs.forEach(func => func());
    if (this.ambient.ctx && this.ambient.ctx.state !== 'closed') {
      this.ambient.ctx.close();
    }
  }

  // Hàm gọi từ HTML (ví dụ nút Click me)
  onHintClick() {
    this.ensureAmbientAudio();
    this.triggerPortal();
  }

  private onKeydown(event: KeyboardEvent) {
    this.ensureAmbientAudio();
    const ignoredKeys = ["F5", "F12", "Escape"];
    // Sửa lỗi cú pháp logic OR
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (ignoredKeys.includes(event.key)) return;
    
    this.triggerPortal();
  }

  private onInteraction() {
    this.ensureAmbientAudio();
    this.triggerPortal();
  }

  private ensureAmbientAudio(options: { boost?: boolean } = {}) {
    if (this.ambient.failed) return;

    if (!this.ambient.ctx) {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          this.ambient.failed = true;
          return;
        }
        this.ambient.ctx = new AudioCtx();
        this.ambient.osc = this.ambient.ctx.createOscillator();
        this.ambient.osc.type = "sine";
        this.ambient.osc.frequency.value = 65; 
        
        const filter = this.ambient.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 260;
        
        this.ambient.gain = this.ambient.ctx.createGain();
        this.ambient.gain.gain.value = 0;
        
        this.ambient.osc.connect(filter).connect(this.ambient.gain).connect(this.ambient.ctx.destination);
        this.ambient.osc.start();
      } catch (error) {
        console.warn("Ambient audio unavailable:", error);
        this.ambient.failed = true;
        return;
      }
    }

    if (this.ambient.ctx.state === "suspended") {
      this.ambient.ctx.resume();
    }

    const now = this.ambient.ctx.currentTime;
    const target = options.boost ? 0.08 : 0.035;
    const duration = options.boost ? 0.6 : 2.5;

    this.ambient.gain.gain.cancelScheduledValues(now);
    this.ambient.gain.gain.setValueAtTime(this.ambient.gain.gain.value, now);
    this.ambient.gain.gain.linearRampToValueAtTime(target, now + duration);
  }

  private triggerPortal() {
    if (this.portalTriggered) return;
    this.portalTriggered = true;

    // Thêm class vào cả host element và body để đảm bảo animation hoạt động
    this.renderer.addClass(this.elementRef.nativeElement, 'portal-active');
    this.renderer.addClass(this.document.body, 'portal-active');
    
    // Thêm class active cho portal overlay
    const portalOverlay = this.document.querySelector('.portal-overlay');
    if (portalOverlay) {
      this.renderer.addClass(portalOverlay, 'active');
    }
    
    this.ensureAmbientAudio({ boost: true });

    const portalDuration = 1200; // 1.2s để autoRun tăng tốc dần rồi items chui vào portal
    
    setTimeout(() => {
      this.renderer.removeClass(this.elementRef.nativeElement, 'portal-active');
      this.renderer.removeClass(this.document.body, 'portal-active');
      if (portalOverlay) {
        this.renderer.removeClass(portalOverlay, 'active');
      }
      
      // CHUYỂN TRANG: Dòng này sẽ hoạt động sau khi bạn làm Bước 2
      this.router.navigate(['/home']).then(() => {
        console.log('Navigation to Home successful!');
      }).catch(err => {
        console.error('Navigation error:', err);
      });

    }, portalDuration);
  }
}