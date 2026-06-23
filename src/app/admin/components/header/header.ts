import { Component, inject} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@app/auth/service/auth.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './header.html',
})
export class Header {
  private authService = inject(AuthService);

  async logOut() {
    await this.authService.logout();
  }
}
