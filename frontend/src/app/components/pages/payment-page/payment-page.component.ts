import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CartService } from 'src/app/services/cart.service';
import { OrderService } from 'src/app/services/order.service';
import { UserService } from 'src/app/services/user.service';
import { Order } from 'src/app/shared/models/Order';

@Component({
  selector: 'app-payment-page',
  templateUrl: './payment-page.component.html',
  styleUrls: ['./payment-page.component.css'],
})
export class PaymentPageComponent implements OnInit {
  order: Order = new Order();
  constructor(
    private orderService: OrderService,
    private router: Router,
    private cartService: CartService,
    private toastrService: ToastrService
  ) {
    orderService.getNewOrderForCurrentUser().subscribe({
      next: (order) => {
        this.order = order;
        console.log('Order recieved from the backend ', order);
      },
      error: () => {
        router.navigateByUrl('/checKout');
      },
    });
  }

  imitPayment() {
    this.orderService
      .pay({
        paymentId: Math.floor(Math.random() * 1000000).toString(),
        orderId: this.order.id,
      })
      .subscribe({
        next: () => {
          this.cartService.clearCart();
          this.router.navigateByUrl('/track/' + this.order.id);
          this.toastrService.success('Payment Saved Successfully', 'Success');
          this.router.navigateByUrl('/track/' + this.order.id);
        },
      });
  }
  ngOnInit(): void {}
}
