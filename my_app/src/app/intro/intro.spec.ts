import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntroComponent } from './intro'; // Đảm bảo tên file import đúng
import { provideRouter } from '@angular/router'; // Cần cái này để mock Router

describe('IntroComponent', () => {
  let component: IntroComponent;
  let fixture: ComponentFixture<IntroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntroComponent], // Import component (vì nó là standalone)
      providers: [
        provideRouter([]) // Cung cấp Router giả lập để không bị lỗi "No provider for Router"
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Thay cho whenStable() để kích hoạt ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});