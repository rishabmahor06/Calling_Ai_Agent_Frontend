'use client';
import { useState } from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Badge, useToast } from './ui';

export const CAMPAIGN_TONE = { draft: 'gray', scheduled: 'blue', running: 'green', paused: 'amber', stopped: 'red', completed: 'violet' };

export function CampaignStatus({ status }) {
  return <Badge tone={CAMPAIGN_TONE[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

export function CampaignControls({ campaign, onChange, size = 'sm' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const act = async (action) => {
    if (action === 'stop' && !window.confirm('Stop this campaign? Calls in progress will finish; no new calls will be placed.')) return;
    setBusy(action);
    try {
      const c = await api(`/campaigns/${campaign._id}/${action}`, { method: 'POST' });
      onChange?.(c);
      toast(`Campaign ${c.status}`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };
  const s = campaign.status;
  return (
    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      {['draft', 'stopped', 'scheduled'].includes(s) && (
        <Button size={size} variant="primary" icon={Play} loading={busy === 'start'} onClick={() => act('start')}>
          Start
        </Button>
      )}
      {s === 'completed' && (
        <Button size={size} icon={RotateCcw} loading={busy === 'start'} onClick={() => act('start')}>
          Retry unanswered
        </Button>
      )}
      {s === 'running' && (
        <Button size={size} icon={Pause} loading={busy === 'pause'} onClick={() => act('pause')}>
          Pause
        </Button>
      )}
      {s === 'paused' && (
        <Button size={size} variant="primary" icon={Play} loading={busy === 'resume'} onClick={() => act('resume')}>
          Resume
        </Button>
      )}
      {['running', 'paused', 'scheduled'].includes(s) && (
        <Button size={size} variant="danger" icon={Square} loading={busy === 'stop'} onClick={() => act('stop')}>
          Stop
        </Button>
      )}
    </div>
  );
}

export function campaignProgress(stats) {
  const done = stats.total - stats.pending - stats.inProgress;
  return { done, pct: stats.total ? (done / stats.total) * 100 : 0 };
}
