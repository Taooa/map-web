import { Alert, Descriptions, Form, Modal, Radio, Select, Statistic, Table } from 'antd';
import { useState } from 'react';
import type { Point } from '@/domain';
import type { PointOperationScope } from '../../point-list-model';
import { downloadPointExport } from '../../point-export';
import {
  pointService,
  type EditableCoordinateSystem,
  type TransformPointsResult,
} from '../../index';

const transformSystems: readonly EditableCoordinateSystem[] = [
  'WGS84',
  'GCJ02',
  'BD09',
  'SHANGHAI2000',
];

export function TransformPointsModal({
  open,
  scope,
  onClose,
  onChanged,
}: {
  readonly open: boolean;
  readonly scope: PointOperationScope;
  readonly onClose: () => void;
  readonly onChanged: (message: string) => void;
}) {
  const [source, setSource] = useState<EditableCoordinateSystem>('WGS84');
  const [target, setTarget] = useState<EditableCoordinateSystem>('GCJ02');
  const [result, setResult] = useState<TransformPointsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const unsupported = source === target || source === 'SHANGHAI2000' || target === 'SHANGHAI2000';
  async function submit() {
    setBusy(true);
    const next = await pointService.transformPointsFrom(scope.pointIds, source, target);
    setBusy(false);
    setResult(next);
    if (next.successCount)
      onChanged(`坐标转换完成：成功 ${next.successCount} 条，失败 ${next.failureCount} 条。`);
  }
  return (
    <Modal
      afterClose={() => setResult(null)}
      cancelText="关闭"
      cancelButtonProps={{ 'aria-label': '关闭' }}
      destroyOnHidden
      okButtonProps={{ disabled: unsupported || scope.total === 0 }}
      okText="确认转换"
      onCancel={onClose}
      onOk={() => void submit()}
      open={open}
      confirmLoading={busy}
      title="坐标转换"
      width={720}
    >
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="操作范围">{scope.label}</Descriptions.Item>
        <Descriptions.Item label="点位数量">{scope.total}</Descriptions.Item>
      </Descriptions>
      <Form className="points-antd-operation-form" layout="vertical">
        <Form.Item label="源坐标系">
          <Select
            aria-label="源坐标系"
            onChange={setSource}
            options={transformSystems.map((value) => ({
              label: value === 'SHANGHAI2000' ? '上海2000' : value,
              value,
            }))}
            value={source}
          />
        </Form.Item>
        <Form.Item label="目标坐标系">
          <Select
            aria-label="目标坐标系"
            onChange={setTarget}
            options={transformSystems.map((value) => ({
              label: value === 'SHANGHAI2000' ? '上海2000' : value,
              value,
            }))}
            value={target}
          />
        </Form.Item>
      </Form>
      {(source === 'SHANGHAI2000' || target === 'SHANGHAI2000') && (
        <Alert title="上海2000只能保存和展示，不能生成正式转换结果。" showIcon type="warning" />
      )}
      {source === target && <Alert title="源坐标系和目标坐标系不能相同。" showIcon type="error" />}
      {result && (
        <div className="points-antd-operation-result">
          <div className="points-antd-statistics">
            <Statistic title="成功" value={result.successCount} />
            <Statistic title="失败" value={result.failureCount} />
          </div>
          {result.failures.length > 0 && (
            <Table
              columns={[
                { title: '点位', dataIndex: 'pointName' },
                { title: '源坐标', dataIndex: 'sourceCoordinate' },
                { title: '失败原因', dataIndex: 'message' },
              ]}
              dataSource={[...result.failures]}
              pagination={{ pageSize: 5 }}
              rowKey="pointId"
              size="small"
            />
          )}
        </div>
      )}
    </Modal>
  );
}

export function ExportPointsModal({
  open,
  scope,
  points,
  onClose,
}: {
  readonly open: boolean;
  readonly scope: PointOperationScope;
  readonly points: readonly Point[];
  readonly onClose: () => void;
}) {
  const [format, setFormat] = useState<'excel' | 'json'>('excel');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    await downloadPointExport(points, format);
    setBusy(false);
    onClose();
  }
  return (
    <Modal
      cancelText="取消"
      cancelButtonProps={{ 'aria-label': '取消' }}
      confirmLoading={busy}
      destroyOnHidden
      okButtonProps={{ disabled: points.length === 0 }}
      okText="确认导出"
      onCancel={onClose}
      onOk={() => void submit()}
      open={open}
      title="导出点位"
    >
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="导出范围">{scope.label}</Descriptions.Item>
        <Descriptions.Item label="点位数量">{points.length}</Descriptions.Item>
      </Descriptions>
      <Form className="points-antd-operation-form" layout="vertical">
        <Form.Item label="导出格式">
          <Radio.Group
            onChange={(event) => setFormat(event.target.value as 'excel' | 'json')}
            value={format}
          >
            <Radio value="excel">Excel（.xlsx）</Radio>
            <Radio value="json">JSON</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
      <Alert
        title="导出字段为点位名称和四类坐标，不包含内部 ID、时间与转换元数据。"
        showIcon
        type="info"
      />
    </Modal>
  );
}

export function DeletePointsModal({
  open,
  scope,
  onClose,
  onDeleted,
}: {
  readonly open: boolean;
  readonly scope: PointOperationScope;
  readonly onClose: () => void;
  readonly onDeleted: (successIds: readonly string[], message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<
    readonly { pointId: string; pointName: string; message: string }[]
  >([]);
  async function submit() {
    setBusy(true);
    const result = await pointService.deletePoints(scope.pointIds);
    setBusy(false);
    setFailures(result.failures);
    onDeleted(
      result.successIds,
      `删除完成：成功 ${result.successIds.length} 条，失败 ${result.failures.length} 条。`,
    );
    if (result.failures.length === 0) onClose();
  }
  return (
    <Modal
      afterClose={() => setFailures([])}
      cancelText="取消"
      cancelButtonProps={{ 'aria-label': '取消' }}
      confirmLoading={busy}
      destroyOnHidden
      okButtonProps={{ danger: true, disabled: scope.total === 0 }}
      okText="确认批量删除"
      onCancel={onClose}
      onOk={() => void submit()}
      open={open}
      title={`确认删除 ${scope.total} 个点位？`}
    >
      <Alert
        description={`本次范围为“${scope.label}”。删除后无法恢复，请确认操作范围。`}
        title="危险操作"
        showIcon
        type="warning"
      />
      {failures.length > 0 && (
        <Table
          columns={[
            { title: '点位', dataIndex: 'pointName' },
            { title: '失败原因', dataIndex: 'message' },
          ]}
          dataSource={[...failures]}
          pagination={false}
          rowKey="pointId"
          size="small"
        />
      )}
    </Modal>
  );
}
