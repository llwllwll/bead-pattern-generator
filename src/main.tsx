import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd';
import App from './App';
import './index.css';
import { useUIStore } from './stores/useUIStore';

const RootApp: React.FC = () => {
  const themeMode = useUIStore((s) => s.themeMode);
  const algorithm =
    themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff'
        },
        algorithm
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);

