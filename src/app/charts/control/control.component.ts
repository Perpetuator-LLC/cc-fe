import { AfterViewInit, Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { ChartData, ChartDataService } from '../../chart-data.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CandlestickComponent } from '../candlestick/candlestick.component';
import { Subscription } from 'rxjs';
import { MatInput } from '@angular/material/input';
import { AutocompleteComponent } from '../../autocomplete/autocomplete.component';
import { MessageService } from '../../message.service';
import { MessageComponent } from '../../message/message.component';
import { MatAutocomplete } from '@angular/material/autocomplete';

@Component({
  selector: 'app-charts-control',
  standalone: true,
  imports: [
    CandlestickComponent,
    MatInput,
    MatAutocomplete,
    AutocompleteComponent,
    ReactiveFormsModule,
    MessageComponent,
  ],
  templateUrl: './control.component.html',
  styleUrl: './control.component.scss',
})
export class ControlComponent implements OnDestroy, AfterViewInit {
  @ViewChild(AutocompleteComponent) autocomplete!: AutocompleteComponent;
  @Output() dataEmitter = new EventEmitter<ChartData>();
  error: string | null = null;
  private subscription: Subscription | undefined;

  constructor(
    private chartDataService: ChartDataService,
    private messageService: MessageService,
  ) {}

  ngAfterViewInit() {
    this.autocomplete.focusInput();
  }

  handleSelection(value: string) {
    this.getIt(value);
  }

  handleSubmit(value: string) {
    this.getIt(value);
  }

  getIt(symbol: string) {
    this.error = null;
    const ticker = symbol.toUpperCase();
    // if (this.stockForm) {
    //   this.stockForm.controls['ticker'].setValue('');
    // }
    // TODO: It appears that GraphQL has a very similar structure of 'data' with 'loading' and 'error' properties.
    //     This could be a good candidate for a shared interface. Let's see if we can refactor this to use that.
    this.dataEmitter.emit({ ticker: ticker, data: { loading: true } });
    this.subscription = this.chartDataService.fetchChartData(ticker).subscribe({
      next: (data: ChartData) => {
        this.dataEmitter.emit(data);
      },
      error: (err: { message: string }) => {
        this.messageService.addMessage({
          type: 'error',
          text: `Error: ${err.message}`,
          dismissible: true,
        });
        this.dataEmitter.emit({ ticker: ticker, data: { error: err.message } });
      },
      complete: () => {
        this.autocomplete.focusInput();
      },
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
