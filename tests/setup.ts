import { Polly } from '@pollyjs/core';
import NodeHttpAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';
import nock from 'nock';

Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

export const polly = new Polly('coindcx-sdk-tests', {
  adapters: ['node-http'],
  persister: 'fs',
  persisterOptions: {
    fs: {
      recordingsDir: __dirname + '/fixtures/cassettes',
    },
  },
  recordIfMissing: true,
  recordFailedRequests: true,
  matchRequestsBy: {
    headers: {
      exclude: ['authorization', 'x-auth-apikey', 'x-auth-signature', 'x-auth-timestamp'],
    },
  },
});

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
  return nock('https://public.coindcx.com')[method](path).reply(status, response);
}

export function mockPrivateEndpoint(method: 'get' | 'post', path: string, response: any, status = 200) {
  return nock('https://api.coindcx.com')[method](path).reply(status, response);
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
  return polly.stop();
});

beforeEach(() => {
  nock.cleanAll();
});

afterEach(() => {
  return polly.flush();
});

export { nock };

// Helper for recording with PollyJS v6
export async function recordCassette(name: string, fn: () => Promise<void>) {
  const testPolly = new Polly(name, {
    adapters: ['node-http'],
    persister: 'fs',
    persisterOptions: {
      fs: {
        recordingsDir: __dirname + '/fixtures/cassettes',
      },
    },
    recordIfMissing: true,
    recordFailedRequests: true,
    matchRequestsBy: {
      headers: {
        exclude: ['authorization', 'x-auth-apikey', 'x-auth-signature', 'x-auth-timestamp'],
      },
    },
  });
  testPolly.record();
  try {
    await fn();
  } finally {
    await testPolly.stop();
  }
}