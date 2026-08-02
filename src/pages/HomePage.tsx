import { Link } from 'react-router-dom';
import { ToolIcon } from '@/components/ToolIcon';

export function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <div className="home-hero__brand">
            <img className="home-hero__logo" src="/brand/logo-512.png" alt="地图工具" />
            <strong>地图工具</strong>
          </div>
          <div className="product-pill">
            <span className="product-pill__dot" />
            浏览器本地运行 · 数据不上传
          </div>
          <p className="eyebrow">点位坐标与地图展示</p>
          <h1>设备点位坐标转换与地图展示工作台</h1>
          <p className="home-hero__lead">
            将分散的设备点位统一整理、按需转换，并在高德、百度与天地图中快速核对位置。
            一个专注点位展示与核对的轻量工具，而不是复杂的地理信息平台。
          </p>
          <div className="home-hero__actions">
            <Link className="button button--primary" to="/points">
              打开点位管理
              <ToolIcon name="arrow" />
            </Link>
            <Link className="button button--quiet" to="/map?platform=amap">
              进入地图展示
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
            <span className="coordinate-preview__label">点位 · 示例 01</span>
            <span className="status-dot">已就绪</span>
          </div>
          <div className="coordinate-preview__point">
            <span className="coordinate-preview__marker">
              <ToolIcon name="target" size={22} />
            </span>
            <div>
              <strong>设备点位 01</strong>
              <small>表格导入 · 今天 10:32</small>
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
            <span>高德地图展示</span>
            <span className="coordinate-preview__arrow">→</span>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">核心能力</p>
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
              title: '多地图展示',
              text: '在同一工作台切换高德、百度和天地图，直观核对设备位置。',
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
          <p className="eyebrow eyebrow--light">使用流程</p>
          <h2>三步完成一次点位展示</h2>
          <p>流程简单，但每一步都保留专业空间数据所需的清晰边界。</p>
        </div>
        <ol className="workflow">
          <li>
            <span>1</span>
            <div>
              <strong>导入数据</strong>
              <small>表格文件 · 文本文件 · 手动</small>
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
              <small>选择平台并核对位置</small>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-section home-section--resources">
        <div className="section-heading">
          <div>
            <p className="eyebrow">地图平台</p>
            <h2>地图平台与开发资料</h2>
          </div>
          <p>查看平台地图和开发文档，核对坐标要求、申请访问凭据。</p>
        </div>
        <div className="resource-grid resource-grid--platforms">
          {[
            {
              icon: '/resource-icons/amap.ico',
              name: '高德地图',
              description: 'GCJ02坐标验证',
              tone: 'amber',
              website: 'https://www.amap.com/',
              documentation: 'https://lbs.amap.com/api/javascript-api-v2/summary',
            },
            {
              icon: '/resource-icons/baidu-map.ico',
              name: '百度地图',
              description: 'BD09坐标验证',
              tone: 'blue',
              website: 'https://map.baidu.com/',
              documentation: 'https://lbsyun.baidu.com/docs/jsapi?title=jspopularGL/index',
            },
            {
              icon: '/resource-icons/tianditu.ico',
              name: '天地图',
              description: 'WGS84坐标验证',
              tone: 'green',
              website: 'https://www.tianditu.gov.cn/',
              documentation: 'https://lbs.tianditu.gov.cn/api/js4.0/class.html',
            },
          ].map((platform) => (
            <article
              className={`resource-card resource-card--${platform.tone}`}
              key={platform.name}
            >
              <div className="resource-card__heading">
                <span className="resource-card__mark">
                  <img alt="" aria-hidden="true" src={platform.icon} />
                </span>
                <div>
                  <h3>{platform.name}</h3>
                  <p>{platform.description}</p>
                </div>
              </div>
              <div className="resource-card__actions">
                <a
                  aria-label={`访问${platform.name}官网`}
                  href={platform.website}
                  rel="noreferrer"
                  target="_blank"
                >
                  官网
                  <ToolIcon name="arrow" size={14} />
                </a>
                <a
                  aria-label={`查看${platform.name}开发文档`}
                  href={platform.documentation}
                  rel="noreferrer"
                  target="_blank"
                >
                  开发文档
                  <ToolIcon name="arrow" size={14} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-section--reference-resources">
        <div className="section-heading">
          <div>
            <p className="eyebrow">参考资源</p>
            <h2>地理信息参考资源</h2>
          </div>
          <p>用于查询坐标参考系、检查空间数据和开展桌面地图处理。</p>
        </div>
        <div className="resource-grid resource-grid--references">
          {[
            {
              icon: '/resource-icons/epsg.ico',
              name: 'EPSG.io',
              description: '查询全球坐标参考系与投影定义',
              href: 'https://epsg.io/',
            },
            {
              icon: '/resource-icons/qgis.ico',
              name: 'QGIS',
              description: '开源桌面地理信息处理软件',
              href: 'https://qgis.org/',
            },
            {
              icon: '/resource-icons/geojson.ico',
              name: 'GeoJSON.io',
              description: '在线查看和编辑地理空间数据',
              href: 'https://geojson.io/',
            },
          ].map((resource) => (
            <a
              aria-label={`访问${resource.name}`}
              className="reference-card"
              href={resource.href}
              key={resource.name}
              rel="noreferrer"
              target="_blank"
            >
              <span className="reference-card__mark">
                <img alt="" aria-hidden="true" src={resource.icon} />
              </span>
              <span>
                <strong>{resource.name}</strong>
                <small>{resource.description}</small>
              </span>
              <ToolIcon name="arrow" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
