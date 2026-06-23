import { Component } from '@angular/core';
import { Header } from '@app/admin/components/header/header';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [Header, RouterOutlet],
  templateUrl: './admin-layout.html',
})
export class AdminLayout {}
