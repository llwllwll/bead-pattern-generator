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
import { patternAPI, authAPI, activationAPI } from './services/api';
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
  const [aboutClickTimer, setAboutClickTimer] = useState<number | null>(null);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [activating, setActivating] = useState(false);

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
    // 初始化加载色库层级数据
    patternState.fetchHierarchy();
  }, []);

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
      console.log('开始生成图纸');
      const series = patternState.currentSeries;
      if (!series) {
        message.error('未找到选中的系列');
        return;
      }

      console.log('找到系列:', series.name);

      // 先调用后端 API 扣除额度
      try {
        // 使用 deductCredits 端点来扣除额度
        const result = await patternAPI.deductCredits();
        console.log('后端 API 调用成功，额度已扣除，剩余额度:', result.data.credits_remaining);
        
        // 更新本地用户信息，确保显示的已使用次数能够正确更新
        await useAuthStore.getState().fetchUserInfo();
      } catch (error) {
        console.error('后端 API 调用失败:', error);
        // 即使 API 调用失败，也继续生成图纸
      }

      // 本地生成图纸
      const cells = await generatePatternFromImage(
        imageState.editedDataUrl,
        patternState.params,
        series
      );
      
      console.log('生成图纸成功，细胞数量:', cells.length);
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

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      message.error('新密码长度至少为6位');
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
      message.success('密码修改成功');
      setChangePasswordModalVisible(false);
      // 清空表单
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCode = async () => {
    if (!activationCode.trim()) {
      message.error('请输入激活码');
      return;
    }

    try {
      setActivating(true);
      await activationAPI.applyCode(activationCode.trim());
      message.success('激活码使用成功');
      // 清空激活码输入
      setActivationCode('');
      // 刷新用户信息
      await useAuthStore.getState().fetchUserInfo();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '激活码使用失败');
    } finally {
      setActivating(false);
    }
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
                {isAuthenticated && (
                  <div className={styles.userInfoBox}>
                    <div className={styles.userInfoContent}>
                      <div>
                        <span>
                          欢迎，{useAuthStore.getState().user?.username || '用户'}
                        </span>
                        <span>
                          剩余额度: {useAuthStore.getState().user?.remaining_credits || 0}
                        </span>
                        <span>
                          已使用: {useAuthStore.getState().user?.total_used || 0}
                        </span>
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => setChangePasswordModalVisible(true)}
                        >
                          修改密码
                        </Button>
                      </div>
                    </div>
                    <div className={styles.userInfoContent}>
                      <div>
                        <Input
                          placeholder="输入激活码"
                          value={activationCode}
                          onChange={(e) => setActivationCode(e.target.value)}
                        />
                        <Button
                          type="primary"
                          onClick={handleActivateCode}
                          loading={activating}
                        >
                          激活
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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

          {/* 修改密码模态框 */}
          <Modal
            title="修改密码"
            open={changePasswordModalVisible}
            onCancel={() => {
              setChangePasswordModalVisible(false);
              // 清空表单
              setOldPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }}
            onOk={handleChangePassword}
            confirmLoading={loading}
            footer={[
              <Button key="cancel" onClick={() => {
                setChangePasswordModalVisible(false);
                // 清空表单
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}>
                取消
              </Button>,
              <Button
                key="submit"
                type="primary"
                loading={loading}
                onClick={handleChangePassword}
              >
                确认修改
              </Button>,
            ]}
          >
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  旧密码
                </label>
                <Input.Password
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入旧密码"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  新密码
                </label>
                <Input.Password
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  确认新密码
                </label>
                <Input.Password
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginTop: 20, padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>忘记密码？请联系管理员重置</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <div>微信：13710731678</div>
                  <div>微信：Bringsomeart_ac</div>
                  <div>微信：SCNU_makeiture</div>
                </div>
              </div>
            </div>
          </Modal>

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

