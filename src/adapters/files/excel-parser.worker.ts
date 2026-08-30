/// <reference lib="webworker" />
import { parseExcelWorkbook } from './excel-parser';

self.addEventListener('message', (event: MessageEvent<ArrayBuffer>) => {
  self.postMessage(parseExcelWorkbook(event.data));
});
