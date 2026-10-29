'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, Badge, Button, Space, message, Tag, Tooltip } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
  CheckOutlined,
  BranchesOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  fetchClubInfo,
  fetchClubAffiliates,
  deleteRecord,
  getNationLogoUrl,
  ClubItem,
} from '../../../services/api';
import CardGrid from '../../../components/CardGrid';
import RecordDetailView from '../../../components/RecordDetailView';
import RecordModal from '../../../components/RecordModal';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import { ClubIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

const CONFED_ID_MAP: Record<string, string> = {
  '1': 'Africa',
  '2': 'Asia',
  '3': 'Europe',
  '4': 'North America',
  '5': 'Oceania',
  '6': 'South America',
  '7': 'World',
  '8': 'Extinct',
};

function ClubDetailContent() {
  const params = useParams();
  const router = useRouter();
  const {
    openRecordModal,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
    triggerRefresh,
  } = useApp();

  const clubId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [club, setClub] = useState<any | null>(null);
  const [affiliates, setAffiliates] = useState<ClubItem[]>([]);
  const [activeTab, setActiveTab] = useState<'INFO' | 'AFFILIATES'>('INFO');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (clubId) {
      navigator.clipboard.writeText(clubId);
      setCopiedId(true);
      message.success(`Copied ID: ${clubId}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const loadClubData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const data = await fetchClubInfo(clubId);
      if (data) {
        setClub(data);
        const affs = data.affiliates || [];
        setAffiliates(affs);

        const title = data.name_sh || data.name_lg || data.name || `Club ${clubId}`;
        setHeaderTitle(title);
        setHeaderId(data.id);

        const nationId = data.nation?.id || data.nation_id;
        const nationName = data.nation?.name_lg || data.nation?.name || data.nation?.name_sh;
        const nationCode = data.nation?.name_3l || data.nation?.code;

        const confedId =
          data.nation?.confed?.id ||
          data.nation?.confed_id ||
          data.comp?.confed?.id ||
          data.comp?.confed_id;
        const confedName =
          (confedId && CONFED_ID_MAP[String(confedId)]) ||
          data.nation?.confed?.name ||
          data.comp?.confed?.name ||
          'Confederation';

        const compId = data.comp?.id || data.comp_id;
        const compTitle =
          data.comp?.name_3l
            ? `[${data.comp.name_3l}] ${data.comp.name_sh || data.comp.name_lg || ''}`.trim()
            : data.comp?.name_sh || data.comp?.name_lg || data.comp?.name || compId;

        const crumbs: any[] = [
          {
            title: 'FM',
            href: '/',
          },
        ];
        if (confedId) {
          crumbs.push({
            title: confedName,
            href: `/confed/${confedId}`,
          });
        }
        if (nationId) {
          crumbs.push({
            title: nationCode || nationName || 'Nation',
            href: `/nation/${nationId}`,
          });
        }
        if (compId) {
          crumbs.push({
            title: String(compTitle),
            href: `/comp/${compId}`,
          });
        }
        crumbs.push({
          title: String(title),
        });

        setBreadcrumbs(crumbs);
        setBackHref(compId ? `/comp/${compId}` : nationId ? `/nation/${nationId}` : '/');

        if (nationId) {
          setHeaderLogo({
            url: getNationLogoUrl(nationId, nationCode),
            alt: nationName || 'Nation',
            isFlag: true,
          });
        } else {
          setHeaderLogo(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load club info:', err);
      message.error(err.message || 'Failed to load club details');
    } finally {
      setLoading(false);
    }
  }, [clubId, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  useEffect(() => {
    loadClubData();
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [loadClubData, refreshSignal, setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  const handleDeleteClub = async () => {
    if (!clubId) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.CLUB, clubId);
      message.success('Club deleted successfully');
      triggerRefresh();
      const compId = club?.comp?.id || club?.comp_id;
      const nationId = club?.nation?.id || club?.nation_id;
      if (compId) {
        router.push(`/comp/${compId}`);
      } else if (nationId) {
        router.push(`/nation/${nationId}`);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to delete club');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const affiliatesCount = affiliates.length || club?.affiliatesCount || 0;

  return (
    <div className="space-y-4">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <ClubIcon size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 m-0 leading-tight truncate">
                {club?.name_lg || club?.name_sh || club?.name || `Club ${clubId}`}
              </h1>
              {clubId && (
                <Tooltip title="Click to copy UID" placement="top">
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
                  >
                    <span>{clubId}</span>
                    {copiedId ? (
                      <CheckOutlined className="text-emerald-600 text-xs" />
                    ) : (
                      <CopyOutlined className="text-sky-500 text-xs" />
                    )}
                  </button>
                </Tooltip>
              )}
              {club?.is_extinct && (
                <Tag color="error" className="m-0 text-xs font-semibold">
                  Extinct
                </Tag>
              )}
            </div>
            {club?.name_sh && club.name_sh !== club.name_lg && (
              <div className="text-xs text-slate-500 mt-0.5 truncate">{club.name_sh}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            icon={<EditOutlined />}
            onClick={() => openRecordModal(RecordType.CLUB, club, club?.nation_id, club?.comp_id)}
            className="text-xs font-medium"
          >
            Edit Club
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs font-medium"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-5 shadow-2xs min-h-[480px]">
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading club data...</span>
          </div>
        ) : !club ? (
          <div className="text-center py-16 text-sm text-gray-500">
            <p>Club not found.</p>
            <Button type="primary" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        ) : (
          <div>
            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'INFO' | 'AFFILIATES')}
              type="line"
              items={(() => {
                const list: any[] = [
                  {
                    key: 'INFO',
                    label: (
                      <Space size={4}>
                        <InfoCircleOutlined />
                        <span className={activeTab === 'INFO' ? 'font-bold' : ''}>Info</span>
                      </Space>
                    ),
                  },
                ];

                if (affiliatesCount > 0) {
                  list.push({
                    key: 'AFFILIATES',
                    label: (
                      <Space size={4}>
                        <BranchesOutlined className="text-blue-600" />
                        <span className={activeTab === 'AFFILIATES' ? 'font-bold' : ''}>
                          Affiliates / Teams
                        </span>
                        <Badge
                          count={affiliatesCount}
                          overflowCount={999}
                          style={{
                            backgroundColor: activeTab === 'AFFILIATES' ? '#1d70b8' : '#94a3b8',
                          }}
                        />
                      </Space>
                    ),
                  });
                }

                return list;
              })()}
              className="mb-4"
            />

            {/* Tab 1: Club Info */}
            {activeTab === 'INFO' && (
              <RecordDetailView
                data={club}
                type={EntityType.CLUB}
                onEdit={() => openRecordModal(RecordType.CLUB, club, club?.nation_id, club?.comp_id)}
                onDelete={() => setDeleteModalOpen(true)}
                onNavigateParentComp={(cId) => router.push(`/comp/${cId}`)}
                onNavigateConfed={(confId) => router.push(`/confed/${confId}`)}
              />
            )}

            {/* Tab 2: Affiliates */}
            {activeTab === 'AFFILIATES' && (
              <div>
                <CardGrid
                  items={affiliates}
                  type={EntityType.CLUB}
                  loading={false}
                  onEdit={(rec) => openRecordModal(RecordType.CLUB, rec, club?.nation_id, club?.comp_id)}
                  onDelete={async (rec) => {
                    await deleteRecord(RecordType.CLUB, rec.id);
                    message.success('Affiliate deleted');
                    loadClubData();
                  }}
                  onNavigate={(step) => {
                    if (step.id) {
                      router.push(`/club/${step.id}`);
                    }
                  }}
                  emptyText="No affiliated teams found"
                  defaultPageSize={20}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteClub}
        loading={isDeleting}
        title="Delete Club"
        content={`Are you sure you want to delete ${club?.name_lg || club?.name_sh || club?.name || clubId}? This action cannot be undone.`}
      />
    </div>
  );
}

export default function ClubDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading club...</div>}>
      <ClubDetailContent />
    </Suspense>
  );
}
