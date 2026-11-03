'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, Trash2, Pencil, Check, X, CheckCircle2, AlertTriangle, Copy, Megaphone } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { normalizeIndianMobile } from '@/lib/phone';
import { Button, Card, CardHeader, Field, Input, Select, Table, Pagination, PageHeader, Badge, Progress, ErrorNote, useToast, EmptyState } from '@/components/ui';

const BATCH = 1000;
const PAGE = 50;
const PHONE_HINT = /(mobile|phone|number|contact|whatsapp|mob|cell|msisdn)/i;
const NAME_HINT = /(name|customer|lead|person)/i;

function detectColumns(headers, rows) {
  let phone = headers.findIndex((h) => PHONE_HINT.test(h));
  if (phone < 0) {
    // Fall back to the column where most sample values are valid mobiles.
    const sample = rows.slice(0, 50);
    let best = -1;
    headers.forEach((_, i) => {
      const score = sample.filter((r) => normalizeIndianMobile(r[i]).valid).length;
      if (score > best) {
        best = score;
        phone = i;
      }
    });
  }
  const name = headers.findIndex((h, i) => i !== phone && NAME_HINT.test(h));
  return { phone, name };
}

/** Recomputes validity + duplicate flags for the whole list (first occurrence wins). */
function classify(list) {
  const seen = new Set();
  return list.map((r) => {
    const n = normalizeIndianMobile(r.phone);
    if (!n.valid) return { ...r, status: 'invalid', reason: n.reason, e164: null };
    if (seen.has(n.e164)) return { ...r, status: 'duplicate', reason: 'Duplicate in file', e164: n.e164 };
    seen.add(n.e164);
    return { ...r, status: 'valid', reason: '', e164: n.e164 };
  });
}

