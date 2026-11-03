'use client';
import { useEffect, useState } from 'react';
import { Globe, FileText, RefreshCw, Trash2, Search, BookOpen, Plus, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useSocketEvent } from '@/lib/socket';
import { Button, Card, CardHeader, Field, Input, Textarea, PageHeader, Table, Badge, EmptyState, Spinner, ErrorNote, useToast } from '@/components/ui';
import { fmtDateTime, fmtNumber } from '@/lib/format';

const STATUS_TONE = { pending: 'gray', crawling: 'blue', ready: 'green', failed: 'red' };

function AddWebsite({ onAdded }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/knowledge/website', { method: 'POST', body: { url: url.trim(), maxPages: Number(maxPages) } });
      toast('Crawling started — this takes a few seconds');
      setUrl('');
      onAdded();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3 p-4">
      <ErrorNote error={error} />
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="Website URL">
          <Input type="url" required placeholder="https://yourwebsite.com" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Field label="Max pages">
          <Input type="number" min={1} max={100} value={maxPages} onChange={(e) => setMaxPages(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" variant="primary" icon={Globe} loading={busy} disabled={!url}>
        Crawl website
      </Button>
    </form>
  );
}

function AddText({ onAdded }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/knowledge/text', { method: 'POST', body: { title, text } });
      toast('Added to knowledge base');
      setTitle('');
      setText('');
      onAdded();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3 p-4">
      <ErrorNote error={error} />
      <Field label="Title">
        <Input required placeholder="e.g. FAQs, Pricing, Refund policy" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Content" hint="Paste FAQs, price list, policies — anything customers may ask about">
        <Textarea required rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" icon={Plus} loading={busy} disabled={!title || text.length < 20}>
        Add text
      </Button>
    </form>
  );
}

function TryQuestion() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const ask = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setRes((await api('/knowledge/search', { params: { q } })).results);
    } catch {
      setRes([]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="mt-4">
      <CardHeader title="Test a customer question" subtitle="Shows what the agent's search_knowledge tool finds during a call" />
      <form onSubmit={ask} className="flex gap-2 p-4 pb-2">
        <Input placeholder="e.g. price kitna hai? / office timing?" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" icon={Search} loading={busy} disabled={!q.trim()}>
          Search
        </Button>
      </form>
      <div className="px-4 pb-4">
        {res === null ? null : res.length ? (
          <ul className="space-y-2">
            {res.map((r, i) => (
              <li key={i} className="rounded-lg bg-panel p-3 text-[13px]">
                <p className="mb-1 truncate text-2xs font-medium text-ink-3">{r.title || r.url}</p>
                <p className="whitespace-pre-line text-ink-2">{r.text.length > 400 ? `${r.text.slice(0, 400)}…` : r.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-ink-3">Nothing found — on a call the agent would say it doesn't know and offer a support executive.</p>
        )}
      </div>
    </Card>
  );
}

export default function KnowledgePage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [crawling, setCrawling] = useState(false);
  // Poll every 3s only while a crawl is running; the socket event usually arrives first.
  const { data, error, loading, reload, reloadSoon } = useApi('/knowledge', null, { refreshMs: crawling ? 3000 : undefined });
  useEffect(() => {
    setCrawling(Boolean(data?.items?.some((s) => s.status === 'crawling' || s.status === 'pending')));
  }, [data]);
  useSocketEvent('knowledge:update', () => reloadSoon(200));

  const recrawl = async (s) => {
    try {
      await api(`/knowledge/${s._id}/recrawl`, { method: 'POST' });
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const remove = async (s) => {
    if (!window.confirm(`Remove "${s.title}" from the knowledge base?`)) return;
    await api(`/knowledge/${s._id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Knowledge base" subtitle="What the agent knows when a customer asks a question during the call." />
      <div className="mb-4 flex gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-[12px] text-ink-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
        <span>
          The first ~16,000 characters go straight into the agent's instructions (fastest answers). For anything beyond that, the agent searches all content during the call. If the
          answer isn't here, it says so and offers a support executive — it never makes things up.
        </span>
      </div>
      <ErrorNote error={error} />

      {isAdmin && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Add a website" subtitle="Crawls pages on the same domain (respects robots.txt)" />
            <AddWebsite onAdded={reload} />
          </Card>
          <Card>
            <CardHeader title="Add text" subtitle="FAQs, price lists, policies" />
            <AddText onAdded={reload} />
          </Card>
        </div>
      )}

      <Card className="mt-4">
        <CardHeader
          title="Sources"
          subtitle={
            data
              ? `${fmtNumber(data.prompt.chars)} characters in the agent prompt${data.prompt.truncated ? ' · rest available via search' : ''}`
              : undefined
          }
        />
        <div className="mt-2">
          {loading && !data ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : data?.items?.length ? (
            <Table>
              <thead>
                <tr>
                  <th className="th">Source</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Pages</th>
                  <th className="th text-right">Characters</th>
                  <th className="th">Updated</th>
                  {isAdmin && <th className="th" />}
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s._id}>
                    <td className="td max-w-[320px]">
                      <div className="flex items-center gap-2">
                        {s.type === 'website' ? <Globe className="h-4 w-4 shrink-0 text-ink-3" /> : <FileText className="h-4 w-4 shrink-0 text-ink-3" />}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{s.title || s.url}</p>
                          {s.url && <p className="truncate text-2xs text-ink-3">{s.url}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                      {s.error && <p className="mt-0.5 max-w-[220px] truncate text-2xs text-red-600" title={s.error}>{s.error}</p>}
                    </td>
                    <td className="td text-right tabular-nums">{s.pages}</td>
                    <td className="td text-right tabular-nums">{fmtNumber(s.chars)}</td>
                    <td className="td">{fmtDateTime(s.lastCrawledAt || s.updatedAt)}</td>
                    {isAdmin && (
                      <td className="td">
                        <div className="flex justify-end gap-1">
                          {s.type === 'website' && (
                            <button className="rounded p-1 text-ink-3 hover:bg-panel hover:text-ink disabled:opacity-40" disabled={s.status === 'crawling'} onClick={() => recrawl(s)} aria-label="Re-crawl" title="Re-crawl">
                              <RefreshCw className={`h-3.5 w-3.5 ${s.status === 'crawling' ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <button className="rounded p-1 text-ink-3 hover:bg-panel hover:text-red-600" onClick={() => remove(s)} aria-label="Delete" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={BookOpen} title="No knowledge yet">
              Add your website or paste FAQs so the agent can answer customer questions on the call.
            </EmptyState>
          )}
        </div>
      </Card>
      <TryQuestion />
    </div>
  );
}
