'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, App, Spin } from 'antd';
import {
  fetchNationInfo,
  deleteRecord,
  getNationLogoUrl,
  NationInfoData,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  NationIcon,
  DomesticCompIcon,
  ClubIcon,
  CityIcon,
  StadiumIcon,
  AwardIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

export default function NationDetailPage() {
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

  const nationId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [nationInfo, setNationInfo] = useState<NationInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!nationId) return;
    setLoading(true);
    try {
      const data = await fetchNationInfo(nationId, refreshSignal > 0);
      setNationInfo(data);

      const title = data.name_lg || data.name_sh || `Nation ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Nations', href: '/list-nations' },
        { title: `[${data.name_3l || ''}] ${title}` },
      ]);
      setBackHref('/list-nations');

      const logoUrl = getNationLogoUrl(data.id);
      if (logoUrl) {
        setHeaderLogo({
          url: logoUrl,
          alt: title,
          isFlag: true,
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load nation info');
    } finally {
      setLoading(false);
    }
  }, [nationId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (nationInfo) {
      openRecordModal(RecordType.COMPETITION, {
        id: nationInfo.id,
        name_lg: nationInfo.name_lg,
        name_sh: nationInfo.name_sh,
        name_3l: nationInfo.name_3l,
        confed: nationInfo.confed,
      });
    }
  };

  const handleDelete = async () => {
    if (!nationInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.COMPETITION, String(nationInfo.id));
      message.success('Nation deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-nations');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete nation');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading nation..." />
      </div>
    );
  }

  if (!nationInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Nation not found.</p>
        <Button onClick={() => router.push('/list-nations')} className="mt-4">
          Back to Nations
        </Button>
      </div>
    );
  }

  const logoUrl = getNationLogoUrl(nationInfo.id);
  const nationName =
    nationInfo.name_lg || nationInfo.name_sh || `Nation ${nationInfo.id}`;

  return (
    <div className="w-full p-3 sm:p-5 space-y-4">
      {/* 1. Title của Body: Back + Icon + (Line 1: Thẻ ID, Line 2: Name) + Actions */}
      <DetailBodyHeader
        onBack={() => router.push('/list-nations')}
        id={nationInfo.id}
        name={nationName}
        code3={nationInfo.name_3l}
        logoUrl={logoUrl}
        icon={<NationIcon size={22} className="text-cyan-600" />}
        badgeTypeStyles="bg-cyan-50/90 border-cyan-300 text-cyan-600"
        onEdit={handleEdit}
        onDelete={() => setDeleteModalOpen(true)}
      />

      {/* 2. Vùng thông tin: Card chi tiết thuộc tính */}
      <div className="w-full">
        <RecordDetailView
          data={nationInfo}
          type={EntityType.NATION}
          showHeader={false}
          onEdit={handleEdit}
        />
      </div>

      {/* 3. Vùng các thẻ (kèm theo số lượng) con trực thuộc */}
      <ChildEntitiesSection
        items={[
          {
            key: 'comps',
            label: 'Competitions',
            count:
              nationInfo.stats?.comps?.main ?? nationInfo.stats?.comps?.total ?? 0,
            icon: <DomesticCompIcon size={18} className="text-amber-500" />,
            badgeStyles: 'bg-amber-50 border-amber-200 text-amber-600',
            onClick: () => router.push(`/list-comps?nationId=${nationInfo.id}`),
          },
          {
            key: 'clubs',
            label: 'Clubs',
            count: nationInfo.stats?.club?.total ?? 0,
            icon: <ClubIcon size={18} className="text-blue-500" />,
            badgeStyles: 'bg-blue-50 border-blue-200 text-blue-600',
            onClick: () => router.push(`/list-clubs?nationId=${nationInfo.id}`),
          },
          {
            key: 'cities',
            label: 'Cities',
            count: nationInfo.stats?.cities ?? 0,
            icon: <CityIcon size={18} className="text-sky-500" />,
            badgeStyles: 'bg-sky-50 border-sky-200 text-sky-600',
            onClick: () => router.push(`/list-cities?nationId=${nationInfo.id}`),
          },
          {
            key: 'stadiums',
            label: 'Stadiums',
            count: nationInfo.stats?.stadiums ?? 0,
            icon: <StadiumIcon size={18} className="text-emerald-500" />,
            badgeStyles: 'bg-emerald-50 border-emerald-200 text-emerald-600',
            onClick: () => router.push(`/list-stadiums?nationId=${nationInfo.id}`),
          },
          {
            key: 'awards',
            label: 'Awards',
            count:
              nationInfo.stats?.awards?.nation ??
              nationInfo.stats?.awards?.total ??
              0,
            icon: <AwardIcon size={18} className="text-yellow-500" />,
            badgeStyles: 'bg-yellow-50 border-yellow-200 text-yellow-600',
            onClick: () => router.push(`/list-awards?nationId=${nationInfo.id}`),
          },
        ]}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete nation"
        itemName={nationName}
        loading={isDeleting}
      />
    </div>
  );
}
