import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar from '@/Components/FilterToolbar';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import { PayLaterBadge } from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import type { PelangganIndexProps, PelangganItem } from '@/types';

export default function PelangganIndex({
    pelanggan,
    filters,
}: PelangganIndexProps) {
    const tableCaptionId = useId();
    const [search, setSearch] = useState(filters.search ?? '');
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PelangganItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PelangganItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data, setData, post, put, processing, errors, clearErrors, reset } =
        useForm({
            nama: '',
            no_telepon: '',
            alamat: '',
            boleh_bayar_akhir: false,
        });

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            '/pelanggan',
            { search: search.trim() || undefined },
            { preserveState: true, replace: true },
        );
    };

    const handleResetSearch = () => {
        setSearch('');
        router.get('/pelanggan', {}, { preserveState: true, replace: true });
    };

    const openCreateModal = () => {
        setEditingItem(null);
        clearErrors();
        reset();
        setData({
            nama: '',
            no_telepon: '',
            alamat: '',
            boleh_bayar_akhir: false,
        });
        setFormModalOpen(true);
    };

    const openEditModal = (item: PelangganItem) => {
        setEditingItem(item);
        clearErrors();
        setData({
            nama: item.nama,
            no_telepon: item.no_telepon,
            alamat: item.alamat,
            boleh_bayar_akhir: item.boleh_bayar_akhir,
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
            put(`/pelanggan/${editingItem.id_pelanggan}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setFormModalOpen(false);
                    setEditingItem(null);
                },
            });
            return;
        }

        post('/pelanggan', {
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
        router.delete(`/pelanggan/${deleteTarget.id_pelanggan}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <AppLayout
            title="Master Pelanggan"
            subtitle="Kelola data pelanggan dan hak pembayaran akhir (KK-06)"
            headerActions={
                <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                        <span className="sr-only">+ </span>Tambah Pelanggan
                    </span>
                </button>
            }
        >
            <Head title="Master Pelanggan" />

            <FilterToolbar
                ariaLabel="Cari data pelanggan"
                onSubmit={handleSearchSubmit}
                searchValue={search}
                onSearchChange={setSearch}
                searchId="search-pelanggan"
                searchLabel="Cari pelanggan"
                searchPlaceholder="Cari nama atau nomor telepon pelanggan..."
                submitLabel="Cari"
                onReset={handleResetSearch}
                hasActiveFilters={filters.search !== ''}
            />

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                {pelanggan.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Data pelanggan belum ditemukan"
                            description={
                                filters.search
                                    ? `Tidak ada pelanggan yang cocok dengan pencarian "${filters.search}".`
                                    : 'Belum ada data pelanggan. Tambahkan pelanggan pertama untuk mulai membuat transaksi.'
                            }
                            actionLabel={
                                filters.search
                                    ? 'Reset Pencarian'
                                    : '+ Tambah Pelanggan'
                            }
                            onAction={
                                filters.search
                                    ? handleResetSearch
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
                                    Daftar master pelanggan CleanWash beserta
                                    status hak bayar akhir
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                                    <tr>
                                        <th scope="col" className="px-5 py-3.5">
                                            Nama
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            No. Telepon
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Alamat
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Hak Bayar Akhir
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Transaksi
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
                                    {pelanggan.data.map((item) => (
                                        <tr
                                            key={item.id_pelanggan}
                                            className="transition hover:bg-[#F8FAFC]"
                                        >
                                            <th
                                                scope="row"
                                                className="px-5 py-3.5 text-left font-semibold text-[#0F172A]"
                                            >
                                                {item.nama}
                                            </th>
                                            <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[#475569]">
                                                {item.no_telepon}
                                            </td>
                                            <td className="max-w-xs px-5 py-3.5 text-xs text-[#475569]">
                                                <p className="line-clamp-2">
                                                    {item.alamat}
                                                </p>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                <PayLaterBadge
                                                    allowed={
                                                        item.boleh_bayar_akhir
                                                    }
                                                    variant="text"
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-xs font-semibold tabular-nums text-[#0F172A]">
                                                {item.transaksi_count ?? 0}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(item)
                                                        }
                                                        className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-xl border border-[#7C8C9D] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                                                    >
                                                        <Pencil
                                                            className="h-3.5 w-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                item,
                                                            )
                                                        }
                                                        className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-[#9F1239] transition hover:bg-rose-100"
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            paginated={pelanggan}
                            itemLabel="pelanggan"
                        />
                    </>
                )}
            </section>

            {/* Add/Edit Modal */}
            <Modal
                open={formModalOpen}
                onClose={closeFormModal}
                closeDisabled={processing}
                title={editingItem ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
                subtitle="Pastikan nomor telepon unik untuk setiap pelanggan."
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
                            form="pelanggan-form"
                            disabled={processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8] disabled:opacity-60"
                        >
                            {processing
                                ? 'Menyimpan...'
                                : editingItem
                                  ? 'Simpan Perubahan'
                                  : 'Simpan Pelanggan'}
                        </button>
                    </>
                }
            >
                <form
                    id="pelanggan-form"
                    onSubmit={handleFormSubmit}
                    className="space-y-4"
                >
                    <div>
                        <label
                            htmlFor="pelanggan-nama"
                            className="block text-xs font-semibold text-[#0F172A]"
                        >
                            Nama Pelanggan
                        </label>
                        <input
                            id="pelanggan-nama"
                            type="text"
                            required
                            maxLength={120}
                            value={data.nama}
                            onChange={(event) =>
                                setData('nama', event.target.value)
                            }
                            placeholder="mis. Siti Aminah"
                            className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder:text-[#5B697A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        />
                        {errors.nama && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                                {errors.nama}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="pelanggan-telepon"
                            className="block text-xs font-semibold text-[#0F172A]"
                        >
                            Nomor Telepon
                        </label>
                        <input
                            id="pelanggan-telepon"
                            type="text"
                            required
                            maxLength={25}
                            value={data.no_telepon}
                            onChange={(event) =>
                                setData('no_telepon', event.target.value)
                            }
                            placeholder="mis. 081234567890"
                            className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm text-[#0F172A] placeholder:text-[#5B697A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        />
                        {errors.no_telepon && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                                {errors.no_telepon}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="pelanggan-alamat"
                            className="block text-xs font-semibold text-[#0F172A]"
                        >
                            Alamat Lengkap
                        </label>
                        <textarea
                            id="pelanggan-alamat"
                            required
                            rows={3}
                            maxLength={1000}
                            value={data.alamat}
                            onChange={(event) =>
                                setData('alamat', event.target.value)
                            }
                            placeholder="Alamat pengantaran / domisili pelanggan"
                            className="mt-1.5 block min-h-[5.5rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder:text-[#5B697A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        />
                        {errors.alamat && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                                {errors.alamat}
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5">
                        <label
                            htmlFor="pelanggan-bayar-akhir"
                            className="flex cursor-pointer items-start gap-3"
                        >
                            <input
                                id="pelanggan-bayar-akhir"
                                type="checkbox"
                                checked={data.boleh_bayar_akhir}
                                onChange={(event) =>
                                    setData(
                                        'boleh_bayar_akhir',
                                        event.target.checked,
                                    )
                                }
                                className="mt-0.5 h-4 w-4 rounded border-[#7C8C9D] accent-[#2563EB]"
                            />
                            <div>
                                <span className="block text-xs font-semibold text-[#0F172A]">
                                    Izinkan Bayar Akhir (boleh_bayar_akhir)
                                </span>
                                <span className="mt-0.5 block text-[11px] leading-relaxed text-[#475569]">
                                    Pelanggan terverifikasi dapat mengambil
                                    pakaian sebelum pelunasan penuh dan dicatat
                                    sebagai piutang (KK-06).
                                </span>
                            </div>
                        </label>
                        {errors.boleh_bayar_akhir && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                                {errors.boleh_bayar_akhir}
                            </p>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                open={deleteTarget !== null}
                onClose={() => !deleting && setDeleteTarget(null)}
                closeDisabled={deleting}
                maxWidth="md"
                title="Konfirmasi Hapus Pelanggan"
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
                            {deleting ? 'Menghapus...' : 'Ya, Hapus Pelanggan'}
                        </button>
                    </>
                }
            >
                {deleteTarget && (
                    <div className="space-y-3 text-sm text-[#475569]">
                        <p>
                            Apakah Anda yakin ingin menghapus pelanggan{' '}
                            <span className="font-semibold text-[#0F172A]">
                                {deleteTarget.nama}
                            </span>{' '}
                            (
                            <span className="font-mono">
                                {deleteTarget.no_telepon}
                            </span>
                            )?
                        </p>
                        {(deleteTarget.transaksi_count ?? 0) > 0 && (
                            <div className="rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] p-3 text-xs text-[#78350F]">
                                Pelanggan ini tercatat memiliki{' '}
                                <span className="font-semibold tabular-nums">
                                    {deleteTarget.transaksi_count} transaksi
                                </span>
                                . Penghapusan akan ditolak oleh sistem untuk
                                menjaga integritas riwayat nota.
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </AppLayout>
    );
}
