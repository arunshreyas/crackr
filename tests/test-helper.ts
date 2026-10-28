import 'dotenv/config';
import Module from 'module';

// Polyfill server-only for standalone test runner execution
// @ts-expect-error Module._load internal Node signature
const originalLoad = Module._load;

// @ts-expect-error Module._load internal Node signature
Module._load = function (request: string, ...args: unknown[]) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad.apply(this, [request, ...args]);
};

export const polyfilled = true;
