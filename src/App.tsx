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
import { SizeControlPanel } from './components/ControlPanel/SizeControlPanel';
import { AdvancedControlPanel } from './components/ControlPanel/AdvancedControlPanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';
import { AuthModal } from './components/AuthModal/AuthModal';
import AdminPanel from './components/AdminPanel/AdminPanel';
import { useUIStore } from './stores/useUIStore';
import { useImageStore } from './stores/useImageStore';
import { usePatternStore } from './stores/usePatternStore';
import { useAuthStore } from './stores/useAuthStore';
import { loadProjectFromLocalStorage, saveProjectToLocalStorage } from './utils/exportUtils';
import { generatePatternFromImage } from './utils/imageUtils';
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
  const [currentPage, setCurrentPage] = useState<'app' | 'admin'>(() => {
    // 从 URL 中获取页面状态，避免刷新时重置
    const path = window.location.pathname;
    return path === '/admin' ? 'admin' : 'app';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [aboutClickCount, setAboutClickCount] = useState(0);
  const [aboutClickTimer, setAboutClickTimer] = useState<NodeJS.Timeout | null>(null);

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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const exportMenuItems = [
    {
      key: 'export-png-with-index',
      label: '导出带编号的图片'
    },
    {
      key: 'export-png-without-index',
      label: '导出不带编号的图片'
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

  const handleGeneratePattern = async () => {
    // 检查是否可以使用功能
    if (!canUseFeature()) {
      setAuthModalVisible(true);
      return;
    }

    // 检查是否有图片
    if (!imageState.editedDataUrl) {
      message.warning('请先上传图片');
      return;
    }

    // 调用生成图纸的逻辑
    message.loading('正在生成图纸...', 0);
    patternState.setProcessing(true);
    
    try {
      const palette = patternState.paletteList.find(p => p.id === patternState.params.paletteId);
      if (!palette) {
        message.error('未找到选中的色板');
        return;
      }

      const cells = await generatePatternFromImage(
        imageState.editedDataUrl,
        patternState.params,
        palette
      );
      
      patternState.setPatternCells(cells);
      message.success('图纸生成成功！');
    } catch (error) {
      console.error('生成图纸失败:', error);
      message.error('生成图纸失败，请重试');
    } finally {
      patternState.setProcessing(false);
      message.destroy();
    }
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
              title="关于 (连点3次进入管理后台)"
              onClick={() => {
                const newCount = aboutClickCount + 1;
                setAboutClickCount(newCount);

                // 清除之前的定时器
                if (aboutClickTimer) {
                  clearTimeout(aboutClickTimer);
                }

                // 设置新的定时器，2秒后重置点击次数
                const timer = setTimeout(() => {
                  setAboutClickCount(0);
                }, 2000);
                setAboutClickTimer(timer);

                // 如果点击3次，进入管理后台
                if (newCount >= 3) {
                  setAboutClickCount(0);
                  clearTimeout(timer);
                  setCurrentPage('admin');
                  message.info('已进入管理后台');
                } else {
                  // 正常显示关于对话框
                  setShowAbout(true);
                }
              }}
            >
              <InfoCircleOutlined />
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
            </div>

            {/* 主要内容 */}
            <div className={styles.mainGrid}>
              <div className={styles.leftPanel}>
                <ImageUploader />
                <ImageEditor />
                <PaletteSelector />
              </div>
              <div className={styles.centerPanel}>
                <SizeControlPanel onGenerate={handleGeneratePattern} />
                <PreviewCanvas />
                <AdvancedControlPanel />
              </div>
              <div className={styles.rightPanel}>
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

