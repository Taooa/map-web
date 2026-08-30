import { DeleteOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tooltip,
  Upload,
} from 'antd';
import { useState } from 'react';
import type { ExcelSheetData } from '@/adapters/files/excel-parser';
import { importService } from '@/features/import/import-service';
import type {
  ExcelFieldMapping,
  ExcelImportCoordinateSystem,
} from '@/features/import/excel-importer';
import { pointService } from '../../index';

const systems: readonly ExcelImportCoordinateSystem[] = ['WGS84', 'GCJ02', 'BD09', 'SHANGHAI2000'];
const systemOptions = systems.map((value) => ({
  label: value === 'SHANGHAI2000' ? '上海2000' : value,
  value,
}));
type AddTab = 'manual' | 'upload' | 'json';

type ManualValues = {
  system: ExcelImportCoordinateSystem;
  rows: { name: string; first: number; second: number }[];
};

function MappingPanel({
  sheet,
  system,
  format,
  sourceName,
  onChanged,
}: {
  readonly sheet: ExcelSheetData;
  readonly system: ExcelImportCoordinateSystem;
  readonly format: 'excel' | 'csv' | 'json-file' | 'json-paste';
  readonly sourceName: string;
  readonly onChanged: (message: string) => void;
}) {
  const [mapping, setMapping] = useState<ExcelFieldMapping>({
    nameColumn: 0,
    longitudeColumn: 1,
    latitudeColumn: 2,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duplicate =
    new Set([mapping.nameColumn, mapping.longitudeColumn, mapping.latitudeColumn]).size < 3;
  const options = sheet.columns.map((column) => ({ label: column.label, value: column.index }));
  async function runImport() {
    setBusy(true);
    setError(null);
    const result = await importService.importTable({ sheet, mapping, system, format, sourceName });
    setBusy(false);
    if (result.failureCount) {
      setError(
        `成功 ${result.successCount} 条，失败 ${result.failureCount} 条。首条失败：第 ${result.failures[0]!.row} 行，${result.failures[0]!.reason}`,
      );
    }
    if (result.successCount)
      onChanged(
        `已导入 ${result.successCount} 个点位${result.failureCount ? `，${result.failureCount} 条失败` : ''}。`,
      );
  }
  return (
    <div className="points-antd-import-mapping">
      {error && (
        <Alert closable title={error} onClose={() => setError(null)} showIcon type="error" />
      )}
      <Space wrap>
        <Select
          aria-label="点位名称字段"
          onChange={(value) => setMapping({ ...mapping, nameColumn: value })}
          options={options}
          value={mapping.nameColumn}
        />
        <Select
          aria-label={system === 'SHANGHAI2000' ? 'X 字段' : '经度字段'}
          onChange={(value) => setMapping({ ...mapping, longitudeColumn: value })}
          options={options}
          value={mapping.longitudeColumn}
        />
        <Select
          aria-label={system === 'SHANGHAI2000' ? 'Y 字段' : '纬度字段'}
          onChange={(value) => setMapping({ ...mapping, latitudeColumn: value })}
          options={options}
          value={mapping.latitudeColumn}
        />
      </Space>
      {duplicate && <Alert title="名称与两个坐标字段不能重复。" showIcon type="warning" />}
      <Table
        columns={sheet.columns.map((column) => ({
          title: column.label,
          dataIndex: String(column.index),
          ellipsis: true,
        }))}
        dataSource={sheet.rows.slice(0, 5).map((row, index) => ({
          key: index,
          ...Object.fromEntries(
            row.map((value, column) => [
              String(column),
              typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                ? String(value)
                : '',
            ]),
          ),
        }))}
        pagination={false}
        scroll={{ x: true }}
        size="small"
      />
      <Button disabled={duplicate} loading={busy} onClick={() => void runImport()} type="primary">
        确认导入
      </Button>
    </div>
  );
}

function ManualPanel({ onChanged }: { readonly onChanged: (message: string) => void }) {
  const [form] = Form.useForm<ManualValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const system =
    (Form.useWatch('system', form) as ExcelImportCoordinateSystem | undefined) ?? 'WGS84';
  async function submit(values: ManualValues) {
    setBusy(true);
    setError(null);
    const results = await pointService.createPoints(
      values.rows.map((row) => ({
        ...row,
        system: values.system,
        source: { type: 'manual' as const },
      })),
    );
    setBusy(false);
    const failures = results.filter((result) => result.status === 'failure');
    if (failures.length) {
      setError(
        `成功 ${results.length - failures.length} 条，失败 ${failures.length} 条：${failures[0]!.error.message}`,
      );
    }
    if (failures.length !== results.length)
      onChanged(`已新增 ${results.length - failures.length} 个点位。`);
  }
  return (
    <Form<ManualValues>
      form={form}
      initialValues={{ system: 'WGS84', rows: [{ name: '', first: undefined, second: undefined }] }}
      layout="vertical"
      onFinish={(values) => void submit(values)}
    >
      {error && (
        <Alert closable title={error} onClose={() => setError(null)} showIcon type="error" />
      )}
      <Form.Item label="坐标系" name="system">
        <Select aria-label="新增坐标系" options={systemOptions} />
      </Form.Item>
      <Form.List name="rows">
        {(fields, { add, remove }) => (
          <div className="points-antd-manual-rows">
            {fields.map((field, index) => (
              <Space align="start" className="points-antd-manual-row" key={field.key} wrap>
                <Form.Item
                  name={[field.name, 'name']}
                  rules={[
                    { required: true, whitespace: true, message: '请输入名称' },
                    { max: 20, message: '点位名称最多20个字' },
                  ]}
                >
                  <Input
                    aria-label={`点位名称 ${index + 1}`}
                    maxLength={20}
                    placeholder="点位名称"
                  />
                </Form.Item>
                <Form.Item
                  name={[field.name, 'first']}
                  rules={[{ required: true, message: '请输入坐标' }]}
                >
                  <InputNumber
                    aria-label={`坐标一 ${index + 1}`}
                    placeholder={system === 'SHANGHAI2000' ? 'X' : '经度'}
                    precision={8}
                  />
                </Form.Item>
                <Form.Item
                  name={[field.name, 'second']}
                  rules={[{ required: true, message: '请输入坐标' }]}
                >
                  <InputNumber
                    aria-label={`坐标二 ${index + 1}`}
                    placeholder={system === 'SHANGHAI2000' ? 'Y' : '纬度'}
                    precision={8}
                  />
                </Form.Item>
                <Button
                  aria-label={`删除第 ${index + 1} 行`}
                  danger
                  disabled={fields.length === 1}
                  icon={<DeleteOutlined />}
                  onClick={() => remove(field.name)}
                  shape="circle"
                />
                {index === fields.length - 1 && (
                  <Tooltip title="继续添加一行">
                    <Button
                      aria-label="继续添加一行"
                      icon={<PlusOutlined />}
                      onClick={() => add()}
                      shape="circle"
                      type="dashed"
                    />
                  </Tooltip>
                )}
              </Space>
            ))}
          </div>
        )}
      </Form.List>
      <Button htmlType="submit" loading={busy} type="primary">
        确认新增
      </Button>
    </Form>
  );
}

function ImportPanel({
  mode,
  onChanged,
}: {
  readonly mode: 'upload' | 'json';
  readonly onChanged: (message: string) => void;
}) {
  const [system, setSystem] = useState<ExcelImportCoordinateSystem>('WGS84');
  const [sheets, setSheets] = useState<readonly ExcelSheetData[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [sourceName, setSourceName] = useState(mode === 'json' ? '粘贴的JSON' : '');
  const [format, setFormat] = useState<'excel' | 'csv' | 'json-file' | 'json-paste'>(
    mode === 'json' ? 'json-paste' : 'excel',
  );
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sheet = sheets[sheetIndex];
  async function parseFile(file: File) {
    setSheets([]);
    setSheetIndex(0);
    setError(null);
    setSourceName(file.name);
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.xlsx')) {
      const { parseExcelWorkbookAsync } = await import('@/adapters/files/excel-parser-client');
      const parsed = await parseExcelWorkbookAsync(await file.arrayBuffer());
      setFormat('excel');
      if (parsed.status === 'failure') setError(parsed.error.message);
      else setSheets(parsed.value.sheets);
    } else if (lower.endsWith('.csv')) {
      const { parseCsv } = await import('@/adapters/files/csv-parser');
      const parsed = parseCsv(await file.text(), file.name);
      setFormat('csv');
      if (parsed.status === 'failure') setError(parsed.error.message);
      else setSheets([parsed.value]);
    } else if (lower.endsWith('.json')) {
      const { parseJsonPoints } = await import('@/adapters/files/json-parser');
      const parsed = parseJsonPoints(await file.text(), file.name);
      setFormat('json-file');
      if (parsed.status === 'failure') setError(parsed.error.message);
      else setSheets([parsed.value]);
    } else setError('仅支持 .xlsx、.csv 或 .json 文件。');
    return false;
  }
  async function parseJson() {
    const { parseJsonPoints } = await import('@/adapters/files/json-parser');
    const parsed = parseJsonPoints(json, '粘贴的JSON');
    if (parsed.status === 'failure') setError(parsed.error.message);
    else {
      setError(null);
      setSheets([parsed.value]);
      setSheetIndex(0);
    }
  }
  function formatJson() {
    try {
      setJson(JSON.stringify(JSON.parse(json), null, 2));
      setError(null);
    } catch {
      setError('JSON 格式不正确。');
    }
    setSheets([]);
  }
  return (
    <div className="points-antd-import-panel">
      {error && (
        <Alert closable title={error} onClose={() => setError(null)} showIcon type="error" />
      )}
      <Form layout="vertical">
        <Form.Item label="坐标系">
          <Select
            aria-label="导入坐标系"
            onChange={setSystem}
            options={systemOptions}
            value={system}
          />
        </Form.Item>
      </Form>
      {mode === 'upload' ? (
        <Upload.Dragger
          accept=".xlsx,.csv,.json"
          beforeUpload={parseFile}
          maxCount={1}
          onRemove={() => {
            setSheets([]);
            return true;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域</p>
          <p className="ant-upload-hint">支持 Excel、CSV 和 JSON；文件只在当前浏览器内解析。</p>
        </Upload.Dragger>
      ) : (
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Input.TextArea
            aria-label="JSON 数据"
            onChange={(event) => {
              setJson(event.target.value);
              setSheets([]);
            }}
            placeholder='[{"name":"点位A","lng":121.4,"lat":31.2}]'
            rows={9}
            value={json}
          />
          <Space>
            <Button onClick={formatJson}>格式化</Button>
            <Button onClick={() => void parseJson()} type="primary">
              解析并预览
            </Button>
          </Space>
        </Space>
      )}
      {sheets.length > 1 && (
        <Select
          aria-label="工作表"
          onChange={setSheetIndex}
          options={sheets.map((item, index) => ({ label: item.name, value: index }))}
          value={sheetIndex}
        />
      )}
      {sheet && (
        <MappingPanel
          format={format}
          key={`${sheet.name}-${system}`}
          onChanged={onChanged}
          sheet={sheet}
          sourceName={sourceName}
          system={system}
        />
      )}
    </div>
  );
}

export function AddPointModal({
  open,
  onClose,
  onChanged,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onChanged: (message: string) => void;
}) {
  const [tab, setTab] = useState<AddTab>('manual');
  const finish = (message: string) => {
    onChanged(message);
    onClose();
  };
  return (
    <Modal
      afterClose={() => setTab('manual')}
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title="新增点位"
      width={900}
    >
      <Tabs
        activeKey={tab}
        destroyOnHidden
        items={[
          { key: 'manual', label: 'Form', children: <ManualPanel onChanged={finish} /> },
          {
            key: 'upload',
            label: 'Upload',
            children: <ImportPanel mode="upload" onChanged={finish} />,
          },
          { key: 'json', label: 'JSON', children: <ImportPanel mode="json" onChanged={finish} /> },
        ]}
        onChange={(key) => setTab(key as AddTab)}
      />
    </Modal>
  );
}
