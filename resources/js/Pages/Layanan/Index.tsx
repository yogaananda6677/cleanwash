import { Head, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import {
    ProductionStageBadge,
    SpeedTierBadge,
    StatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import { formatRupiah } from '@/lib/format';
import type {
    JenisLayananItem,
    LayananIndexProps,
    MetodeHitung,
    SatuanLayanan,
    TahapProduksiCode,
    TingkatKecepatan,
} from '@/types';

const INTERMEDIATE_STAGES: TahapProduksiCode[] = [
    'DICUCI',
    'DIKERINGKAN',
    'DISETRIKA',
];

function resolveCanonicalStages(perluSetrika: boolean): TahapProduksiCode[] {
    return perluSetrika
        ? ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI']
        : ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'];
}

function resolveSatuan(metode: MetodeHitung): SatuanLayanan {
    return metode === 'BERAT' ? 'kg' : 'pcs';
}

export default function LayananIndex({ layanan, filters }: LayananIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<JenisLayananItem | null>(
        null,
    );
    const [deleteTarget, setDeleteTarget] = useState<JenisLayananItem | null>(
        null,
    );
    const [deleting, setDeleting] = useState(false);

    const { data, setData, post, put, processing, errors, clearErrors, reset } =
        useForm<{
            nama_layanan: string;
            tingkat_kecepatan: TingkatKecepatan;
            metode_hitung: MetodeHitung;
            satuan: SatuanLayanan;
            harga_satuan: string;
            perlu_setrika: boolean;
            is_active: boolean;
            tahap_layanan: TahapProduksiCode[];
        }>({
            nama_layanan: '',
            tingkat_kecepatan: 'REGULER',
            metode_hitung: 'BERAT',
            satuan: 'kg',
            harga_satuan: '',
            perlu_setrika: true,
            is_active: true,
            tahap_layanan: resolveCanonicalStages(true),
        });

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            '/layanan',
            { search: search.trim() || undefined },
            { preserveState: true, replace: true },
        );
    };

    const handleResetSearch = () => {
        setSearch('');
        router.get('/layanan', {}, { preserveState: true, replace: true });
    };

    const openCreateModal = () => {
        setEditingItem(null);
        clearErrors();
        reset();
        setData({
            nama_layanan: '',
            tingkat_kecepatan: 'REGULER',
            metode_hitung: 'BERAT',
            satuan: 'kg',
            harga_satuan: '',
            perlu_setrika: true,
            is_active: true,
            tahap_layanan: resolveCanonicalStages(true),
        });
        setFormModalOpen(true);
    };

    const openEditModal = (item: JenisLayananItem) => {
        setEditingItem(item);
        clearErrors();
        const itemStages =
            item.tahap_layanan.length >= 2
                ? item.tahap_layanan
                      .slice()
                      .sort((a, b) => a.urutan - b.urutan)
                      .map((stage) => stage.nama_tahap)
                : resolveCanonicalStages(item.perlu_setrika);

        setData({
            nama_layanan: item.nama_layanan,
            tingkat_kecepatan: item.tingkat_kecepatan,
            metode_hitung: item.metode_hitung,
            satuan: resolveSatuan(item.metode_hitung),
            harga_satuan: item.harga_satuan,
            perlu_setrika: item.perlu_setrika,
            is_active: item.is_active,
            tahap_layanan: item.perlu_setrika
                ? itemStages
                : itemStages.filter((stage) => stage !== 'DISETRIKA'),
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

    const handleMetodeChange = (nextMetode: MetodeHitung) => {
        setData((prev) => ({
            ...prev,
            metode_hitung: nextMetode,
            satuan: resolveSatuan(nextMetode),
        }));
    };

    const handlePerluSetrikaChange = (checked: boolean) => {
        setData((prev) => ({
            ...prev,
            perlu_setrika: checked,
            tahap_layanan: resolveCanonicalStages(checked),
        }));
    };

    const handleToggleStage = (stage: TahapProduksiCode) => {
        if (stage === 'DITERIMA' || stage === 'SELESAI') {
            return;
        }

        if (stage === 'DISETRIKA' && !data.perlu_setrika) {
            return;
        }

        const availableOrder: TahapProduksiCode[] = data.perlu_setrika
            ? ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI']
            : ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'];

        const nextSet = new Set(data.tahap_layanan);
        if (nextSet.has(stage)) {
            nextSet.delete(stage);
        } else {
            nextSet.add(stage);
        }
        nextSet.add('DITERIMA');
        nextSet.add('SELESAI');

        setData(
            'tahap_layanan',
            availableOrder.filter((item) => nextSet.has(item)),
        );
    };

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (editingItem) {
            put(`/layanan/${editingItem.id_layanan}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setFormModalOpen(false);
                    setEditingItem(null);
                },
            });
            return;
        }

        post('/layanan', {
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
        router.delete(`/layanan/${deleteTarget.id_layanan}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <AppLayout
            title="Master Jenis Layanan"
            subtitle="Atur tarif kg/pcs, tingkat kecepatan, serta urutan tahap produksi per layanan"
            headerActions={
                <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                >
                    + Tambah Layanan
                </button>
            }
        >
            <Head title="Master Jenis Layanan" />

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <form
                    onSubmit={handleSearchSubmit}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <label htmlFor="search-layanan" className="sr-only">
                            Cari layanan
                        </label>
                        <input
                            id="search-layanan"
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama layanan atau kecepatan (REGULER / EXPRESS)..."
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
                {layanan.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Jenis layanan belum ditemukan"
                            description={
                                filters.search
                                    ? `Tidak ada layanan yang cocok dengan kata kunci "${filters.search}".`
                                    : 'Tambahkan layanan laundry (mis. Cuci Setrika kg atau Cuci Sepatu pcs).'
                            }
                            actionLabel={
                                filters.search
                                    ? 'Reset Pencarian'
                                    : '+ Tambah Layanan'
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
                                        <th className="px-5 py-3.5">Layanan</th>
                                        <th className="px-5 py-3.5">
                                            Kecepatan
                                        </th>
                                        <th className="px-5 py-3.5">
                                            Metode & Satuan
                                        </th>
                                        <th className="px-5 py-3.5 text-right">
                                            Harga Satuan
                                        </th>
                                        <th className="px-5 py-3.5">
                                            Setrika
                                        </th>
                                        <th className="px-5 py-3.5">
                                            Urutan Tahap Produksi
                                        </th>
                                        <th className="px-5 py-3.5 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {layanan.data.map((item) => (
                                        <tr
                                            key={item.id_layanan}
                                            className="hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold text-slate-900">
                                                        {item.nama_layanan}
                                                    </span>
                                                    <div>
                                                        {item.is_active ? (
                                                            <StatusBadge tone="emerald">
                                                                Aktif
                                                            </StatusBadge>
                                                        ) : (
                                                            <StatusBadge tone="slate">
                                                                Nonaktif
                                                            </StatusBadge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                <SpeedTierBadge
                                                    tier={
                                                        item.tingkat_kecepatan
                                                    }
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700">
                                                {item.metode_hitung} (
                                                <span className="font-semibold">
                                                    {item.satuan}
                                                </span>
                                                )
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                                                {formatRupiah(
                                                    item.harga_satuan,
                                                )}
                                                <span className="text-xs font-normal text-slate-500">
                                                    /{item.satuan}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                {item.perlu_setrika ? (
                                                    <StatusBadge tone="sky">
                                                        Perlu Setrika
                                                    </StatusBadge>
                                                ) : (
                                                    <StatusBadge tone="amber">
                                                        Tanpa Setrika
                                                    </StatusBadge>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {item.tahap_layanan.map(
                                                        (tahap) => (
                                                            <ProductionStageBadge
                                                                key={
                                                                    tahap.id_tahap
                                                                }
                                                                stage={
                                                                    tahap.nama_tahap
                                                                }
                                                                order={
                                                                    tahap.urutan
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </div>
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
                        <Pagination paginated={layanan} itemLabel="layanan" />
                    </>
                )}
            </section>

            {/* Add/Edit Modal */}
            <Modal
                open={formModalOpen}
                onClose={closeFormModal}
                closeDisabled={processing}
                maxWidth="xl"
                title={
                    editingItem
                        ? 'Edit Jenis Layanan'
                        : 'Tambah Jenis Layanan Baru'
                }
                subtitle="Perubahan harga layanan tidak memengaruhi nota transaksi lama (KK-09)."
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {(errors as Record<string, string | undefined>).layanan && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                        >
                            {
                                (errors as Record<string, string | undefined>)
                                    .layanan
                            }
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="layanan-nama"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Nama Layanan
                            </label>
                            <input
                                id="layanan-nama"
                                type="text"
                                required
                                maxLength={100}
                                value={data.nama_layanan}
                                onChange={(event) =>
                                    setData('nama_layanan', event.target.value)
                                }
                                placeholder="mis. Cuci Setrika / Cuci Sepatu"
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {errors.nama_layanan && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errors.nama_layanan}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="layanan-kecepatan"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Tingkat Kecepatan
                            </label>
                            <select
                                id="layanan-kecepatan"
                                value={data.tingkat_kecepatan}
                                onChange={(event) =>
                                    setData(
                                        'tingkat_kecepatan',
                                        event.target.value as TingkatKecepatan,
                                    )
                                }
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="REGULER">REGULER</option>
                                <option value="EXPRESS">EXPRESS</option>
                            </select>
                            {errors.tingkat_kecepatan && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errors.tingkat_kecepatan}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label
                                htmlFor="layanan-metode"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Metode Hitung
                            </label>
                            <select
                                id="layanan-metode"
                                value={data.metode_hitung}
                                onChange={(event) =>
                                    handleMetodeChange(
                                        event.target.value as MetodeHitung,
                                    )
                                }
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="BERAT">BERAT (kg)</option>
                                <option value="JUMLAH">JUMLAH (pcs)</option>
                            </select>
                            {errors.metode_hitung && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errors.metode_hitung}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="layanan-satuan"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Satuan (Otomatis)
                            </label>
                            <input
                                id="layanan-satuan"
                                type="text"
                                readOnly
                                value={data.satuan}
                                className="mt-1 block w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                            />
                            {errors.satuan && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errors.satuan}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="layanan-harga"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Harga Satuan (Rp)
                            </label>
                            <input
                                id="layanan-harga"
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={data.harga_satuan}
                                onChange={(event) =>
                                    setData('harga_satuan', event.target.value)
                                }
                                placeholder="mis. 8000"
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {errors.harga_satuan && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errors.harga_satuan}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label
                            htmlFor="layanan-setrika"
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                        >
                            <input
                                id="layanan-setrika"
                                type="checkbox"
                                checked={data.perlu_setrika}
                                onChange={(event) =>
                                    handlePerluSetrikaChange(
                                        event.target.checked,
                                    )
                                }
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <div>
                                <span className="block text-xs font-semibold text-slate-900">
                                    Perlu Tahap Setrika
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-500">
                                    Nonaktifkan untuk layanan seperti Cuci Sepatu
                                    (tahap DISETRIKA dilarang).
                                </span>
                            </div>
                        </label>

                        <label
                            htmlFor="layanan-aktif"
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                        >
                            <input
                                id="layanan-aktif"
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(event) =>
                                    setData('is_active', event.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <div>
                                <span className="block text-xs font-semibold text-slate-900">
                                    Layanan Aktif
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-500">
                                    Hanya layanan aktif yang dapat dipilih pada
                                    form penerimaan nota baru.
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800">
                                Preview Alur Tahap Produksi
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    setData(
                                        'tahap_layanan',
                                        resolveCanonicalStages(
                                            data.perlu_setrika,
                                        ),
                                    )
                                }
                                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                            >
                                Reset Urutan Standar
                            </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {data.tahap_layanan.map((stage, index) => (
                                <ProductionStageBadge
                                    key={stage}
                                    stage={stage}
                                    order={index + 1}
                                />
                            ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
                            <span className="text-[11px] font-medium text-slate-500">
                                Tahap opsional tengah:
                            </span>
                            {INTERMEDIATE_STAGES.map((stage) => {
                                const disabled =
                                    stage === 'DISETRIKA' &&
                                    !data.perlu_setrika;
                                const checked =
                                    data.tahap_layanan.includes(stage);

                                return (
                                    <label
                                        key={stage}
                                        className={`inline-flex items-center gap-1.5 text-xs ${
                                            disabled
                                                ? 'cursor-not-allowed text-slate-400 line-through'
                                                : 'cursor-pointer text-slate-700'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            disabled={disabled}
                                            checked={checked}
                                            onChange={() =>
                                                handleToggleStage(stage)
                                            }
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600"
                                        />
                                        <span>{stage}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.tahap_layanan && (
                            <p className="mt-2 text-xs font-medium text-rose-600">
                                {errors.tahap_layanan}
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
                                  : 'Simpan Layanan'}
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
                title="Konfirmasi Hapus Layanan"
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
                            {deleting ? 'Menghapus...' : 'Ya, Hapus Layanan'}
                        </button>
                    </>
                }
            >
                {deleteTarget && (
                    <div className="space-y-3 text-sm text-slate-700">
                        <p>
                            Apakah Anda yakin ingin menghapus layanan{' '}
                            <span className="font-semibold text-slate-900">
                                {deleteTarget.nama_layanan} (
                                {deleteTarget.tingkat_kecepatan})
                            </span>
                            ?
                        </p>
                        {(deleteTarget.transaksi_count ?? 0) > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                Layanan ini tercatat digunakan pada{' '}
                                <span className="font-semibold">
                                    {deleteTarget.transaksi_count} transaksi
                                </span>
                                . Sistem akan menolak penghapusan untuk menjaga
                                riwayat transaksi (pertimbangkan menonaktifkan
                                status Aktif).
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </AppLayout>
    );
}
