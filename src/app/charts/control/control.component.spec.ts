import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subscription, throwError } from 'rxjs';
import { ChartData, ChartDataService } from '../../chart-data.service';
import { ControlComponent } from './control.component';
import { CandlestickComponent } from '../candlestick/candlestick.component';
import { MatInput } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Apollo } from 'apollo-angular';

describe('ControlComponent', () => {
  let component: ControlComponent;
  let fixture: ComponentFixture<ControlComponent>;
  let dataServiceMock: jasmine.SpyObj<ChartDataService>;
  let snackBarMock: jasmine.SpyObj<MatSnackBar>;
  let apolloMock: jasmine.SpyObj<Apollo>;

  beforeEach(async () => {
    dataServiceMock = jasmine.createSpyObj('DataService', ['fetchData']);
    snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);
    apolloMock = jasmine.createSpyObj('Apollo', ['query']);

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ReactiveFormsModule, ControlComponent, CandlestickComponent, MatInput],
      providers: [
        { provide: ChartDataService, useValue: dataServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: Apollo, useValue: apolloMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should call getIt with uppercase ticker on handleSelection', () => {
    spyOn(component, 'getIt').and.callThrough();
    const mockChartData: ChartData = { ticker: 'XYZ', data: { loading: false } };
    dataServiceMock.fetchChartData.and.returnValue(of(mockChartData));

    component.handleSelection('abc');
    expect(component.getIt).toHaveBeenCalledWith('abc');
    expect(dataServiceMock.fetchChartData).toHaveBeenCalledWith('ABC');
  });

  it('should call getIt with uppercase ticker on handleSubmit', () => {
    spyOn(component, 'getIt').and.callThrough();
    const mockChartData: ChartData = { ticker: 'XYZ', data: { loading: false } };
    dataServiceMock.fetchChartData.and.returnValue(of(mockChartData));

    component.handleSubmit('xyz');
    expect(component.getIt).toHaveBeenCalledWith('xyz');
    expect(dataServiceMock.fetchChartData).toHaveBeenCalledWith('XYZ');
  });

  it('should emit data on successful fetch', () => {
    const mockChartData: ChartData = { ticker: 'XYZ', data: { loading: false } };
    dataServiceMock.fetchChartData.and.returnValue(of(mockChartData));
    spyOn(component.dataEmitter, 'emit');

    component.getIt('xyz');
    expect(component.dataEmitter.emit).toHaveBeenCalledWith(mockChartData);
  });

  it('should handle errors from data fetch', () => {
    const errorResponse = { message: 'Error fetching data' };
    dataServiceMock.fetchChartData.and.returnValue(throwError(() => errorResponse));
    spyOn(component.dataEmitter, 'emit');

    component.getIt('error');
    expect(snackBarMock.open).toHaveBeenCalledWith('Error: Error fetching data', 'Close');
    expect(component.dataEmitter.emit).toHaveBeenCalledWith({
      ticker: 'ERROR',
      data: { error: 'Error fetching data' },
    });
  });

  it('should unsubscribe on destroy', () => {
    component['subscription'] = new Subscription();
    spyOn(component['subscription'], 'unsubscribe');

    component.ngOnDestroy();
    expect(component['subscription']['unsubscribe']).toHaveBeenCalled();
  });

  it('should focus the input after view init', () => {
    const focusSpy = jasmine.createSpy('focus');
    spyOn(document, 'querySelector').and.returnValue(
      Object.assign({ focus: focusSpy }, {}) as unknown as HTMLInputElement,
    );

    // component.ngOnInit();

    expect(document.querySelector).toHaveBeenCalledWith('#ticker');
    expect(focusSpy).toHaveBeenCalled();
  });
});
