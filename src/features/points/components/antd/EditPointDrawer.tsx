import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
} from 'antd';
import { useState } from 'react';
import type { Point } from '@/domain';
import { coordinateFor } from '../../point-coordinate-display';
import { formatPointDate } from '../../point-list-model';
import { pointService, type CoordinateEditValue, type EditableCoordinateSystem } from '../../index';

const systems: readonly EditableCoordinateSystem[] = ['WGS84', 'GCJ02', 'BD09', 'SHANGHAI2000'];
type FormValues = {
  name: string;
  coordinates: Partial<Record<EditableCoordinateSystem, { first?: number; second?: number }>>;
};

function initialValues(point: Point): FormValues {
  return {
    name: point.name,
    coordinates: Object.fromEntries(
      systems.map((system) => {
        const coordinate = coordinateFor(point, system);
        return [
          system,
          coordinate?.kind === 'geographic'
            ? { first: coordinate.lng, second: coordinate.lat }
            : coordinate?.kind === 'projected'
              ? { first: coordinate.x, second: coordinate.y }
              : {},
        ];
      }),
    ),
  };
}

export function EditPointDrawer({
  point,
  sourceName,
  onClose,
  onSaved,
}: {
  readonly point: Point;
  readonly sourceName: (point: Point) => string;
  readonly onClose: () => void;
  readonly onSaved: (point: Point) => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(values: FormValues) {
    const edits: Partial<Record<EditableCoordinateSystem, CoordinateEditValue | null>> = {};
    for (const system of systems) {
      const coordinate = values.coordinates?.[system] ?? {};
      const firstEmpty = coordinate.first === undefined || coordinate.first === null;
      const secondEmpty = coordinate.second === undefined || coordinate.second === null;
      if (firstEmpty !== secondEmpty) {
        setError(`${system} 的两个坐标必须成对填写。`);
        return;
      }
      if (firstEmpty) {
        if (system === point.coordinates.original.system) {
          setError('原始坐标不能为空。');
          return;
        }
        edits[system] = null;
      } else {
        edits[system] = { first: coordinate.first!, second: coordinate.second! };
      }
    }
    setSaving(true);
    setError(null);
    const result = await pointService.updatePoint(point.id, {
      name: values.name,
      coordinates: edits,
    });
    setSaving(false);
    if (result.status === 'failure') setError(result.error.message);
    else onSaved(result.value);
  }

  return (
    <Drawer
      destroyOnHidden
      extra={<Tag color="cyan">原始坐标不可被转换覆盖</Tag>}
      onClose={onClose}
      open
      size="large"
      title="编辑点位"
    >
      <Form<FormValues>
        form={form}
        initialValues={initialValues(point)}
        layout="vertical"
        onFinish={(values) => void submit(values)}
      >
        {error && (
          <Alert closable title={error} onClose={() => setError(null)} showIcon type="error" />
        )}
        <Form.Item
          label="点位名称"
          name="name"
          rules={[{ required: true, whitespace: true, message: '请输入点位名称' }]}
        >
          <Input aria-label="编辑点位名称" maxLength={120} />
        </Form.Item>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="来源">{sourceName(point)}</Descriptions.Item>
          <Descriptions.Item label="原始坐标系">
            {point.coordinates.original.system}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatPointDate(point.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{formatPointDate(point.updatedAt)}</Descriptions.Item>
        </Descriptions>
        <Divider titlePlacement="left">坐标</Divider>
        <div className="points-antd-coordinate-form">
          {systems.map((system) => {
            const projected = system === 'SHANGHAI2000';
            const original = system === point.coordinates.original.system;
            return (
              <section className="points-antd-coordinate-group" key={system}>
                <h3>
                  {projected ? '上海2000' : system} {original && <Tag color="cyan">原始</Tag>}
                </h3>
                <Space.Compact block>
                  <Form.Item name={['coordinates', system, 'first']} noStyle>
                    <InputNumber
                      aria-label={`${system} ${projected ? 'X' : '经度'}`}
                      placeholder={projected ? 'X' : '经度'}
                      precision={projected ? 4 : 8}
                      style={{ width: '50%' }}
                    />
                  </Form.Item>
                  <Form.Item name={['coordinates', system, 'second']} noStyle>
                    <InputNumber
                      aria-label={`${system} ${projected ? 'Y' : '纬度'}`}
                      placeholder={projected ? 'Y' : '纬度'}
                      precision={projected ? 4 : 8}
                      style={{ width: '50%' }}
                    />
                  </Form.Item>
                </Space.Compact>
              </section>
            );
          })}
        </div>
        <div className="points-antd-drawer-footer">
          <Space>
            <Button aria-label="取消" onClick={onClose}>
              取消
            </Button>
            <Button aria-label="保存" htmlType="submit" loading={saving} type="primary">
              保存
            </Button>
          </Space>
        </div>
      </Form>
    </Drawer>
  );
}
