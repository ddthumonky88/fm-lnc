'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Tag, App, Spin } from 'antd';
import {
  fetchCompetitionInfo,
  deleteRecord,
  getConfederationLogoUrl,
  getNationLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  DomesticCompIcon,
  IntCompIcon,
  ClubIcon,
  AwardIcon,
  NationIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

function CompetitionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
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

  const compId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [compInfo, setCompInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!compId) return;
    setLoading(true);
    try {
      const data = await fetchCompetitionInfo(compId, refreshSignal > 0);
      setCompInfo(data);

      const title = data.name_lg || data.name || data.name_sh || `Competition ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Competitions', href: '/list-comps' },
        { title: data.name_3l ? `[${data.name_3l}] ${title}` : title },
      ]);
      setBackHref('/list-comps');

      const confedCode = data.confed || (data.nation?.confed as any);
      const confedLogo = confedCode
        ? getConfederationLogoUrl(
            typeof confedCode === 'string' ? confedCode : confedCode?.id || confedCode?.name
          )
        : null;
      if (confedLogo) {
        setHeaderLogo({
          url: confedLogo,
          alt: title,
          isFlag: true,
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load competition info');
    } finally {
      setLoading(false);
    }
  }, [compId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (compInfo) {
      openRecordModal(RecordType.COMPETITION, compInfo);
    }
  };

  const handleDelete = async () => {
    if (!compInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.COMPETITION, String(compInfo.id));
      message.success('Competition deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-comps');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete competition');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading competition..." />
      </div>
    );
  }

  if (!compInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Competition not found.</p>
        <Button onClick={() => router.push('/list-comps')} className="mt-4">
          Back to Competitions
        </Button>
      </div>
    );
  }

  const nationId = compInfo.nation?.id || compInfo.nation_id;
  const nationName = compInfo.nation?.name_lg || compInfo.nation?.name || compInfo.nation?.name_sh;
  const isInternational = Boolean(compInfo.is_international || !nationId);
  const compName =
    compInfo.name_lg || compInfo.name || compInfo.name_sh || `Competition ${compInfo.id}`;

  return (
    <div className="w-full p-3 sm:p-5 space-y-4">
      {/* 1. Title của Body: Back + Icon + (Line 1: Thẻ ID, Line 2: Name) + Actions */}
      <DetailBodyHeader
        onBack={() => router.push('/list-comps')}
        id={compInfo.id}
        name={compName}
        code3={compInfo.name_3l}
        icon={
          isInternational ? (
            <IntCompIcon size={22} className="text-purple-600" />
          ) : (
            <DomesticCompIcon size={22} className="text-amber-600" />
          )
        }
        badgeTypeStyles={
          isInternational
            ? 'bg-purple-50/90 border-purple-300 text-purple-600'
            : 'bg-amber-50/90 border-amber-300 text-amber-600'
        }
        extraTag={
          <Tag color={isInternational ? 'purple' : 'gold'} className="m-0 text-xs">
            {isInternational ? '🌍 International' : '🏆 Domestic'}
          </Tag>
        }
        onEdit={handleEdit}
        onDelete={() => setDeleteModalOpen(true)}
      />

      {/* 2. Vùng thông tin: Card chi tiết thuộc tính */}
      <div className="w-full">
        <RecordDetailView
          data={compInfo}
          type={EntityType.COMPETITION}
          showHeader={false}
          onEdit={handleEdit}
        />
      </div>

      {/* 3. Vùng các thẻ (kèm theo số lượng) con trực thuộc */}
      <ChildEntitiesSection
        items={[
          {
            key: 'clubs',
            label: 'Clubs',
            count: compInfo.clubsCount ?? compInfo.stats?.club ?? 0,
            icon: <ClubIcon size={18} className="text-blue-500" />,
            badgeStyles: 'bg-blue-50 border-blue-200 text-blue-600',
            onClick: () => router.push(`/list-clubs?compId=${compInfo.id}`),
          },
          {
            key: 'awards',
            label: 'Awards',
            count: compInfo.awardsCount ?? compInfo.stats?.award ?? 0,
            icon: <AwardIcon size={18} className="text-yellow-500" />,
            badgeStyles: 'bg-yellow-50 border-yellow-200 text-yellow-600',
            onClick: () => router.push(`/list-awards?compId=${compInfo.id}`),
          },
          ...(nationId
            ? [
                {
                  key: 'nation',
                  label: `Nation (${nationName || nationId})`,
                  count: 1,
                  icon: <NationIcon size={18} className="text-cyan-500" />,
                  badgeStyles: 'bg-cyan-50 border-cyan-200 text-cyan-600',
                  onClick: () => router.push(`/nation/${nationId}`),
                },
              ]
            : []),
        ]}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete competition"
        itemName={compName}
        loading={isDeleting}
      />
    </div>
  );
}

export default function CompetitionDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400">Loading competition...</div>}
    >
      <CompetitionDetailContent />
    </Suspense>
  );
}
