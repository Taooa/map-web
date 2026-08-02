import {
  DeleteOutlined,
  ExportOutlined,
  PlusOutlined,
  ReloadOutlined,
  RetweetOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, DatePicker, Form, Input, Select, Space } from 'antd';
import type { PointFilters } from '../../point-list-model';

const { RangePicker } = DatePicker;

export function PointsToolbar({
  draft,
  sourceOptions,
  canReset,
  hasPoints,
  onDraftChange,
  onSearch,
  onReset,
  onAdd,
  onTransform,
  onExport,
  onDelete,
}: {
  readonly draft: PointFilters;
  readonly sourceOptions: readonly string[];
  readonly canReset: boolean;
  readonly hasPoints: boolean;
  readonly onDraftChange: (filters: PointFilters) => void;
  readonly onSearch: () => void;
  readonly onReset: () => void;
  readonly onAdd: () => void;
  readonly onTransform: () => void;
  readonly onExport: () => void;
  readonly onDelete: () => void;
}) {
  const [form] = Form.useForm();
  const update = (change: Partial<PointFilters>) => onDraftChange({ ...draft, ...change });

  return (
    <section className="points-antd-toolbar" aria-label="点位查询与操作">
      <Form className="points-antd-query" form={form} layout="inline" onFinish={onSearch}>
        <Form.Item className="points-antd-query-name" label="名称" name="name">
          <Input
            allowClear
            aria-label="点位名称"
            onChange={(event) => update({ name: event.target.value })}
            placeholder="输入名称关键字"
            value={draft.name}
          />
        </Form.Item>
        <Form.Item className="points-antd-query-source" label="来源" name="source">
          <Select
            allowClear
            aria-label="点位来源"
            onChange={(value: string | undefined) => update({ source: value ?? '' })}
            options={sourceOptions.map((value) => ({ label: value, value }))}
            placeholder="全部来源"
            value={draft.source || undefined}
          />
        </Form.Item>
        <Form.Item className="points-antd-query-range" label="创建时间" name="createdRange">
          <RangePicker
            aria-label="创建时间范围"
            format="YYYY-MM-DD HH:mm:ss"
            onChange={(_, values) => update({ createdFrom: values[0], createdTo: values[1] })}
            showTime
          />
        </Form.Item>
        <Form.Item className="points-antd-query-range" label="更新时间" name="updatedRange">
          <RangePicker
            aria-label="更新时间范围"
            format="YYYY-MM-DD HH:mm:ss"
            onChange={(_, values) => update({ updatedFrom: values[0], updatedTo: values[1] })}
            showTime
          />
        </Form.Item>
        <Form.Item className="points-antd-query-actions">
          <Space wrap>
            <Button aria-label="查询" htmlType="submit" icon={<SearchOutlined />} type="primary">
              查询
            </Button>
            <Button
              aria-label="重置"
              disabled={!canReset}
              icon={<ReloadOutlined />}
              onClick={() => {
                form.resetFields();
                onReset();
              }}
            >
              重置
            </Button>
            <Button aria-label="新增点位" icon={<PlusOutlined />} onClick={onAdd} type="primary">
              新增
            </Button>
            <Button
              aria-label="坐标转换"
              disabled={!hasPoints}
              icon={<RetweetOutlined />}
              onClick={onTransform}
            >
              坐标转换
            </Button>
            <Button
              aria-label="导出"
              disabled={!hasPoints}
              icon={<ExportOutlined />}
              onClick={onExport}
            >
              导出
            </Button>
            <Button
              aria-label="批量删除"
              danger
              disabled={!hasPoints}
              icon={<DeleteOutlined />}
              onClick={onDelete}
            >
              删除
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </section>
  );
}
