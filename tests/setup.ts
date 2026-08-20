import nock from 'nock';

export function setupNock() {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
  nock.enableNetConnect('localhost');
}

export function teardownNock() {
  nock.cleanAll();
  nock.enableNetConnect();
}

export function mockPublicEndpoint(method: 'get' | 'post', path: string, response: any, status = 200) {
  return nock('https://public.coindcx.com')[method](path).query(true).reply(status, response);
}

export function mockPrivateEndpoint(method: 'get' | 'post', path: string, response: any, status = 200) {
  return nock('https://api.coindcx.com')[method](path).query(true).reply(status, response);
}

export function mockWebSocket() {
  return {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    id: 'test-socket-id',
  };
}

beforeAll(() => {
  setupNock();
});

afterAll(() => {
  teardownNock();
});

beforeEach(() => {
  nock.cleanAll();
});

export { nock };