import type { OpenGameApi } from '../shared/contracts';

declare global {
  interface Window {
    opengame: OpenGameApi;
  }
}

export {};
