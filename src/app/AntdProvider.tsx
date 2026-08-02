import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { App as AntdApp, ConfigProvider, theme, type ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';

function isDarkTheme(): boolean {
  return document.documentElement.dataset.theme === 'dark';
}

export function AntdProvider({ children }: PropsWithChildren) {
  const [isDark, setIsDark] = useState(isDarkTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(isDarkTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const themeConfig = useMemo<ThemeConfig>(
    () => ({
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: isDark ? '#00bcb2' : '#079c9a',
        colorInfo: isDark ? '#00bcb2' : '#079c9a',
        colorSuccess: '#168c74',
        colorWarning: '#d98b25',
        colorError: '#cf4b52',
        colorBgBase: isDark ? '#071018' : '#ffffff',
        colorBgContainer: isDark ? '#0b1621' : '#ffffff',
        colorBgLayout: isDark ? '#071018' : '#f4f8fa',
        colorBorder: isDark ? '#243c4c' : '#d8e5ed',
        colorText: isDark ? '#f3f8fc' : '#132635',
        colorTextSecondary: isDark ? '#c3d1da' : '#334b5b',
        colorTextTertiary: isDark ? '#9daebc' : '#718594',
        borderRadius: 8,
        borderRadiusLG: 12,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
      },
      components: {
        Button: { primaryShadow: 'none' },
        Table: {
          headerBg: isDark ? '#10202d' : '#f7fafc',
          headerColor: isDark ? '#c3d1da' : '#334b5b',
          borderColor: isDark ? '#243c4c' : '#d8e5ed',
          rowHoverBg: isDark ? '#123b3d' : '#f0fbfa',
        },
        Pagination: { itemActiveBg: isDark ? '#123b3d' : '#def6f3' },
        Modal: {
          contentBg: isDark ? '#0b1621' : '#ffffff',
          headerBg: isDark ? '#0b1621' : '#ffffff',
        },
        Drawer: { colorBgElevated: isDark ? '#0b1621' : '#ffffff' },
      },
    }),
    [isDark],
  );

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
