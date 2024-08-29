import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Apollo, gql } from 'apollo-angular';

export interface ChartData {
  success?: boolean;
  data?: { loading?: boolean; error?: string };
  message?: string;
  ohlc?: OHLC[];
  volume?: Volume[];
  kc?: KeltnerChannel[];
  squeeze?: Squeeze[];
  earnings?: EarningsData[];
  ticker?: string;
}

export interface OHLC {
  x: number | string;
  y: number[];
}

export interface Volume {
  x: number | string;
  y: number;
}

export interface KeltnerChannel {
  x: number | string;
  y: number[];
}

export interface Squeeze {
  x: number | string;
  y: number[];
}

export interface EarningsData {
  symbol: string;
  name: string;
  reportDate: Date | string;
  fiscalDateEnding: Date | string;
  estimate: number | null;
  currency: string;
  // daysFromNow: number;
  // color: string;
}

export interface ChartDataResponse {
  errors?: [{ message: string }];
  data?: { getChartData: ChartData };
}

@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  constructor(private apollo: Apollo) {}

  fetchChartData(ticker: string | null | undefined): Observable<ChartData> {
    if (ticker === null || ticker === undefined) {
      return throwError(() => new Error('Ticker is required'));
    }
    const GET_CHART_DATA = gql`
      query GetChartData($ticker: String!) {
        getChartData(ticker: $ticker) {
          success
          message
          ohlc {
            x
            y
          }
          volume {
            x
            y
          }
          squeeze {
            x
            y
          }
          kc {
            x
            y
          }
          earnings {
            symbol
            name
            reportDate
            fiscalDateEnding
            estimate
            currency
          }
          ticker
        }
      }
    `;

    return this.apollo
      .query<ChartDataResponse>({
        query: GET_CHART_DATA,
        variables: { ticker },
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          }
          return result.data?.getChartData || {};
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error('Failed to fetch chart data: ' + error.message));
        }),
      );
    // TODO: Consider adding watchQuery to update data in real-time... e.g.
    // return this.apollo.watchQuery({ query: GET_CHART_DATA, variables: { ticker } }).valueChanges;
    // return this.apollo.watchQuery<ChartDataResponse>({
    //   query: GET_CHART_DATA,
    //   variables: { ticker },
    //   fetchPolicy: 'network-only'
    // }).valueChanges.pipe(
    //   map(result => {
    //     if (result.errors) {
    //       throw new Error(result.errors.map(e => e.message).join(', '));
    //     }
    //     const chartData = result.data.getChartData;
    //     // Assuming date conversion if necessary
    //     return chartData;
    //   }),
    //   catchError(error => {
    //     console.error('GraphQL query error:', error);
    //     return throwError(() => new Error('Failed to fetch chart data: ' + error.message));
    //   })
    // );
  }
}
