import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  imports: [CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  isSignUpMode = false;

  toggleMode() {
    this.isSignUpMode = !this.isSignUpMode;
  }

  onSubmit(event: Event, type: string) {
    event.preventDefault();
    // Logic xử lý đăng nhập/đăng ký sẽ được thêm vào đây
    console.log(`${type} form submitted`);
    alert(`Bạn đã nhấn nút: ${type === 'signup' ? 'Đăng Ký' : 'Đăng Nhập'} (Chức năng đang được phát triển)`);
  }
}
