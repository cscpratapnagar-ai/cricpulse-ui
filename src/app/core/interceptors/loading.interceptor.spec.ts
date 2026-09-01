import { loadingInterceptor } from './loading.interceptor';

describe('loadingInterceptor', () => {
  it('exports an interceptor function', () => expect(typeof loadingInterceptor).toBe('function'));
});
