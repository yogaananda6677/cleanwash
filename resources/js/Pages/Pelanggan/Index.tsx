import { Head, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import { PayLaterBadge } from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import type { PelangganIndexProps, PelangganItem } from '@/types';

export default function PelangganIndex({
    pelanggan,
    filters,
}: PelangganIndexProps) {
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                >
                    + Tambah Pelanggan
                </button>
            }
        >
            <Head title="Master Pelanggan" />

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <form
                    onSubmit={handleSearchSubmit}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <label htmlFor="search-pelanggan" className="sr-only">
                            Cari pelanggan
                        </label>
                        <input
                            id="search-pelanggan"
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama atau nomor telepon pelanggan..."
                            className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                            Cari
                        </button>
                        {filters.search !== '' && (
                            <button
                                type="button"
                                onClick={handleResetSearch}
                                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
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
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3.5">Nama</th>
                                        <th className="px-5 py-3.5">
                                            No. Telepon
                                        </th>
                                        <th className="px-5 py-3.5">Alamat</th>
                                        <th className="px-5 py-3.5">
                                            Hak Bayar Akhir
                                        </th>
                                        <th className="px-5 py-3.5 text-right">
                                            Transaksi
                                        </th>
                                        <th className="px-5 py-3.5 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {pelanggan.data.map((item) => (
                                        <tr
                                            key={item.id_pelanggan}
                                            className="hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-3.5 font-semibold text-slate-900">
                                                {item.nama}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-700">
                                                {item.no_telepon}
                                            </td>
                                            <td className="max-w-xs px-5 py-3.5 text-xs text-slate-600">
                                                <p className="line-clamp-2">
                                                    {item.alamat}
                                                </p>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                <PayLaterBadge
                                                    allowed={
                                                        item.boleh_bayar_akhir
                                                    }
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums text-slate-700">
                                                {item.transaksi_count ?? 0}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(item)
                                                        }
                                                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                item,
                                                            )
                                                        }
                                                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                                                    >
                                                        Hapus
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
            >
                <form
                    id="pelanggan-form"
                    onSubmit={handleFormSubmit}
                    className="space-y-4"
                >
                    <div>
                        <label
                            htmlFor="pelanggan-nama"
                            className="block text-xs font-semibold text-slate-700"
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
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        {errors.nama && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errors.nama}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="pelanggan-telepon"
                            className="block text-xs font-semibold text-slate-700"
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
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        {errors.no_telepon && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errors.no_telepon}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="pelanggan-alamat"
                            className="block text-xs font-semibold text-slate-700"
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
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        {errors.alamat && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errors.alamat}
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
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
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <div>
                                <span className="block text-xs font-semibold text-slate-900">
                                    Izinkan Bayar Akhir (boleh_bayar_akhir)
                                </span>
                                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                                    Pelanggan terverifikasi dapat mengambil pakaian
                                    sebelum pelunasan penuh dan dicatat sebagai
                                    piutang (KK-06).
                                </span>
                            </div>
                        </label>
                        {errors.boleh_bayar_akhir && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                                {errors.boleh_bayar_akhir}
                            </p>
                        )}
                    </div>

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
                                  : 'Simpan Pelanggan'}
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
                title="Konfirmasi Hapus Pelanggan"
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
                            {deleting ? 'Menghapus...' : 'Ya, Hapus Pelanggan'}
                        </button>
                    </>
                }
            >
                {deleteTarget && (
                    <div className="space-y-3 text-sm text-slate-700">
                        <p>
                            Apakah Anda yakin ingin menghapus pelanggan{' '}
                            <span className="font-semibold text-slate-900">
                                {deleteTarget.nama}
                            </span>{' '}
                            ({deleteTarget.no_telepon})?
                        </p>
                        {(deleteTarget.transaksi_count ?? 0) > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                Pelanggan ini tercatat memiliki{' '}
                                <span className="font-semibold">
                                    {deleteTarget.transaksi_count} transaksi
                                </span>
                                . Penghapusan akan ditolak oleh sistem untuk menjaga
                                integritas riwayat nota.
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </AppLayout>
    );
}
