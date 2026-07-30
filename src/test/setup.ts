import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

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
