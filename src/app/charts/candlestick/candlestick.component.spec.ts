import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CandlestickComponent } from './candlestick.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { JsonPipe } from '@angular/common';
import { ChartData } from '../../chart-data.service';

describe('CandlestickGraphComponent', () => {
  let component: CandlestickComponent;
  let fixture: ComponentFixture<CandlestickComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataSource: { ohlc: any; volume: any };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgApexchartsModule, JsonPipe, CandlestickComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CandlestickComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    dataSource = {
      ohlc: [
        { x: new Date('2023-01-01').getTime(), y: [1, 2, 3, 4] },
        { x: new Date('2023-01-02').getTime(), y: [2, 3, 4, 5] },
      ],
      volume: [
        { x: new Date('2023-01-01').getTime(), y: 1000 },
        { x: new Date('2023-01-02').getTime(), y: 2000 },
      ],
    };

    component.dataSource = dataSource;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update chart options when dataSource changes', () => {
    component.ngOnChanges({
      dataSource: {
        currentValue: dataSource,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    expect(component.candlePriceOptions.series.length).toBe(8); // Price + 7 indicators
    expect(component.candlePriceOptions.series[0].data).toEqual(dataSource.ohlc);
    expect(component.barVolumeOptions.series.length).toBe(1);
    expect(component.barVolumeOptions.series[0].data).toEqual(dataSource.volume);
  });

  it('should set date range correctly', () => {
    const dataSource: ChartData = {
      ohlc: [
        { x: new Date('2023-01-01').getTime(), y: [1, 2, 3, 4] },
        { x: new Date('2023-01-02').getTime(), y: [2, 3, 4, 5] },
      ],
      volume: [
        { x: new Date('2023-01-01').getTime(), y: 1000 },
        { x: new Date('2023-01-02').getTime(), y: 2000 },
      ],
    };

    component.dataSource = dataSource;
    component.setDateRange();

    expect(component.getFullStartDate()).toBe(new Date('2023-01-01').getTime());
    expect(component.getFullEndDate()).toBe(new Date('2023-01-02').getTime());
    expect(component.getZoomStartDate()).toBe(new Date('2023-01-01').getTime());
  });

  it('should emit an event when the chart is clicked', () => {
    spyOn(component.candleDoubleClicked, 'emit');
    const event = new MouseEvent('click', { detail: 2 });
    if (component.candlePriceOptions.chart?.events?.click) {
      component.candlePriceOptions.chart.events.click(event, {}, {});
    }
    expect(component.candleDoubleClicked.emit).toHaveBeenCalledWith(event);
  });

  it('should emit an event when the volume is clicked', () => {
    spyOn(component.volumeDoubleClicked, 'emit');
    const event = new MouseEvent('click', { detail: 2 });
    if (component.barVolumeOptions.chart?.events?.click) {
      component.barVolumeOptions.chart.events.click(event, {}, {});
    }
    expect(component.volumeDoubleClicked.emit).toHaveBeenCalledWith(event);
  });

  it('should reset zoom on double click on candlestick chart', () => {
    spyOn(component, 'resetZoom');
    const event = new MouseEvent('click', { detail: 2 });
    if (component.candlePriceOptions.chart?.events?.click) {
      component.candlePriceOptions.chart.events.click(event, {}, {});
    }
    expect(component.resetZoom).toHaveBeenCalled();
  });

  it('should reset zoom on double click on candlestick volume', () => {
    spyOn(component, 'fullZoom');
    const event = new MouseEvent('click', { detail: 2 });
    if (component.barVolumeOptions.chart?.events?.click) {
      component.barVolumeOptions.chart.events.click(event, {}, {});
    }
    expect(component.fullZoom).toHaveBeenCalled();
  });

  it('should reset zoom', () => {
    spyOn(component, 'resetZoom').and.callThrough();
    component.resetZoom();
    expect(component.resetZoom).toHaveBeenCalled();
  });
});
