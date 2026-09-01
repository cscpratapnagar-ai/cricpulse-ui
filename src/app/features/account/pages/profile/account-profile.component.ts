import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentUserService } from '../../../../current-user.service';

type Tab='profile'|'account'|'preferences'|'security';
@Component({selector:'app-account-profile',standalone:true,imports:[CommonModule,FormsModule],templateUrl: './account-profile.component.html',styleUrl: './account-profile.component.scss'} )
export class AccountProfileComponent{
 readonly users=inject(CurrentUserService);readonly user=this.users.user;readonly tab=signal<Tab>('profile');readonly saving=signal(false);readonly saved=signal(false);readonly showName=signal(true);readonly compact=signal(false);readonly reduceMotion=signal(false);
 readonly tabs:{key:Tab;label:string}[]=[{key:'profile',label:'Profile'},{key:'account',label:'Account'},{key:'preferences',label:'Preferences'},{key:'security',label:'Security'}];
 fullName=this.user()?.fullName||this.user()?.displayName||this.user()?.name||'';displayName=this.user()?.displayName||this.user()?.username||'';email=this.user()?.email||'';
 readonly initials=computed(()=>this.name.split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'CP');
 get userEmail(){return this.user()?.email||'Email not available'}get name(){return this.user()?.displayName||this.user()?.fullName||this.user()?.name||this.user()?.username||'Player'}get role(){return (this.user()?.role||'PLAYER').toUpperCase()}get memberId(){return this.user()?.userId||this.user()?.id||'—'}
 toggleShowName(){this.showName.set(!this.showName())}toggleCompact(){this.compact.set(!this.compact())}toggleReduceMotion(){this.reduceMotion.set(!this.reduceMotion())}saveProfile(){this.saving.set(true);setTimeout(()=>{const u=this.user()||{};this.users.set({...u,fullName:this.fullName||u.fullName,displayName:this.displayName||u.displayName,email:this.email||u.email});this.saving.set(false);this.saved.set(true)},350)}
}