export default function UploadPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheet, setSheet] = useState('');
  const [table, setTable] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({ phone: -1, name: -1 });
  const [contacts, setContacts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [consent, setConsent] = useState(false);
  const [consentSource, setConsentSource] = useState('');
  const [saving, setSaving] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const loadSheet = (wb, name) => {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: false });
    const headers = (aoa[0] || []).map((h, i) => String(h || `Column ${i + 1}`).trim());
    const rows = aoa.slice(1);
    const m = detectColumns(headers, rows);
    setSheet(name);
    setTable({ headers, rows });
    applyMapping(rows, m);
  };

  const applyMapping = (rows, m) => {
    setMapping(m);
    setContacts(
      classify(
        rows
          .map((r, i) => ({ id: i, name: m.name >= 0 ? String(r[m.name] ?? '').trim() : '', phone: m.phone >= 0 ? String(r[m.phone] ?? '').trim() : '' }))
          .filter((r) => r.name || r.phone),
      ),
    );
    setPage(1);
    setResult(null);
  };

  const onFile = async (f) => {
    if (!f) return;
    setError(null);
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) return setError(new Error('Please upload an .xlsx, .xls or .csv file'));
    if (f.size > 25 * 1024 * 1024) return setError(new Error('File is larger than 25 MB'));
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      setFile(f);
      setWorkbook(wb);
      loadSheet(wb, wb.SheetNames[0]);
    } catch (e) {
      setError(new Error(`Could not read this file: ${e.message}`));
    }
  };

  const counts = useMemo(
    () => contacts.reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), { valid: 0, invalid: 0, duplicate: 0 }),
    [contacts],
  );
  const visible = filter === 'all' ? contacts : contacts.filter((c) => c.status === filter);
  const pageRows = visible.slice((page - 1) * PAGE, page * PAGE);

  const updateRow = (id, patch) => setContacts((list) => classify(list.map((c) => (c.id === id ? { ...c, ...patch } : c))));
  const deleteRow = (id) => setContacts((list) => classify(list.filter((c) => c.id !== id)));
  const removeAll = (status) => setContacts((list) => classify(list.filter((c) => c.status !== status)));

  const save = async () => {
    const valid = contacts.filter((c) => c.status === 'valid');
    setError(null);
    setSaving({ done: 0, total: valid.length });
    const agg = { inserted: 0, alreadyExisting: 0, duplicatesInBatch: 0, invalid: 0, batchId: undefined };
    try {
      for (let i = 0; i < valid.length; i += BATCH) {
        const chunk = valid.slice(i, i + BATCH).map((c) => ({ name: c.name, phone: c.e164 }));
        const r = await api('/contacts/bulk', {
          method: 'POST',
          body: { batchId: agg.batchId, consentConfirmed: true, consentSource: consentSource || `excel:${file.name}`, contacts: chunk },
        });
        agg.batchId = r.batchId;
        agg.inserted += r.inserted;
        agg.alreadyExisting += r.alreadyExisting;
        agg.duplicatesInBatch += r.duplicatesInBatch;
        agg.invalid += r.invalid.length;
        setSaving({ done: Math.min(valid.length, i + BATCH), total: valid.length });
      }
      setResult(agg);
      toast(`${agg.inserted} new contacts saved`);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(null);
    }
  };

  const reset = () => {
    setFile(null);
    setWorkbook(null);
    setContacts([]);
    setResult(null);
    setConsent(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Upload Excel" subtitle="Import mobile numbers for a bulk calling campaign. Only contacts who agreed to be called should be uploaded." />
      <ErrorNote error={error} />

      {!file ? (
        <Card
          className={clsx('mt-2 border-dashed transition', dragOver && 'border-brand-500 bg-brand-50')}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFile(e.dataTransfer.files[0]);
          }}
        >
          <button className="flex w-full flex-col items-center px-6 py-14 text-center" onClick={() => inputRef.current?.click()} disabled={!isAdmin}>
            <span className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600">
              <UploadCloud className="h-6 w-6" />
            </span>
            <span className="text-[14px] font-medium">Drop your Excel file here, or click to browse</span>
            <span className="mt-1 text-[12px] text-ink-3">.xlsx, .xls or .csv · up to 25 MB · needs a column with mobile numbers</span>
            {!isAdmin && <span className="mt-2 text-[12px] text-red-600">Only admins can upload contacts.</span>}
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files[0])} />
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
              <div className="flex min-w-0 items-center gap-3 lg:w-64">
                <FileSpreadsheet className="h-8 w-8 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{file.name}</p>
                  <p className="text-[12px] text-ink-3">{table.rows.length.toLocaleString('en-IN')} rows</p>
                </div>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <Field label="Sheet">
                  <Select value={sheet} onChange={(e) => loadSheet(workbook, e.target.value)}>
                    {workbook.SheetNames.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Mobile number column">
                  <Select value={mapping.phone} onChange={(e) => applyMapping(table.rows, { ...mapping, phone: Number(e.target.value) })}>
                    <option value={-1}>— select —</option>
                    {table.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Name column">
                  <Select value={mapping.name} onChange={(e) => applyMapping(table.rows, { ...mapping, name: Number(e.target.value) })}>
                    <option value={-1}>— none —</option>
                    {table.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button variant="ghost" onClick={reset}>
                Choose another file
              </Button>
            </div>
          </Card>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['all', 'Total rows', contacts.length, FileSpreadsheet, 'text-ink-2'],
              ['valid', 'Valid', counts.valid, CheckCircle2, 'text-emerald-600'],
              ['invalid', 'Invalid', counts.invalid, AlertTriangle, 'text-red-600'],
              ['duplicate', 'Duplicates', counts.duplicate, Copy, 'text-amber-600'],
            ].map(([key, label, n, Icon, color]) => (
              <button
                key={key}
                onClick={() => {
                  setFilter(key);
                  setPage(1);
                }}
                className={clsx('rounded-xl border bg-white px-4 py-3 text-left shadow-card transition', filter === key ? 'border-brand-500 ring-2 ring-brand-100' : 'border-line hover:border-line-2')}
              >
                <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Icon className={clsx('h-3.5 w-3.5', color)} /> {label}
                </p>
                <p className="mt-1 text-[20px] font-semibold tabular-nums">{n.toLocaleString('en-IN')}</p>
              </button>
            ))}
          </div>

          <Card>
            <CardHeader
              title="Preview"
              subtitle="Edit or delete rows before saving. Invalid and duplicate rows are not imported."
              action={
                <div className="flex gap-2">
                  {counts.invalid > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => removeAll('invalid')}>
                      Remove invalid
                    </Button>
                  )}
                  {counts.duplicate > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => removeAll('duplicate')}>
                      Remove duplicates
                    </Button>
                  )}
                </div>
              }
            />
            <div className="mt-2">
              {pageRows.length ? (
                <Table>
                  <thead>
                    <tr>
                      <th className="th w-12">#</th>
                      <th className="th">Name</th>
                      <th className="th">Mobile number</th>
                      <th className="th">Normalized</th>
                      <th className="th">Status</th>
                      <th className="th w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id}>
                        <td className="td text-ink-4">{r.id + 2}</td>
                        {editing?.id === r.id ? (
                          <>
                            <td className="td">
                              <Input className="h-8" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                            </td>
                            <td className="td">
                              <Input className="h-8" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="td text-ink">{r.name || <span className="text-ink-4">—</span>}</td>
                            <td className="td tabular-nums">{r.phone || <span className="text-ink-4">empty</span>}</td>
                          </>
                        )}
                        <td className="td tabular-nums">{r.e164 || '—'}</td>
                        <td className="td">
                          {r.status === 'valid' ? <Badge tone="green">Valid</Badge> : r.status === 'duplicate' ? <Badge tone="amber">Duplicate</Badge> : <Badge tone="red">{r.reason}</Badge>}
                        </td>
                        <td className="td">
                          <div className="flex justify-end gap-1">
                            {editing?.id === r.id ? (
                              <>
                                <button
                                  className="rounded p-1 text-emerald-600 hover:bg-panel"
                                  aria-label="Save row"
                                  onClick={() => {
                                    updateRow(r.id, { name: editing.name, phone: editing.phone });
                                    setEditing(null);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button className="rounded p-1 text-ink-3 hover:bg-panel" aria-label="Cancel edit" onClick={() => setEditing(null)}>
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="rounded p-1 text-ink-3 hover:bg-panel hover:text-ink" aria-label="Edit row" onClick={() => setEditing({ id: r.id, name: r.name, phone: r.phone })}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button className="rounded p-1 text-ink-3 hover:bg-panel hover:text-red-600" aria-label="Delete row" onClick={() => deleteRow(r.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <EmptyState title={mapping.phone < 0 ? 'Select the mobile number column' : 'No rows in this view'} />
              )}
              <Pagination page={page} limit={PAGE} total={visible.length} onPage={setPage} />
            </div>
          </Card>

          <Card className="mt-4 p-4">
            {result ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-[14px] font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Import complete
                  </p>
                  <p className="mt-1 text-[13px] text-ink-3">
                    {result.inserted} new · {result.alreadyExisting} already in contacts (added to this upload) · batch {result.batchId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={reset}>Upload another</Button>
                  <Button variant="primary" icon={Megaphone} onClick={() => router.push(`/campaigns?new=1&batch=${result.batchId}`)}>
                    Create campaign
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <label className="flex items-start gap-2 text-[13px] text-ink-2">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-500" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>
                      I confirm these contacts have given consent to receive calls from us, and that numbers on the DND registry will be skipped as per TRAI rules.
                    </span>
                  </label>
                  <Field label="Consent source (optional)" className="max-w-sm">
                    <Input placeholder="e.g. website enquiry form, Oct 2026" value={consentSource} onChange={(e) => setConsentSource(e.target.value)} />
                  </Field>
                </div>
                <div className="w-full shrink-0 lg:w-72">
                  {saving && (
                    <div className="mb-2">
                      <Progress value={(saving.done / saving.total) * 100} />
                      <p className="mt-1 text-[12px] text-ink-3">
                        Saving {saving.done.toLocaleString('en-IN')} / {saving.total.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}
                  <Button variant="primary" className="w-full" disabled={!consent || !counts.valid || !isAdmin} loading={Boolean(saving)} onClick={save}>
                    Save {counts.valid.toLocaleString('en-IN')} valid contacts
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
