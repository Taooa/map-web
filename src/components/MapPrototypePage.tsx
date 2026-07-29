import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ToolIcon } from '@/components/ToolIcon';
import { mapNavigation } from '@/config/routes';

interface MapPrototypePageProps {
  title: string;
  shortName: string;
  credentialName: string;
  coordinateSystem: string;
  tone: 'amber' | 'blue' | 'green';
}

export function MapPrototypePage({
  title,
  shortName,
  credentialName,
  coordinateSystem,
  tone,
}: MapPrototypePageProps) {
  const [dialog, setDialog] = useState<'points' | 'key' | null>(null);

  return (
    <div className={`map-workspace map-workspace--${tone}`}>
      <aside className="map-control-panel">
        <div className="map-control-panel__heading">
          <div className="map-platform-title">
            <span className="map-platform-title__mark">{shortName}</span>
            <div>
              <p className="eyebrow">MAP VALIDATION</p>
              <h1>{title}</h1>
            </div>
          </div>
          <nav className="map-tabs" aria-label="地图平台">
            {mapNavigation.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive ? 'is-active' : '')}
                key={item.path}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="map-control-panel__body">
          <section className="map-control-section">
            <div className="map-control-section__title">
              <span>地图点位</span>
              <small>3 / 6</small>
            </div>
            <button
              className="button button--primary button--block"
              onClick={() => setDialog('points')}
              type="button"
            >
              <ToolIcon name="target" />
              选择点位
            </button>
            <div className="selected-points">
              {['浦东机房 A-01', '虹桥网关 B-12', '徐汇传感器 C-07'].map((name, index) => (
                <div className="selected-point" key={name}>
                  <span className="selected-point__number">{index + 1}</span>
                  <div>
                    <strong>{name}</strong>
                    <small>{coordinateSystem} · 坐标已就绪</small>
                  </div>
                  <button aria-label={`移除 ${name}`} type="button">
                    <ToolIcon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="map-control-section">
            <div className="map-control-section__title">
              <span>地图设置</span>
              <small className="missing-status">未配置</small>
            </div>
            <button className="settings-card" onClick={() => setDialog('key')} type="button">
              <span className="settings-card__icon">
                <ToolIcon name="key" />
              </span>
              <span>
                <strong>配置 {credentialName}</strong>
                <small>凭据仅保存在当前浏览器</small>
              </span>
              <ToolIcon name="chevron" size={16} />
            </button>
          </section>

          <section className="coordinate-contract">
            <span className="coordinate-contract__icon">
              <ToolIcon name="compass" size={17} />
            </span>
            <div>
              <strong>平台坐标契约</strong>
              <p>
                当前平台使用 <span>{coordinateSystem}</span>{' '}
                坐标展示。缺失坐标会在业务阶段按需生成。
              </p>
            </div>
          </section>
        </div>

        <footer className="map-panel-footer">
          <span className="local-indicator">
            <i />
            本地工作区
          </span>
          <span>UI Prototype</span>
        </footer>
      </aside>

      <section className="map-canvas" aria-label={`${title}地图区域占位`}>
        <div className="fake-map" aria-hidden="true">
          <span className="fake-map__water" />
          <span className="fake-map__park fake-map__park--one" />
          <span className="fake-map__park fake-map__park--two" />
          <span className="fake-map__road fake-map__road--one" />
          <span className="fake-map__road fake-map__road--two" />
          <span className="fake-map__road fake-map__road--three" />
          {[
            ['浦东机房', '64%', '42%'],
            ['虹桥网关', '27%', '58%'],
            ['徐汇传感器', '43%', '72%'],
          ].map(([label, left, top], index) => (
            <span className="fake-marker" key={label} style={{ left, top }}>
              <i>{index + 1}</i>
              <small>{label}</small>
            </span>
          ))}
        </div>
        <div className="map-toolbar map-toolbar--left">
          <button aria-label="放大地图" type="button">
            +
          </button>
          <button aria-label="缩小地图" type="button">
            −
          </button>
          <button aria-label="定位全部点位" type="button">
            <ToolIcon name="target" size={17} />
          </button>
        </div>
        <div className="map-toolbar map-toolbar--right">
          <button type="button">
            <ToolIcon name="layers" size={16} />
            标准底图
          </button>
        </div>
        <div className="map-missing-card">
          <span className="map-missing-card__icon">
            <ToolIcon name="map" size={23} />
          </span>
          <div>
            <span className="status-label">尚未加载地图</span>
            <h2>
              配置 {title} {credentialName}
            </h2>
            <p>完成凭据配置后，这里将加载真实地图。当前展示为地图区域原型。</p>
          </div>
          <button className="button button--primary" onClick={() => setDialog('key')} type="button">
            <ToolIcon name="key" />
            配置 {credentialName}
          </button>
        </div>
        <div className="map-status-bar">
          <span>
            <i />
            {coordinateSystem}
          </span>
          <span>已选择 3 个点位</span>
          <span>地图 SDK 未接入</span>
        </div>
      </section>

      {dialog && (
        <div className="overlay overlay--center" onMouseDown={() => setDialog(null)}>
          <section
            aria-labelledby="map-dialog-title"
            aria-modal="true"
            className="prototype-dialog map-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <span className="prototype-dialog__icon">
              <ToolIcon name={dialog === 'key' ? 'key' : 'target'} size={22} />
            </span>
            <p className="eyebrow">INTERACTION PLACEHOLDER</p>
            <h2 id="map-dialog-title">
              {dialog === 'key' ? `配置 ${title} ${credentialName}` : '选择地图点位'}
            </h2>
            <p>
              {dialog === 'key'
                ? '凭据表单与本地保存将在后续阶段接入。'
                : '搜索、全选与单选列表将在点位业务完成后接入。'}
            </p>
            <div className="prototype-dialog__fields" aria-hidden="true">
              <span />
              <span />
              {dialog === 'points' && <span />}
            </div>
            <div className="prototype-dialog__actions">
              <button
                className="button button--quiet"
                onClick={() => setDialog(null)}
                type="button"
              >
                关闭
              </button>
              <button className="button button--primary" disabled type="button">
                {dialog === 'key' ? '保存配置' : '确认选择'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
