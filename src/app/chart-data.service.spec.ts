import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ChartData, ChartDataService } from './chart-data.service';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { gql } from 'apollo-angular';
import { ApolloQueryResult } from '@apollo/client/core';

describe('ChartDataService', () => {
  let service: ChartDataService;
  let apolloSpy: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    // Create a spy object for Apollo with a mock for the query method
    apolloSpy = jasmine.createSpyObj('Apollo', ['query']);

    // Mock the response for Apollo.query
    apolloSpy.query.and.returnValue(
      of({
        data: {
          getChartData: {
            success: true,
            message: 'Data fetched successfully',
            ohlc: [{ x: 1, y: [100, 105, 95, 102] }],
            volume: [{ x: 1, y: 50000 }],
            squeeze: [{ x: 1, y: [98, 101] }],
            kc: [{ x: 1, y: [97, 104] }],
            earnings: [
              {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                reportDate: '2024-08-15',
                fiscalDateEnding: '2024-09-30',
                estimate: 5.0,
                currency: 'USD',
              },
            ],
            ticker: 'AAPL',
          },
        },
      } as ApolloQueryResult<{ getChartData: ChartData }>),
    );
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChartDataService, { provide: Apollo, useValue: apolloSpy }],
    });

    service = TestBed.inject(ChartDataService);
  });

  it('should fetch data for a given ticker', () => {
    const mockTicker = 'AAPL';
    const expectedResponse = {
      success: true,
      message: 'Data fetched successfully',
      ohlc: [{ x: 1, y: [100, 105, 95, 102] }],
      volume: [{ x: 1, y: 50000 }],
      squeeze: [{ x: 1, y: [98, 101] }],
      kc: [{ x: 1, y: [97, 104] }],
      earnings: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          reportDate: '2024-08-15',
          fiscalDateEnding: '2024-09-30',
          estimate: 5.0,
          currency: 'USD',
        },
      ],
      ticker: 'AAPL',
    };

    service.fetchChartData(mockTicker).subscribe((response) => {
      expect(response).toEqual(expectedResponse);
    });

    expect(apolloSpy.query).toHaveBeenCalledWith({
      query: gql`
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
      `,
      variables: { ticker: mockTicker },
      fetchPolicy: 'network-only',
    });
  });
});
