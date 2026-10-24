'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Input,
  Button,
  Tag,
  Alert,
  Space,
  Tooltip,
  message,
  Card,
  Spin,
  Typography,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
  FileTextOutlined,
  PictureOutlined,
  GlobalOutlined,
  TrophyOutlined,
  BankOutlined,
  CompassOutlined,
  SaveOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  fetchAppConfig,
  updateAppConfig,
  testDirectoryPath,
  syncLncFromConfig,
  reloadLogosFromConfig,
  type AppPathsConfig,
  type ConfigStatusResponse,
} from '../services/api';

const { Text } = Typography;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export default function SettingsModal({
  open,
  onClose,
  onRefreshData,
}: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reloadingLogos, setReloadingLogos] = useState(false);

  const [formData, setFormData] = useState<AppPathsConfig>({
    lncDir: '',
    confedLogoDir: '',
    nationLogoDir: '',
    compLogoDir: '',
    clubLogoDir: '',
  });

  const [statusData, setStatusData] = useState<ConfigStatusResponse['status'] | null>(null);

  const loadCurrentConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppConfig();
      setFormData(data.config);
      setStatusData(data.status);
    } catch (err: any) {
      message.error(err.message || 'Không thể tải cấu hình thư mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadCurrentConfig();
    }
  }, [open, loadCurrentConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAppConfig(formData);
      setFormData(updated.config);
      setStatusData(updated.status);
      message.success('Đã lưu cấu hình thư mục thành công!');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncLnc = async () => {
    if (!confirm('Bạn có chắc chắn muốn đồng bộ lại database từ thư mục file .LNC này?')) {
      return;
    }
    setSyncing(true);
    const hide = message.loading('Đang phân tích và nhập dữ liệu từ file .LNC...', 0);
    try {
      await handleSave(); // Lưu trước khi sync
      await syncLncFromConfig();
      hide();
      message.success('Đồng bộ database thành công!');
      if (onRefreshData) onRefreshData();
      await loadCurrentConfig();
    } catch (err: any) {
      hide();
      message.error(err.message || 'Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const handleReloadLogos = async () => {
    setReloadingLogos(true);
    try {
      await handleSave(); // Lưu trước khi reload
      const res = await reloadLogosFromConfig();
      message.success('Đã quét và làm mới bộ nhớ ảnh thành công!');
      await loadCurrentConfig();
    } catch (err: any) {
      message.error(err.message || 'Không thể tải lại ảnh');
    } finally {
      setReloadingLogos(false);
    }
  };

  const handleTestPath = async (key: keyof AppPathsConfig) => {
    const p = formData[key];
    if (!p) {
      message.warning('Vui lòng nhập đường dẫn để kiểm tra');
      return;
    }
    try {
      const res = await testDirectoryPath(p);
      if (res.exists) {
        if (res.isDirectory) {
          message.success(`Thư mục hợp lệ! Phát hiện ${res.fileCount} mục bên trong.`);
        } else {
          message.info(`Đường dẫn là một file (kích thước: ${(res.size / 1024).toFixed(1)} KB)`);
        }
      } else {
        message.error('Đường dẫn không tồn tại trên máy!');
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể kiểm tra đường dẫn');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const lncStatus = statusData?.lnc;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
          <SettingOutlined className="text-blue-600 text-lg" />
          <span>Cấu hình Thư mục Dữ liệu & Ảnh</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={760}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Lưu cấu hình
        </Button>,
      ]}
      destroyOnClose
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <Spin size="large" />
          <span className="text-sm text-slate-500">Đang tải cấu hình...</span>
        </div>
      ) : (
        <div className="mt-2">
          <Tabs
            defaultActiveKey="lnc"
            items={[
              {
                key: 'lnc',
                label: (
                  <span className="flex items-center gap-1.5 font-medium">
                    <FileTextOutlined className="text-blue-500" />
                    <span>File .LNC đầu vào</span>
                  </span>
                ),
                children: (
                  <div className="space-y-4 py-1">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Thư mục chứa các file .LNC:
                        </label>
                        {lncStatus?.exists ? (
                          <Tag color="success" icon={<CheckCircleOutlined />}>
                            Thư mục tồn tại
                          </Tag>
                        ) : (
                          <Tag color="error" icon={<CloseCircleOutlined />}>
                            Thư mục không tồn tại
                          </Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={formData.lncDir}
                          onChange={(e) => setFormData({ ...formData, lncDir: e.target.value })}
                          placeholder="Ví dụ: D:\Games\FM24_2026\FootballManager24\data\database\db\2430\lnc\all"
                          prefix={<FolderOpenOutlined className="text-slate-400" />}
                          className="flex-1 text-xs sm:text-sm font-mono"
                          allowClear
                        />
                        <Button
                          onClick={() => handleTestPath('lncDir')}
                          className="shrink-0 text-xs"
                        >
                          Kiểm tra
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Thư mục chứa 3 file .LNC chuẩn của bản sửa tên FM24.
                      </p>
                    </div>

                    {/* Status Alert */}
                    {lncStatus && (
                      <div>
                        {lncStatus.allFilesFound ? (
                          <Alert
                            type="success"
                            showIcon
                            icon={<CheckCircleOutlined className="text-emerald-500" />}
                            message="Tất cả 3 file .LNC đã sẵn sàng"
                            description="Đã tìm thấy đầy đủ 3 file cần thiết. Bạn có thể bấm 'Đồng bộ Database' để nạp toàn bộ dữ liệu."
                            className="bg-emerald-50 border-emerald-200"
                          />
                        ) : (
                          <Alert
                            type="warning"
                            showIcon
                            icon={<ExclamationCircleOutlined className="text-amber-500" />}
                            message="Chưa đủ 3 file .LNC"
                            description="Vui lòng kiểm tra lại đường dẫn thư mục hoặc sao chép đủ 3 file .LNC bên dưới."
                            className="bg-amber-50 border-amber-200"
                          />
                        )}
                      </div>
                    )}

                    {/* File Checklist */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="text-xs font-bold text-slate-600 mb-2">
                        Danh sách file cần thiết:
                      </div>

                      {[
                        {
                          key: 'cityNation',
                          label: 'FM24 - City & Nation.lnc',
                          desc: 'Quốc gia, Thành phố, Châu lục (CAF, AFC, UEFA...)',
                          file: lncStatus?.files?.cityNation,
                        },
                        {
                          key: 'clubStadium',
                          label: 'FM24 - Club & Stadium.lnc',
                          desc: 'Câu lạc bộ và Sân vận động',
                          file: lncStatus?.files?.clubStadium,
                        },
                        {
                          key: 'compOther',
                          label: 'FM24 - Competition & Other.lnc',
                          desc: 'Giải đấu, Giải thưởng, Cầu thủ, Giai đoạn',
                          file: lncStatus?.files?.compOther,
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200/80 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {item.file?.exists ? (
                              <CheckCircleOutlined className="text-emerald-500 text-base" />
                            ) : (
                              <CloseCircleOutlined className="text-rose-400 text-base" />
                            )}
                            <div>
                              <div className="text-xs font-semibold text-slate-800 font-mono">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-400">{item.desc}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            {item.file?.exists ? (
                              <Tag color="green" className="font-mono text-[11px]">
                                {formatFileSize(item.file?.size)}
                              </Tag>
                            ) : (
                              <Tag color="red" className="text-[11px]">
                                Thiếu file
                              </Tag>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Sync Button */}
                    <div className="pt-2 flex justify-end">
                      <Button
                        type="primary"
                        icon={<SyncOutlined spin={syncing} />}
                        loading={syncing}
                        onClick={handleSyncLnc}
                        disabled={!lncStatus?.allFilesFound}
                        style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                        className="font-medium shadow-xs"
                      >
                        Đồng bộ Database từ thư mục này
                      </Button>
                    </div>
                  </div>
                ),
              },
              {
                key: 'logos',
                label: (
                  <span className="flex items-center gap-1.5 font-medium">
                    <PictureOutlined className="text-purple-500" />
                    <span>Thư mục Ảnh & Logo</span>
                  </span>
                ),
                children: (
                  <div className="space-y-4 py-1">
                    <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2 text-xs text-blue-700">
                      <InfoCircleOutlined className="text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        Hệ thống tự động đọc file ảnh theo mã ID (ví dụ: <code className="bg-blue-100/60 px-1 py-0.5 rounded font-mono">765.png</code>), mã 3 chữ cái, hoặc cấu hình từ file <code className="bg-blue-100/60 px-1 py-0.5 rounded font-mono">config.xml</code> của Football Manager.
                      </div>
                    </div>

                    {/* 1. Confederation Logos */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <GlobalOutlined className="text-blue-500" />
                          <span>Logo Châu lục (Confederations):</span>
                        </label>
                        {statusData?.confedLogo?.exists ? (
                          <Tag color="success">
                            {statusData.confedLogo.fileCount} file
                          </Tag>
                        ) : (
                          <Tag color="default">Chưa tìm thấy</Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={formData.confedLogoDir}
                          onChange={(e) => setFormData({ ...formData, confedLogoDir: e.target.value })}
                          placeholder="Ví dụ: ...\graphics\logo\Confederations\normal"
                          className="flex-1 text-xs font-mono"
                          allowClear
                        />
                        <Button onClick={() => handleTestPath('confedLogoDir')} className="shrink-0 text-xs">
                          Kiểm tra
                        </Button>
                      </div>
                    </div>

                    {/* 2. Nation Logos */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <CompassOutlined className="text-emerald-500" />
                          <span>Logo Quốc gia (Nations):</span>
                        </label>
                        {statusData?.nationLogo?.exists ? (
                          <Tag color="success">
                            {statusData.nationLogo.fileCount} file
                          </Tag>
                        ) : (
                          <Tag color="default">Chưa tìm thấy</Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={formData.nationLogoDir}
                          onChange={(e) => setFormData({ ...formData, nationLogoDir: e.target.value })}
                          placeholder="Ví dụ: ...\graphics\logo\Nations\normal"
                          className="flex-1 text-xs font-mono"
                          allowClear
                        />
                        <Button onClick={() => handleTestPath('nationLogoDir')} className="shrink-0 text-xs">
                          Kiểm tra
                        </Button>
                      </div>
                    </div>

                    {/* 3. Competition Logos */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <TrophyOutlined className="text-amber-500" />
                          <span>Logo Giải đấu (Competitions):</span>
                        </label>
                        {statusData?.compLogo?.exists ? (
                          <Tag color="success">
                            {statusData.compLogo.fileCount} mục
                          </Tag>
                        ) : (
                          <Tag color="default">Tùy chọn</Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={formData.compLogoDir}
                          onChange={(e) => setFormData({ ...formData, compLogoDir: e.target.value })}
                          placeholder="Ví dụ: ...\graphics\logo\Competitions"
                          className="flex-1 text-xs font-mono"
                          allowClear
                        />
                        <Button onClick={() => handleTestPath('compLogoDir')} className="shrink-0 text-xs">
                          Kiểm tra
                        </Button>
                      </div>
                    </div>

                    {/* 4. Club Logos */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <BankOutlined className="text-purple-500" />
                          <span>Logo Câu lạc bộ (Clubs):</span>
                        </label>
                        {statusData?.clubLogo?.exists ? (
                          <Tag color="success">
                            {statusData.clubLogo.fileCount} mục
                          </Tag>
                        ) : (
                          <Tag color="default">Tùy chọn</Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={formData.clubLogoDir}
                          onChange={(e) => setFormData({ ...formData, clubLogoDir: e.target.value })}
                          placeholder="Ví dụ: ...\graphics\logo\Club"
                          className="flex-1 text-xs font-mono"
                          allowClear
                        />
                        <Button onClick={() => handleTestPath('clubLogoDir')} className="shrink-0 text-xs">
                          Kiểm tra
                        </Button>
                      </div>
                    </div>

                    {/* Reload Logos Cache button */}
                    <div className="pt-2 flex justify-end">
                      <Button
                        icon={<ReloadOutlined spin={reloadingLogos} />}
                        loading={reloadingLogos}
                        onClick={handleReloadLogos}
                        className="font-medium"
                      >
                        Quét & Tải lại bộ nhớ ảnh
                      </Button>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
