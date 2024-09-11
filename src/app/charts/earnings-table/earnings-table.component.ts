import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartData, EarningsData } from '../../chart-data.service';
import { MatCard, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'app-charts-earnings-table',
  templateUrl: './earnings-table.component.html',
  styleUrls: ['./earnings-table.component.scss'],
  standalone: true,
  providers: [DatePipe],
  imports: [
    MatTableModule,
    MatTooltipModule,
    MatExpansionModule,
    CommonModule,
    MatProgressSpinnerModule,
    MatCard,
    MatCardContent,
  ],
})
export class EarningsTableComponent implements OnChanges {
  @Input() dataSource: ChartData = {};

  displayedColumns: string[] = ['daysFromNow', 'reportDate', 'estimate'];
  earningsData: EarningsData[] = [];

  constructor(private datePipe: DatePipe) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataSource']) {
      console.log('Data Source changed:', this.dataSource);
      this.updateEarnings();
    }
  }

  updateEarnings() {
    const rawData = this.dataSource['earnings'];
    const currentDate = new Date();

    this.earningsData =
      rawData?.map((item) => {
        const reportDate = new Date(item.reportDate);
        const fiscalDateEnding = new Date(item.fiscalDateEnding);
        const daysFromNow = Math.floor((reportDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        const color = daysFromNow < 15 ? 'red' : daysFromNow < 30 ? 'orange' : daysFromNow < 45 ? 'yellow' : 'green';

        return {
          ...item,
          reportDate,
          fiscalDateEnding,
          daysFromNow,
          color,
        };
      }) || [];
  }
}
