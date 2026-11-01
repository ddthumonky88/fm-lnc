'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, App, Spin } from 'antd';
import {
  fetchAwardInfo,
  deleteRecord,
  getNationLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  AwardIcon,
  DomesticCompIcon,
  NationIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

function AwardDetailContent() {
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

  const awardId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [awardInfo, setAwardInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!awardId) return;
    setLoading(true);
    try {
      const data = await fetchAwardInfo(awardId, refreshSignal > 0);
      setAwardInfo(data);

      const title = data.name_lg || data.name || data.name_sh || `Award ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Awards', href: '/list-awards' },
        { title },
      ]);
      setBackHref('/list-awards');

      const nationId = data.nation_id || data.nation?.id;
      if (nationId) {
        const logoUrl = getNationLogoUrl(nationId);
        if (logoUrl) {
          setHeaderLogo({
            url: logoUrl,
            alt: data.nation_name || title,
            isFlag: true,
          });
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load award info');
    } finally {
      setLoading(false);
    }
  }, [awardId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (awardInfo) {
      openRecordModal(RecordType.AWARD, awardInfo);
    }
  };

  const handleDelete = async () => {
    if (!awardInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.AWARD, String(awardInfo.id));
      message.success('Award deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-awards');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete award');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading award..." />
      </div>
    );
  }

  if (!awardInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Award not found.</p>
        <Button onClick={() => router.push('/list-awards')} className="mt-4">
          Back to Awards
        </Button>
      </div>
    );
  }

  const compId = awardInfo.competition_id || awardInfo.comp_id || awardInfo.comp?.id;
  const compName = awardInfo.competition_name || awardInfo.comp?.name_lg || awardInfo.comp?.name;
  const nationId = awardInfo.nation_id || awardInfo.nation?.id;
  const nationName = awardInfo.nation_name || awardInfo.nation?.name_lg || awardInfo.nation?.name;
  const awardName = awardInfo.name_lg || awardInfo.name || awardInfo.name_sh || `Award ${awardInfo.id}`;

  return (
    <div className="w-full p-3 sm:p-5 space-y-4">
      {/* 1. Title của Body: Back + Icon + (Line 1: Thẻ ID, Line 2: Name) + Actions */}
      <DetailBodyHeader
        onBack={() => router.push('/list-awards')}
        id={awardInfo.id}
        name={awardName}
        icon={<AwardIcon size={22} className="text-yellow-600" />}
        badgeTypeStyles="bg-yellow-50/90 border-yellow-400 text-yellow-600"
        onEdit={handleEdit}
        onDelete={() => setDeleteModalOpen(true)}
      />

      {/* 2. Vùng thông tin: Card chi tiết thuộc tính */}
      <div className="w-full">
        <RecordDetailView
          data={awardInfo}
          type={EntityType.AWARD}
          showHeader={false}
          onEdit={handleEdit}
        />
      </div>

      {/* 3. Vùng các thẻ (kèm theo số lượng) con trực thuộc */}
      <ChildEntitiesSection
        items={[
          ...(compId
            ? [
                {
                  key: 'comp',
                  label: `Competition (${compName || compId})`,
                  count: 1,
                  icon: <DomesticCompIcon size={18} className="text-amber-500" />,
                  badgeStyles: 'bg-amber-50 border-amber-200 text-amber-600',
                  onClick: () => router.push(`/comp/${compId}`),
                },
              ]
            : []),
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
        title="Delete award"
        itemName={awardName}
        loading={isDeleting}
      />
    </div>
  );
}

export default function AwardDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400">Loading award...</div>}
    >
      <AwardDetailContent />
    </Suspense>
  );
}
