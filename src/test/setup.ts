import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

class ResizeObserverMock implements ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: ResizeObserverMock });
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  configurable: true,
  value: () => undefined,
});
const nativeGetComputedStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  value: (element: Element) => {
    try {
      return nativeGetComputedStyle(element);
    } catch {
      return {
        display: 'block',
        visibility: 'visible',
        getPropertyValue: () => '',
      } as unknown as CSSStyleDeclaration;
    }
  },
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete window.AMap;
  delete window.BMap;
  delete window.CoordinateToolkitBaiduCallback;
  delete window.T;
  document.getElementById('coordinate-toolkit-baidu-sdk')?.remove();
  document.getElementById('coordinate-toolkit-tianditu-sdk')?.remove();
});
