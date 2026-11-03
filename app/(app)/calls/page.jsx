'use client';
import { useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { apiUrl } from '@/lib/api';
import { useSocketEvent } from '@/lib/socket';
import { Card, Input, Select, Button, Pagination, PageHeader, Spinner, ErrorNote } from '@/components/ui';
import { DateRangePicker, useDateRange } from '@/components/DateRange';
import { CallsTable } from '@/components/CallsTable';
import { CallDrawer } from '@/components/CallDrawer';
import { STATUS_LABEL } from '@/lib/format';

const LIMIT = 25;

export default function CallHistoryPage() {
  const dr = useDateRange('30d');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [filters, setFilters] = useState({ status: '', campaign: '', dtmf: '', whatsapp: '', transfer: '' });
  const [page, setPage] = useState(1);
  const [openCall, setOpenCall] = useState(null);
  const { data: campaigns } = useApi('/campaigns');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = { q: debouncedQ, ...filters, ...dr.range, page, limit: LIMIT };
  const { data, error, loading, reloadSoon } = useApi('/calls', params);
  useSocketEvent('call:update', () => page === 1 && reloadSoon(2000));

  const setF = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };
  const { page: _p, limit: _l, ...exportParams } = params;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Call history"
        subtitle="Every call with keypad selection, WhatsApp delivery and support transfer outcome."
        actions={
          <a href={apiUrl('/calls/export', exportParams)}>
            <Button icon={Download}>Export Excel</Button>
          </a>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <Input className="h-8 pl-8" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <DateRangePicker {...dr} />
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:flex 2xl:w-auto">
          <Select className="h-8 text-[12px] 2xl:w-36" value={filters.status} onChange={setF('status')} aria-label="Status">
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select className="h-8 text-[12px] 2xl:w-40" value={filters.campaign} onChange={setF('campaign')} aria-label="Campaign">
            <option value="">All campaigns</option>
            {campaigns?.items?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select className="h-8 text-[12px] 2xl:w-28" value={filters.dtmf} onChange={setF('dtmf')} aria-label="Key pressed">
            <option value="">Any key</option>
            {['1', '9', '0', '*'].map((d) => (
              <option key={d} value={d}>
                Pressed {d}
              </option>
            ))}
          </Select>
          <Select className="h-8 text-[12px] 2xl:w-32" value={filters.whatsapp} onChange={setF('whatsapp')} aria-label="WhatsApp">
            <option value="">WhatsApp: any</option>
            {['sent', 'delivered', 'read', 'failed'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select className="h-8 text-[12px] 2xl:w-32" value={filters.transfer} onChange={setF('transfer')} aria-label="Transfer">
            <option value="">Transfer: any</option>
            {['requested', 'dialing', 'completed', 'no_answer', 'failed'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <ErrorNote error={error} />
      <Card>
        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <CallsTable calls={data?.items} onOpen={setOpenCall} />
            <Pagination page={page} limit={LIMIT} total={data?.total || 0} onPage={setPage} />
          </>
        )}
      </Card>
      <CallDrawer callId={openCall} onClose={() => setOpenCall(null)} />
    </div>
  );
}
