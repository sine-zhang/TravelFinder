import { TestBed } from '@angular/core/testing';

import { FeatureLayerService } from './feature-layer.service';

describe('FeatureLayerService', () => {
  let service: FeatureLayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeatureLayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
