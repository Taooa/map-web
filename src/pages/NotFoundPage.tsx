import { Link } from 'react-router-dom';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export function NotFoundPage() {
  return (
    <PagePlaceholder
      eyebrow="404"
      title="页面不存在"
      description="当前地址不属于地图工具已定义的页面。"
    >
      <Link className="text-link" to="/">
        返回首页
      </Link>
    </PagePlaceholder>
  );
}
