'use client';
import { Info, Gauge } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useSocketEvent } from '@/lib/socket';
import { Card, CardHeader, PageHeader, Spinner, ErrorNote, Table, EmptyState } from '@/components/ui';
import { DateRangePicker, useDateRange } from '@/components/DateRange';
import { DailyCallsChart, SimpleBars, LatencyTrend, BarList } from '@/components/charts';
import { fmtMs, fmtDuration, fmtNumber } from '@/lib/format';

const LANG = { hi: 'Hindi', en: 'English', hinglish: 'Hinglish' };

function LatencyTile({ label, stat, hint, target }) {
  const over = target && stat?.p50 > target;
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight">{fmtMs(stat?.p50)}</p>
      <p className="text-2xs text-ink-3">
        median · avg {fmtMs(stat?.avg)} · {fmtNumber(stat?.count)} samples
      </p>
      {target && stat?.count > 0 && (
        <p className={`mt-1 text-2xs font-medium ${over ? 'text-amber-700' : 'text-emerald-700'}`}>
          {over ? '▲ above' : '✓ within'} {target}ms target
        </p>
      )}
      {hint && <p className="mt-2 text-2xs text-ink-4">{hint}</p>}
    </div>
  );
}

function VoicePerformance({ range }) {
  const { data, error, reloadSoon } = useApi('/analytics/voice', range);
  useSocketEvent('metric:new', () => reloadSoon(3000));
  if (error) return <ErrorNote error={error} />;
  if (!data) return <Spinner />;

  const rows = [
    ['End-of-speech → first audio (total)', data.response],
    ['Model first audio (STT + LLM + TTS)', data.modelFirstAudio],
    ['Input transcription lag', data.transcriptionLag],
    ['VAD endpoint detection', data.vadEndpoint],
    ['Keypad (DTMF) → first audio', data.dtmfResponse],
    ['Answer → greeting audio', data.greeting],
    ['Gemini Live WebSocket connect', data.geminiConnect],
  ];

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-ink-3" />
        <h2 className="text-[15px] font-semibold">Voice performance</h2>
      </div>
      <div className="mb-3 flex gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-[12px] text-ink-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
        <span>
          Measured from real call audio and API event timestamps on the server. Gemini Live is a native speech-to-speech model, so speech-to-text, LLM first token and text-to-speech
          happen inside one model and are reported together as “model first audio”. VAD endpoint figures appear only when GEMINI_EXPLICIT_VAD is enabled.
        </span>
      </div>
      {data.samples === 0 ? (
        <Card>
          <EmptyState icon={Gauge} title="No latency samples yet">
            Samples are recorded on every agent reply during real calls. Place a test call from Live Calls to start measuring.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LatencyTile label="Response latency (end of speech → audio out)" stat={data.response} target={700} />
            <LatencyTile label="Model first audio" stat={data.modelFirstAudio} />
            <LatencyTile label="Greeting after answer" stat={data.greeting} hint="Includes Gemini session setup when not pre-warmed" />
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-[12px] text-ink-3">Interruptions (barge-in)</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums">{fmtNumber(data.interruptions)}</p>
              <p className="text-2xs text-ink-3">{fmtNumber(data.interruptedTurns)} agent turns cut short by the customer</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader title="Latency percentiles" subtitle="Milliseconds" />
              <div className="mt-2">
                <Table>
                  <thead>
                    <tr>
                      <th className="th">Stage</th>
                      <th className="th text-right">Samples</th>
                      <th className="th text-right">Avg</th>
                      <th className="th text-right">P50</th>
                      <th className="th text-right">P95</th>
                      <th className="th text-right">P99</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([label, s]) => (
                      <tr key={label}>
                        <td className="td text-ink">{label}</td>
                        <td className="td text-right tabular-nums">{fmtNumber(s.count)}</td>
                        <td className="td text-right tabular-nums">{fmtMs(s.avg)}</td>
                        <td className="td text-right tabular-nums">{fmtMs(s.p50)}</td>
                        <td className="td text-right tabular-nums">{fmtMs(s.p95)}</td>
                        <td className="td text-right tabular-nums">{fmtMs(s.p99)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Response latency by language" subtitle="Detected from the customer's words" />
              <div className="mt-2">
                <Table>
                  <thead>
                    <tr>
                      <th className="th">Language</th>
                      <th className="th text-right">Samples</th>
                      <th className="th text-right">P50</th>
                      <th className="th text-right">P95</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.byLanguage).map(([k, s]) => (
                      <tr key={k}>
                        <td className="td text-ink">{LANG[k]}</td>
                        <td className="td text-right tabular-nums">{fmtNumber(s.count)}</td>
                        <td className="td text-right tabular-nums">{fmtMs(s.p50)}</td>
                        <td className="td text-right tabular-nums">{fmtMs(s.p95)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
          </div>
          <Card className="mt-3">
            <CardHeader title="Response latency trend" subtitle="Daily P50 and P95" />
            <div className="px-2 pb-3 pt-2">
              <LatencyTrend data={data.series} />
            </div>
          </Card>
        </>
      )}
    </section>
  );
}

export default function AnalyticsPage() {
  const dr = useDateRange('30d');
  const { data, error } = useApi('/analytics/overview', dr.range);
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const r = data?.hourly?.find((x) => x._id === h);
    return { hour: h, rate: r?.total ? Math.round((r.answered / r.total) * 100) : 0, total: r?.total || 0 };
  }).filter((h) => h.hour >= 8 && h.hour <= 21);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Analytics" subtitle="Campaign performance, keypad choices and voice latency." actions={<DateRangePicker {...dr} />} />
      <ErrorNote error={error} />
      {!data ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid gap-3 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Calls per day" subtitle={`Median completed-call duration ${fmtDuration(data.duration.p50)}`} />
              <div className="px-2 pb-3 pt-2">{data.series.length ? <DailyCallsChart data={data.series} /> : <EmptyState title="No calls in this range" />}</div>
            </Card>
            <Card>
              <CardHeader title="Keys pressed" subtitle="DTMF selections" />
              <div className="p-4">
                <BarList items={data.dtmf.map((d) => ({ label: `Key ${d._id}`, value: d.n }))} />
              </div>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Answer rate by hour (IST)" subtitle="Share of calls answered — use it to tune the calling window" />
              <div className="px-2 pb-3 pt-2">
                <SimpleBars data={hourly} dataKey="rate" xKey="hour" name="Answer rate" xFormatter={(h) => `${h}:00`} valueFormatter={(v) => `${v}%`} />
              </div>
            </Card>
            <Card>
              <CardHeader title="AI dispositions" subtitle="From post-call analysis" />
              <div className="p-4">
                <BarList items={data.dispositions.map((d) => ({ label: d._id.replace(/_/g, ' '), value: d.n }))} />
              </div>
            </Card>
          </div>
          <Card className="mt-3">
            <CardHeader title="Campaign comparison" />
            <div className="mt-2">
              {data.byCampaign.length ? (
                <Table>
                  <thead>
                    <tr>
                      <th className="th">Campaign</th>
                      <th className="th text-right">Calls</th>
                      <th className="th text-right">Answer rate</th>
                      <th className="th text-right">WhatsApp sent</th>
                      <th className="th text-right">Transfers</th>
                      <th className="th text-right">Avg duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCampaign.map((c) => (
                      <tr key={c._id}>
                        <td className="td font-medium text-ink">{c.name || 'Deleted campaign'}</td>
                        <td className="td text-right tabular-nums">{fmtNumber(c.total)}</td>
                        <td className="td text-right tabular-nums">{c.total ? Math.round((c.answered / c.total) * 100) : 0}%</td>
                        <td className="td text-right tabular-nums">{fmtNumber(c.whatsappSent)}</td>
                        <td className="td text-right tabular-nums">{fmtNumber(c.transfers)}</td>
                        <td className="td text-right tabular-nums">{fmtDuration(c.avgDuration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <EmptyState title="No campaign calls in this range" />
              )}
            </div>
          </Card>
        </>
      )}
      <VoicePerformance range={dr.range} />
    </div>
  );
}
