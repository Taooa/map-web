import { Link } from 'react-router-dom';
import { ToolIcon } from '@/components/ToolIcon';

export function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <div className="product-pill">
            <span className="product-pill__dot" />
            浏览器本地运行 · 数据不上传
          </div>
          <p className="eyebrow">PeachTools · Spatial Utilities</p>
          <h1>设备点位坐标转换与地图验证工作台</h1>
          <p className="home-hero__lead">
            将分散的设备点位统一整理、按需转换，并在高德、百度与天地图中快速核对位置。
            一个专注点位验证的轻量工具，而不是复杂 GIS 平台。
          </p>
          <div className="home-hero__actions">
            <Link className="button button--primary" to="/points">
              打开 Point Manager
              <ToolIcon name="arrow" />
            </Link>
            <Link className="button button--quiet" to="/map/amap">
              进入地图验证
            </Link>
          </div>
          <div className="home-hero__meta">
            <span>
              <ToolIcon name="check" size={15} /> 4 种坐标体系
            </span>
            <span>
              <ToolIcon name="check" size={15} /> 3 个地图平台
            </span>
            <span>
              <ToolIcon name="check" size={15} /> 本地优先
            </span>
          </div>
        </div>

        <div className="coordinate-preview" aria-label="点位转换流程预览">
          <div className="coordinate-preview__top">
            <span className="coordinate-preview__label">POINT · PT-240701</span>
            <span className="status-dot">已就绪</span>
          </div>
          <div className="coordinate-preview__point">
            <span className="coordinate-preview__marker">
              <ToolIcon name="target" size={22} />
            </span>
            <div>
              <strong>浦东机房 A-01</strong>
              <small>Excel 导入 · 今天 10:32</small>
            </div>
          </div>
          <div className="coordinate-preview__route">
            <div className="coordinate-node is-source">
              <span>原始坐标</span>
              <strong>WGS84</strong>
              <code>121.544379, 31.221517</code>
            </div>
            <div className="coordinate-route-line">
              <span>
                <ToolIcon name="transform" size={14} />
              </span>
            </div>
            <div className="coordinate-node">
              <span>地图坐标</span>
              <strong>GCJ02</strong>
              <code>121.548921, 31.219648</code>
            </div>
          </div>
          <div className="coordinate-preview__footer">
            <span>高德地图验证</span>
            <span className="coordinate-preview__arrow">→</span>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CORE CAPABILITIES</p>
            <h2>把点位工作集中在一条清晰路径上</h2>
          </div>
          <p>从数据进入到地图核对，每一步都保留明确的坐标语义与来源。</p>
        </div>
        <div className="capability-grid">
          {[
            {
              icon: 'database' as const,
              index: '01',
              title: '点位管理',
              text: '通过手动或文件导入建立统一点位列表，保持名称、来源和原始坐标清晰可追溯。',
            },
            {
              icon: 'transform' as const,
              index: '02',
              title: '坐标转换',
              text: '在 WGS84、GCJ02、BD09 与上海2000之间按需生成目标坐标，原始值始终保留。',
            },
            {
              icon: 'map' as const,
              index: '03',
              title: '多地图验证',
              text: '在高德、百度和天地图的独立工作区中选择点位，直观核对设备位置。',
            },
          ].map((item) => (
            <article className="capability-card" key={item.title}>
              <div className="capability-card__top">
                <span className="icon-tile">
                  <ToolIcon name={item.icon} />
                </span>
                <span>{item.index}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section">
        <div className="workflow-section__intro">
          <p className="eyebrow eyebrow--light">WORKFLOW</p>
          <h2>三步完成一次点位验证</h2>
          <p>流程简单，但每一步都保留专业空间数据所需的清晰边界。</p>
        </div>
        <ol className="workflow">
          <li>
            <span>1</span>
            <div>
              <strong>导入数据</strong>
              <small>Excel · CSV · JSON · 手动</small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>转换坐标</strong>
              <small>明确选择源与目标体系</small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>地图查看</strong>
              <small>选择平台并验证位置</small>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-section home-section--platforms">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MAP WORKSPACES</p>
            <h2>选择地图平台开始验证</h2>
          </div>
          <p>三个平台保持一致的操作结构，凭据与坐标要求各自独立。</p>
        </div>
        <div className="platform-grid">
          {[
            {
              code: 'AM',
              name: '高德地图',
              path: '/map/amap',
              system: 'GCJ02',
              credential: 'Key',
              tone: 'amber',
            },
            {
              code: 'BM',
              name: '百度地图',
              path: '/map/baidu',
              system: 'BD09',
              credential: 'AK',
              tone: 'blue',
            },
            {
              code: 'TD',
              name: '天地图',
              path: '/map/tianditu',
              system: 'WGS84 / CGCS2000',
              credential: 'Token',
              tone: 'green',
            },
          ].map((platform) => (
            <Link
              className={`platform-card platform-card--${platform.tone}`}
              key={platform.name}
              to={platform.path}
            >
              <span className="platform-card__mark">{platform.code}</span>
              <span className="platform-card__content">
                <strong>{platform.name}</strong>
                <small>
                  {platform.system} · {platform.credential}
                </small>
              </span>
              <ToolIcon name="arrow" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
