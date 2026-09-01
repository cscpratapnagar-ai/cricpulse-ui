import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
export type UiState='loading'|'empty'|'error'|'offline';
@Component({selector:'app-state-view',standalone:true,imports:[CommonModule],templateUrl: './state-view.component.html',styleUrl: './state-view.component.scss']
}) export class StateViewComponent{
 @Input() state:UiState='empty';@Input() title='';@Input() message='';@Input() actionLabel='';@Input() loadingLabel='Loading data...';@Input() compact=false;
 @Output() retry=new EventEmitter<void>();
 @Output() action=new EventEmitter<void>();
}