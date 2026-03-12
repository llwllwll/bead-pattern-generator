import React, { useEffect, useState } from 'react';
import { Layout, Flex, Button, Dropdown, Space, message, Input, Modal } from 'antd';
import {
  DownloadOutlined,
  FileAddOutlined,
  RedoOutlined,
  UndoOutlined,
  SaveOutlined,
  HomeOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { ImageUploader } from './components/ImageUploader/ImageUploader';
import { ImageEditor } from './components/ImageEditor/ImageEditor';
import { PaletteSelector } from './components/PaletteSelector/PaletteSelector';
import { PreviewCanvas } from './components/PreviewCanvas/PreviewCanvas';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';
import { AuthModal } from './components/AuthModal/AuthModal';
import AdminPanel from './components/AdminPanel/AdminPanel';
import { useUIStore } from './stores/useUIStore';
import { useImageStore } from './stores/useImageStore';
import { usePatternStore } from './stores/usePatternStore';
import { useAuthStore } from './stores/useAuthStore';
import { saveProjectToFile, loadProjectFromLocalStorage, saveProjectToLocalStorage } from './utils/exportUtils';
import styles from './App.module.css';

const App: React.FC = () => {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    setHasSeenTutorial,
    hasSeenTutorial
  } = useUIStore();

  const imageState = useImageStore();
  const patternState = usePatternStore();
  const { isAuthenticated, isActivated, trialCount, maxTrialCount, logout, useTrial, isAdmin } = useAuthStore();

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState<'app' | 'admin'>('app');
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    // 初始化加载本地保存的项目
    const loaded = loadProjectFromLocalStorage();
    if (loaded) {
      useImageStore.setState(loaded.imageState);
      usePatternStore.setState(loaded.patternState);
      setHasSeenTutorial(loaded.hasSeenTutorial ?? false);
    }
  }, [setHasSeenTutorial]);

  useEffect(() => {
    // 自动保存到 localStorage
    saveProjectToLocalStorage({
      imageState,
      patternState,
      hasSeenTutorial
    });
  }, [imageState, patternState, hasSeenTutorial]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const exportMenuItems = [
    {
      key: 'export-png-1x',
      label: '导出 PNG (1x)'
    },
    {
      key: 'export-png-2x',
      label: '导出 PNG (2x)'
    },
    {
      key: 'export-png-4x',
      label: '导出 PNG (4x)'
    },
    {
      type: 'divider'
    },
    {
      key: 'export-csv',
      label: '导出颜色清单 CSV'
    },
    {
      key: 'export-json',
      label: '导出项目 JSON'
    }
  ];

  const onExportClick = (info: { key: string }) => {
    // 检查是否可以使用功能
    if (!canUseFeature()) {
      setAuthModalVisible(true);
      return;
    }

    // 具体导出逻辑在 ExportPanel 中实现，这里简化为事件分发
    window.dispatchEvent(
      new CustomEvent('bead-export', {
        detail: info.key
      })
    );
  };

  const handleGeneratePattern = () => {
    // 检查是否可以使用功能
    if (!canUseFeature()) {
      setAuthModalVisible(true);
      return;
    }

    // 这里应该调用生成图纸的逻辑
    message.success('正在生成图纸...');
  };

  const handleSaveProject = () => {
    // 检查是否可以使用功能
    if (!canUseFeature()) {
      setAuthModalVisible(true);
      return;
    }

    saveProjectToFile(imageState, patternState);
    message.success('项目已保存为文件');
  };

  const canUseFeature = (): boolean => {
    // 已激活用户或还有试用次数
    if (isActivated) {
      return true;
    }
    return useTrial();
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
  };

  return (
    <div className={styles.appLayout}>
      {currentPage === 'app' ? (
        <>
          {/* 侧边栏 */}
          <div className={styles.sidebar}>
            <div className={styles.logo}>🎨</div>
            <button 
              className={`${styles.sidebarItem} ${currentPage === 'app' ? styles.active : ''}`} 
              title="首页"
              onClick={() => setCurrentPage('app')}
            >
              <HomeOutlined />
            </button>
            <button 
              className={styles.sidebarItem} 
              title="设置"
              onClick={() => setShowSettings(true)}
            >
              <SettingOutlined />
            </button>
            <button 
              className={styles.sidebarItem} 
              title="关于"
              onClick={() => setShowAbout(true)}
            >
              <InfoCircleOutlined />
            </button>
            <button 
              className={styles.sidebarItem} 
              title="管理后台"
              onClick={() => setCurrentPage('admin')}
            >
              <TeamOutlined />
            </button>
            <button 
              className={styles.sidebarItem} 
              title={isAuthenticated ? "退出登录" : "登录"}
              onClick={() => isAuthenticated ? handleLogout() : setAuthModalVisible(true)}
            >
              {isAuthenticated ? <LogoutOutlined /> : <UserOutlined />}
            </button>
          </div>

          {/* 主内容区 */}
          <div className={styles.mainContent}>
            {/* 头部 */}
            <div className={styles.header}>
              <div className={styles.headerTitle}>拼豆图纸生成器</div>
              <div className={styles.headerActions}>
                <Button 
                  type="primary" 
                  icon={<FileAddOutlined />}
                  title="生成图纸"
                  onClick={handleGeneratePattern}
                >
                  生成图纸
                </Button>
              </div>
            </div>

            {/* 主要内容 */}
            <div className={styles.mainGrid}>
              <div className={styles.leftPanel}>
                <ImageUploader />
                <ImageEditor />
              </div>
              <div className={styles.centerPanel}>
                <PreviewCanvas />
              </div>
              <div className={styles.rightPanel}>
                <PaletteSelector />
                <ControlPanel />
                <ExportPanel />
              </div>
            </div>

            {/* 底部 */}
            <div className={styles.footer}>
              <Space>
                <Button
                  icon={<UndoOutlined />}
                  onClick={undo}
                  disabled={!canUndo}
                  title="Ctrl+Z 撤销"
                >
                  撤销
                </Button>
                <Button
                  icon={<RedoOutlined />}
                  onClick={redo}
                  disabled={!canRedo}
                  title="Ctrl+Y 重做"
                >
                  重做
                </Button>
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveProject}
                  title="Ctrl+S 保存"
                >
                  保存项目
                </Button>
              </Space>
              <Space>
                <Dropdown
                  menu={{
                    items: exportMenuItems,
                    onClick: onExportClick
                  }}
                >
                  <Button icon={<DownloadOutlined />}>导出</Button>
                </Dropdown>
              </Space>
            </div>
          </div>

          {/* 认证模态框 */}
          <AuthModal
            visible={authModalVisible}
            onClose={() => setAuthModalVisible(false)}
          />

          {/* 设置模态框 */}
          <Modal
            title="设置"
            open={showSettings}
            onCancel={() => setShowSettings(false)}
            footer={null}
            width={600}
          >
            <div style={{ padding: '20px 0' }}>
              <h3>拼豆图纸生成器设置</h3>
              <p>功能设置正在完善中...</p>
            </div>
          </Modal>

          {/* 关于模态框 */}
          <Modal
            title="关于"
            open={showAbout}
            onCancel={() => setShowAbout(false)}
            footer={null}
            width={500}
          >
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <h2>拼豆图纸生成器</h2>
              <p>版本 1.0.0</p>
              <p>一款可以将图片转换为拼豆图纸的在线工具</p>
              <p style={{ marginTop: 20, color: '#666' }}>
                支持自定义尺寸、颜色 palette 和多种导出格式
              </p>
            </div>
          </Modal>
        </>
      ) : (
        <AdminPanel />
      )}
    </div>
  );
};

export default App;

