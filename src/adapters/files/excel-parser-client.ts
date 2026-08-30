import { parseExcelWorkbook, type ExcelParserResult } from './excel-parser';

export function parseExcelWorkbookAsync(data: ArrayBuffer): Promise<ExcelParserResult> {
  if (typeof Worker === 'undefined') return Promise.resolve(parseExcelWorkbook(data));

  return new Promise((resolve) => {
    const worker = new Worker(new URL('./excel-parser.worker.ts', import.meta.url), {
      type: 'module',
    });
    const finish = (result: ExcelParserResult) => {
      worker.terminate();
      resolve(result);
    };
    worker.addEventListener(
      'message',
      (event: MessageEvent<ExcelParserResult>) => {
        const result = event.data;
        finish(result.status === 'success' ? result : parseExcelWorkbook(data));
      },
      { once: true },
    );
    worker.addEventListener(
      'error',
      () => finish(parseExcelWorkbook(data)),
      { once: true },
    );
    worker.postMessage(data);
  });
}
