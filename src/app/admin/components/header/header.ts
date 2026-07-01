import { Component, inject} from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@app/auth/service/auth.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './header.html',
})
export class Header {
  private authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  async logOut() {
    await this.authService.logout();
  }

  async moveToConfig() {
    await this.router.navigate(['config/admin-password'], {relativeTo: this.route});
  }
}
