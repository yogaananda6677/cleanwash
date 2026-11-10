import { Head, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import { VoucherStatusBadge } from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import { formatRupiah, formatTanggal } from '@/lib/format';
import type { VoucherIndexProps, VoucherItem, VoucherStatus } from '@/types';

export default function VoucherIndex({ voucher, filters }: VoucherIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState<VoucherStatus | ''>(
        filters.status ?? '',
    );
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<VoucherItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<VoucherItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data, setData, post, put, processing, errors, clearErrors, reset } =
        useForm<{
            nomor_voucher: string;
            nilai: string;
            masa_berlaku: string;
            status_penggunaan: 'TERSEDIA' | 'KEDALUWARSA';
        }>({
            nomor_voucher: '',
            nilai: '',
            masa_berlaku: '',
            status_penggunaan: 'TERSEDIA',
        });

    const applyFilters = (
        nextSearch: string,
        nextStatus: VoucherStatus | '',
    ) => {
        router.get(
            '/voucher',
            {
                search: nextSearch.trim() || undefined,
                status: nextStatus || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(search, statusFilter);
    };

    const handleStatusChange = (nextStatus: VoucherStatus | '') => {
        setStatusFilter(nextStatus);
        applyFilters(search, nextStatus);
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('');
        router.get('/voucher', {}, { preserveState: true, replace: true });
    };

    const openCreateModal = () => {
        setEditingItem(null);
        clearErrors();
        reset();
        setData({
            nomor_voucher: '',
            nilai: '',
            masa_berlaku: '',
            status_penggunaan: 'TERSEDIA',
        });
        setFormModalOpen(true);
    };

    const openEditModal = (item: VoucherItem) => {
        if (item.status_penggunaan === 'SUDAH_DIGUNAKAN') {
            return;
        }
        setEditingItem(item);
        clearErrors();
        setData({
            nomor_voucher: item.nomor_voucher,
            nilai: item.nilai,
            masa_berlaku: item.masa_berlaku,
            status_penggunaan:
                item.status_penggunaan === 'KEDALUWARSA'
                    ? 'KEDALUWARSA'
                    : 'TERSEDIA',
        });
        setFormModalOpen(true);
    };

    const closeFormModal = () => {
        if (processing) {
            return;
        }
        setFormModalOpen(false);
        setEditingItem(null);
        clearErrors();
    };

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (editingItem) {
            put(`/voucher/${encodeURIComponent(editingItem.nomor_voucher)}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setFormModalOpen(false);
                    setEditingItem(null);
                },
            });
            return;
        }

        post('/voucher', {
            preserveScroll: true,
            onSuccess: () => {
                setFormModalOpen(false);
                reset();
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget || deleting) {
            return;
        }

        setDeleting(true);
        router.delete(
            `/voucher/${encodeURIComponent(deleteTarget.nomor_voucher)}`,
            {
                preserveScroll: true,
                onFinish: () => {
                    setDeleting(false);
                    setDeleteTarget(null);
                },
            },
        );
    };

    const hasActiveFilters = filters.search !== '' || (filters.status ?? '') !== '';

    return (
        <AppLayout
            title="Master Voucher"
            subtitle="Kelola kode potongan harga dan pantau status efektif masa berlaku (KK-03)"
            headerActions={
                <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                >
                    + Tambah Voucher
                </button>
            }
        >
            <Head title="Master Voucher" />

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <form
                    onSubmit={handleSearchSubmit}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <label htmlFor="search-voucher" className="sr-only">
                            Cari kode voucher
                        </label>
                        <input
                            id="search-voucher"
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari kode voucher (mis. HEMAT10K)..."
                            className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm uppercase text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                    </div>
                    <div className="w-full sm:w-52">
                        <label htmlFor="filter-status-voucher" className="sr-only">
                            Filter status voucher
                        </label>
                        <select
                            id="filter-status-voucher"
                            value={statusFilter}
                            onChange={(event) =>
                                handleStatusChange(
                                    event.target.value as VoucherStatus | '',
                                )
                            }
                            className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        >
                            <option value="">Semua Status</option>
                            <option value="TERSEDIA">Tersedia</option>
                            <option value="SUDAH_DIGUNAKAN">
                                Sudah Digunakan
                            </option>
                            <option value="KEDALUWARSA">Kedaluwarsa</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                            Cari
                        </button>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {voucher.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Data voucher tidak ditemukan"
                            description={
                                hasActiveFilters
                                    ? 'Tidak ada voucher yang sesuai dengan filter pencarian atau status saat ini.'
                                    : 'Belum ada kode voucher terdaftar. Buat voucher promo pertama untuk digunakan di loket.'
                            }
                            actionLabel={
                                hasActiveFilters
                                    ? 'Reset Filter'
                                    : '+ Tambah Voucher'
                            }
                            onAction={
                                hasActiveFilters
                                    ? handleResetFilters
                                    : openCreateModal
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3.5">
                                            Kode Voucher
                                        </th>
                                        <th className="px-5 py-3.5 text-right">
                                            Nilai Potongan
                                        </th>
                                        <th className="px-5 py-3.5">
                                            Masa Berlaku
                                        </th>
                                        <th className="px-5 py-3.5">
                                            Status Efektif
                                        </th>
                                        <th className="px-5 py-3.5">
                                            Digunakan Pada
                                        </th>
                                        <th className="px-5 py-3.5 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {voucher.data.map((item) => {
                                        const isUsed =
                                            item.status_penggunaan ===
                                            'SUDAH_DIGUNAKAN';
                                        const isStaleExpired =
                                            item.status_penggunaan ===
                                                'TERSEDIA' &&
                                            item.effective_status ===
                                                'KEDALUWARSA';

                                        return (
                                            <tr
                                                key={item.nomor_voucher}
                                                className="hover:bg-slate-50/70"
                                            >
                                                <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm font-bold text-slate-900">
                                                    {item.nomor_voucher}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                                                    {formatRupiah(item.nilai)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700">
                                                    {formatTanggal(
                                                        item.masa_berlaku,
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <VoucherStatusBadge
                                                            status={
                                                                item.effective_status
                                                            }
                                                        />
                                                        {isStaleExpired && (
                                                            <span className="text-[11px] text-rose-600">
                                                                Melewati batas
                                                                masa berlaku
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-500">
                                                    {item.digunakan_pada
                                                        ? formatTanggal(
                                                              item.digunakan_pada,
                                                              {
                                                                  withTime: true,
                                                              },
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isUsed}
                                                            title={
                                                                isUsed
                                                                    ? 'Voucher yang sudah digunakan tidak dapat diubah'
                                                                    : 'Edit voucher'
                                                            }
                                                            onClick={() =>
                                                                openEditModal(
                                                                    item,
                                                                )
                                                            }
                                                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isUsed}
                                                            title={
                                                                isUsed
                                                                    ? 'Voucher yang sudah digunakan tidak dapat dihapus'
                                                                    : 'Hapus voucher'
                                                            }
                                                            onClick={() =>
                                                                setDeleteTarget(
                                                                    item,
                                                                )
                                                            }
                                                            className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination paginated={voucher} itemLabel="voucher" />
                    </>
                )}
            </section>

            {/* Add/Edit Modal */}
            <Modal
                open={formModalOpen}
                onClose={closeFormModal}
                closeDisabled={processing}
                maxWidth="md"
                title={
                    editingItem
                        ? `Edit Voucher ${editingItem.nomor_voucher}`
                        : 'Tambah Voucher Baru'
                }
                subtitle="Kode voucher dinormalisasi menjadi huruf kapital (huruf/angka/-/_)."
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {(errors as Record<string, string | undefined>).voucher && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                        >
                            {
                                (errors as Record<string, string | undefined>)
                                    .voucher
                            }
                        </div>
                    )}
                    <div>
                        <label
                            htmlFor="voucher-kode"
                            className="block text-xs font-semibold text-slate-700"
                        >
                            Nomor / Kode Voucher
                        </label>
                        <input
                            id="voucher-kode"
                            type="text"
                            required
                            maxLength={50}
                            disabled={editingItem !== null}
                            value={data.nomor_voucher}
                            onChange={(event) =>
                                setData(
                                    'nomor_voucher',
                                    event.target.value.toUpperCase(),
                                )
                            }
                            placeholder="mis. HEMAT10K"
                            className={`mt-1 block w-full rounded-xl border px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 ${
                                editingItem
                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                                    : 'border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-sky-200'
                            }`}
                        />
                        {errors.nomor_voucher && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errors.nomor_voucher}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="voucher-nilai"
                            className="block text-xs font-semibold text-slate-700"
                        >
                            Nilai Potongan (Rp)
                        </label>
                        <input
                            id="voucher-nilai"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={data.nilai}
                            onChange={(event) =>
                                setData('nilai', event.target.value)
                            }
                            placeholder="mis. 10000"
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        {errors.nilai && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errors.nilai}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="voucher-masa-berlaku"
                            className="block text-xs font-semibold text-slate-700"
                        >
                            Masa Berlaku (Tanggal Terakhir Berlaku)
                        </label>
                        <input
                            id="voucher-masa-berlaku"
                            type="date"
                            required
                            value={data.masa_berlaku}
                            onChange={(event) =>
                                setData('masa_berlaku', event.target.value)
                            }
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        {errors.masa_berlaku && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errors.masa_berlaku}
                            </p>
                        )}
                    </div>

                    {editingItem && (
                        <div>
                            <label
                                htmlFor="voucher-status"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Status Penggunaan
                            </label>
                            <select
                                id="voucher-status"
                                value={data.status_penggunaan}
                                onChange={(event) =>
                                    setData(
                                        'status_penggunaan',
                                        event.target.value as
                                            | 'TERSEDIA'
                                            | 'KEDALUWARSA',
                                    )
                                }
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="TERSEDIA">TERSEDIA</option>
                                <option value="KEDALUWARSA">KEDALUWARSA</option>
                            </select>
                            {errors.status_penggunaan && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errors.status_penggunaan}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={closeFormModal}
                            disabled={processing}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 disabled:opacity-60"
                        >
                            {processing
                                ? 'Menyimpan...'
                                : editingItem
                                  ? 'Simpan Perubahan'
                                  : 'Simpan Voucher'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                open={deleteTarget !== null}
                onClose={() => !deleting && setDeleteTarget(null)}
                closeDisabled={deleting}
                maxWidth="md"
                title="Konfirmasi Hapus Voucher"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(null)}
                            disabled={deleting}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                            {deleting ? 'Menghapus...' : 'Ya, Hapus Voucher'}
                        </button>
                    </>
                }
            >
                {deleteTarget && (
                    <p className="text-sm text-slate-700">
                        Apakah Anda yakin ingin menghapus voucher{' '}
                        <span className="font-mono font-bold text-slate-900">
                            {deleteTarget.nomor_voucher}
                        </span>{' '}
                        senilai {formatRupiah(deleteTarget.nilai)}?
                    </p>
                )}
            </Modal>
        </AppLayout>
    );
}
