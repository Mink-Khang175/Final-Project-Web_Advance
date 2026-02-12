import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// Xóa Footer, Header, IntroComponent ở đây
// Vì App chỉ đóng vai trò là cái khung chứa Router

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Chỉ cần RouterOutlet là đủ
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my_app');
}