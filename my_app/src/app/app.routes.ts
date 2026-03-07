import { Routes } from '@angular/router';
import { IntroComponent } from './intro/intro'; // Sửa lại đường dẫn import cho đúng
import { HomePage } from './home-page/home-page';   // Import Home vừa tạo
import { News } from './news/news';   // Import News component
import { Auth } from './auth/auth';   // Import Auth component
import { Profile } from './profile/profile';   // Import Profile component
import { ProductDetail } from './product-detail/product-detail';   // Import ProductDetail component
import { CartPage } from './cart-page/cart-page';   // Import CartPage component

export const routes: Routes = [
  { path: '', redirectTo: 'intro', pathMatch: 'full' }, // Mặc định vào Intro
  { path: 'intro', component: IntroComponent },
  { path: 'home', component: HomePage },           // Định nghĩa trang Home
  { path: 'news', component: News },               // Định nghĩa trang News
  { path: 'auth', component: Auth },               // Định nghĩa trang Auth
  { path: 'profile', component: Profile },         // Định nghĩa trang Profile
  { path: 'product-detail', component: ProductDetail }, // Định nghĩa trang Product Detail
  { path: 'cart', component: CartPage },         // Định nghĩa trang Cart
];