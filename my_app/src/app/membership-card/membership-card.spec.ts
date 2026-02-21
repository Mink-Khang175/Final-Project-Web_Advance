import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembershipCard } from './membership-card';

describe('MembershipCard', () => {
  let component: MembershipCard;
  let fixture: ComponentFixture<MembershipCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembershipCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembershipCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
