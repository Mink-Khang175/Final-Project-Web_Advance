import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatAI } from './chat-ai';

describe('ChatAI', () => {
  let component: ChatAI;
  let fixture: ComponentFixture<ChatAI>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatAI]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatAI);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
