import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar, {
    FILTER_SELECT_CLASS,
} from '@/Components/FilterToolbar';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import { VoucherStatusBadge } from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import { formatRupiah, formatTanggal } from '@/lib/format';
import type { VoucherIndexProps, VoucherItem, VoucherStatus } from '@/types';

export default function VoucherIndex({ voucher, filters }: VoucherIndexProps) {
    const tableCaptionId = useId();
    const formId = useId();
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
                    className="inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59]"
                >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                        <span className="sr-only">+ </span>Tambah Voucher
                    </span>
                </button>
            }
        >
            <Head title="Master Voucher" />

            <FilterToolbar
                ariaLabel="Filter daftar voucher"
                onSubmit={handleSearchSubmit}
                searchValue={search}
                onSearchChange={setSearch}
                searchId="search-voucher"
                searchLabel="Cari kode voucher"
                searchPlaceholder="Cari kode voucher (mis. HEMAT10K)..."
                submitLabel="Cari"
                onReset={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
            >
                <div className="w-full sm:w-52 lg:shrink-0">
                    <label
                        htmlFor="filter-status-voucher"
                        className="block text-xs font-semibold text-[#475569]"
                    >
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
                        className={FILTER_SELECT_CLASS}
                    >
                        <option value="">Semua Status</option>
                        <option value="TERSEDIA">Tersedia</option>
                        <option value="SUDAH_DIGUNAKAN">Sudah Digunakan</option>
                        <option value="KEDALUWARSA">Kedaluwarsa</option>
                    </select>
                </div>
            </FilterToolbar>

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
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
                        <div
                            tabIndex={0}
                            role="region"
                            aria-labelledby={tableCaptionId}
                            className="overflow-x-auto"
                        >
                            <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                                <caption
                                    id={tableCaptionId}
                                    className="sr-only"
                                >
                                    Daftar master kode voucher dan status
                                    efektif masa berlakunya
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                                    <tr>
                                        <th scope="col" className="px-5 py-3.5">
                                            Kode Voucher
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Nilai Potongan
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Masa Berlaku
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Status Efektif
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Digunakan Pada
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D8E2E6] bg-white">
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
                                                className="transition hover:bg-[#F8FAFC]"
                                            >
                                                <th
                                                    scope="row"
                                                    className="whitespace-nowrap px-5 py-3.5 text-left font-mono text-sm font-bold text-[#0F172A]"
                                                >
                                                    {item.nomor_voucher}
                                                </th>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                                                    {formatRupiah(item.nilai)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#475569]">
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
                                                            <span className="text-[11px] font-medium text-[#9F1239]">
                                                                Melewati batas
                                                                masa berlaku
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#5B697A]">
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
                                                            className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-xl border border-[#7C8C9D] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Pencil
                                                                className="h-3.5 w-3.5 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>Edit</span>
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
                                                            className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-[#9F1239] transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Trash2
                                                                className="h-3.5 w-3.5 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>Hapus</span>
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
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeFormModal}
                            disabled={processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form={formId}
                            disabled={processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59] disabled:opacity-60"
                        >
                            {processing
                                ? 'Menyimpan...'
                                : editingItem
                                  ? 'Simpan Perubahan'
                                  : 'Simpan Voucher'}
                        </button>
                    </>
                }
            >
                <form
                    id={formId}
                    onSubmit={handleFormSubmit}
                    className="space-y-4"
                >
                    {(errors as Record<string, string | undefined>).voucher && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3.5 py-2.5 text-xs font-medium text-[#9F1239]"
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
                            className="block text-xs font-semibold text-[#0F172A]"
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
                            className={`mt-1.5 block min-h-[2.625rem] w-full rounded-xl border px-3.5 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 ${
                                editingItem
                                    ? 'cursor-not-allowed border-[#D8E2E6] bg-[#EEF2F5] text-[#5B697A]'
                                    : 'border-[#7C8C9D] bg-white text-[#0F172A] placeholder:text-[#5B697A] focus:border-[#0F766E] focus:ring-[#0F766E]/20'
                            }`}
                        />
                        {errors.nomor_voucher && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                                {errors.nomor_voucher}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="voucher-nilai"
                            className="block text-xs font-semibold text-[#0F172A]"
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
                            className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-[#0F172A] placeholder:text-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                        />
                        {errors.nilai && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                                {errors.nilai}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="voucher-masa-berlaku"
                            className="block text-xs font-semibold text-[#0F172A]"
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
                            className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                        />
                        {errors.masa_berlaku && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                                {errors.masa_berlaku}
                            </p>
                        )}
                    </div>

                    {editingItem && (
                        <div>
                            <label
                                htmlFor="voucher-status"
                                className="block text-xs font-semibold text-[#0F172A]"
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
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            >
                                <option value="TERSEDIA">TERSEDIA</option>
                                <option value="KEDALUWARSA">KEDALUWARSA</option>
                            </select>
                            {errors.status_penggunaan && (
                                <p className="mt-1.5 text-xs font-medium text-rose-600">
                                    {errors.status_penggunaan}
                                </p>
                            )}
                        </div>
                    )}
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
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-[#BE123C] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-800 disabled:opacity-60"
                        >
                            {deleting ? 'Menghapus...' : 'Ya, Hapus Voucher'}
                        </button>
                    </>
                }
            >
                {deleteTarget && (
                    <p className="text-sm text-[#475569]">
                        Apakah Anda yakin ingin menghapus voucher{' '}
                        <span className="font-mono font-bold text-[#0F172A]">
                            {deleteTarget.nomor_voucher}
                        </span>{' '}
                        senilai{' '}
                        <span className="font-mono font-semibold text-[#0F172A]">
                            {formatRupiah(deleteTarget.nilai)}
                        </span>
                        ?
                    </p>
                )}
            </Modal>
        </AppLayout>
    );
}
