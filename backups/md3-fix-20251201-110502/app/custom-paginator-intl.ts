// Copyright (c) 2025 Perpetuator LLC

import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Injectable()
export class CustomMatPaginatorIntl extends MatPaginatorIntl {
  override getRangeLabel = (page: number) => {
    return `Page ${page + 1}`;
  };
}
