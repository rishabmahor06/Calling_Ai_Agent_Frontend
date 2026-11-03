'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Trash2, Pencil, Upload, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { Card, Input, Select, Button, Pagination, PageHeader, Table, Badge, Modal, Field, Toggle, EmptyState, Spinner, ErrorNote, useToast } from '@/components/ui';
import { fmtDate, fmtDateTime, STATUS_LABEL } from '@/lib/format';

const LIMIT = 25;

function EditContact({ contact, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(contact && { name: contact.name, phone: contact.phone, optedOut: contact.optedOut }), [contact]);
  if (!contact || !form) return null;
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await api(`/contacts/${contact._id}`, { method: 'PATCH', body: form });
      toast('Contact updated');
      onSaved(c);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Edit contact"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ErrorNote error={error} />
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Mobile number">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Toggle checked={form.optedOut} onChange={(v) => setForm({ ...form, optedOut: v })} label="Opted out — never call this number" />
      </div>
    </Modal>
  );
}

export default function ContactsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, error, loading, reload } = useApi('/contacts', { q: debounced, status, page, limit: LIMIT });
  const items = data?.items || [];
  const allChecked = items.length > 0 && items.every((c) => selected.has(c._id));

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const remove = async (ids) => {
    if (!window.confirm(`Delete ${ids.length} contact${ids.length > 1 ? 's' : ''}? Pending campaign calls for them are removed too.`)) return;
    try {
      const r = ids.length === 1 ? await api(`/contacts/${ids[0]}`, { method: 'DELETE' }) : await api('/contacts/bulk-delete', { method: 'POST', body: { ids } });
      toast(r.deleted !== undefined ? `${r.deleted} deleted${r.skippedActive ? `, ${r.skippedActive} on a live call skipped` : ''}` : 'Contact deleted');
      setSelected(new Set());
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Contacts"
        subtitle="All imported numbers with consent, DND and opt-out status."
        actions={
          <>
            {isAdmin && selected.size > 0 && (
              <Button variant="danger" icon={Trash2} onClick={() => remove([...selected])}>
                Delete {selected.size}
              </Button>
            )}
            <Link href="/upload">
              <Button variant="primary" icon={Upload}>
                Upload Excel
              </Button>
            </Link>
          </>
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <Input className="h-8 pl-8" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select
          className="h-8 text-[12px] sm:w-44"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Contact status"
        >
          <option value="all">All contacts</option>
          <option value="active">Callable</option>
          <option value="opted_out">Opted out</option>
          <option value="dnd">On DND registry</option>
        </Select>
      </div>
      <ErrorNote error={error} />
      <Card>
        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : items.length ? (
          <Table>
            <thead>
              <tr>
                {isAdmin && (
                  <th className="th w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-500"
                      checked={allChecked}
                      onChange={() => setSelected(allChecked ? new Set() : new Set(items.map((c) => c._id)))}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="th">Name</th>
                <th className="th">Mobile</th>
                <th className="th">Status</th>
                <th className="th">Calls</th>
                <th className="th">Last outcome</th>
                <th className="th">Last called</th>
                <th className="th">Added</th>
                {isAdmin && <th className="th" />}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-panel/70">
                  {isAdmin && (
                    <td className="td">
                      <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={selected.has(c._id)} onChange={() => toggle(c._id)} aria-label={`Select ${c.name}`} />
                    </td>
                  )}
                  <td className="td font-medium text-ink">{c.name || '—'}</td>
                  <td className="td tabular-nums">{c.phone}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      {c.optedOut ? <Badge tone="red">Opted out</Badge> : <Badge tone="green">Callable</Badge>}
                      {c.dnd?.status === 'yes' && <Badge tone="amber">DND</Badge>}
                    </div>
                  </td>
                  <td className="td tabular-nums">{c.totalCalls}</td>
                  <td className="td">{c.lastOutcome ? STATUS_LABEL[c.lastOutcome] || c.lastOutcome : '—'}</td>
                  <td className="td">{fmtDateTime(c.lastCalledAt)}</td>
                  <td className="td">{fmtDate(c.createdAt)}</td>
                  {isAdmin && (
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button className="rounded p-1 text-ink-3 hover:bg-panel hover:text-ink" onClick={() => setEditing(c)} aria-label="Edit contact">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded p-1 text-ink-3 hover:bg-panel hover:text-red-600" onClick={() => remove([c._id])} aria-label="Delete contact">
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
          <EmptyState icon={Users} title="No contacts found">
            Upload an Excel file to add contacts.
          </EmptyState>
        )}
        <Pagination page={page} limit={LIMIT} total={data?.total || 0} onPage={setPage} />
      </Card>
      <EditContact
        contact={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}
