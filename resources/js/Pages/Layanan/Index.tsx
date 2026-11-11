import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    MinusCircle,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { Fragment, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar from '@/Components/FilterToolbar';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import {
    SpeedTierBadge,
    StatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import { formatRupiah, formatTahapProduksi } from '@/lib/format';
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
    const tableCaptionId = useId();
    const formId = useId();
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
                    className="inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59]"
                >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                        <span className="sr-only">+ </span>Tambah Layanan
                    </span>
                </button>
            }
        >
            <Head title="Master Jenis Layanan" />

            <FilterToolbar
                ariaLabel="Cari jenis layanan"
                onSubmit={handleSearchSubmit}
                searchValue={search}
                onSearchChange={setSearch}
                searchId="search-layanan"
                searchLabel="Cari layanan"
                searchPlaceholder="Cari nama layanan atau kecepatan (REGULER / EXPRESS)..."
                submitLabel="Cari"
                onReset={handleResetSearch}
                hasActiveFilters={filters.search !== ''}
            />

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
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
                                    Daftar master jenis layanan laundry beserta
                                    tarif, opsi setrika, dan urutan tahap
                                    produksi
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                                    <tr>
                                        <th scope="col" className="px-5 py-3.5">
                                            Layanan
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Kecepatan
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Metode &amp; Satuan
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Harga Satuan
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Setrika
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Urutan Tahap Produksi
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
                                    {layanan.data.map((item) => {
                                        const sortedStages = item.tahap_layanan
                                            .slice()
                                            .sort(
                                                (a, b) => a.urutan - b.urutan,
                                            );

                                        return (
                                            <tr
                                                key={item.id_layanan}
                                                className="align-top transition hover:bg-[#F8FAFC]"
                                            >
                                                <th
                                                    scope="row"
                                                    className="px-5 py-3.5 text-left font-normal"
                                                >
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-semibold text-[#0F172A]">
                                                            {item.nama_layanan}
                                                        </span>
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
                                                </th>
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <SpeedTierBadge
                                                        tier={
                                                            item.tingkat_kecepatan
                                                        }
                                                        variant="text"
                                                    />
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-[#475569]">
                                                    {item.metode_hitung} (
                                                    <span className="font-mono font-semibold text-[#0F172A]">
                                                        {item.satuan}
                                                    </span>
                                                    )
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                                                    {formatRupiah(
                                                        item.harga_satuan,
                                                    )}
                                                    <span className="text-xs font-normal text-[#5B697A]">
                                                        /{item.satuan}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                                                    {item.perlu_setrika ? (
                                                        <span className="inline-flex items-center gap-1.5 font-medium text-[#0F766E]">
                                                            <CheckCircle2
                                                                className="h-3.5 w-3.5 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                Perlu Setrika
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 font-medium text-[#5B697A]">
                                                            <MinusCircle
                                                                className="h-3.5 w-3.5 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                Tanpa Setrika
                                                            </span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#475569]">
                                                        {sortedStages.map(
                                                            (tahap, index) => (
                                                                <Fragment
                                                                    key={
                                                                        tahap.id_tahap
                                                                    }
                                                                >
                                                                    {index >
                                                                        0 && (
                                                                        <li
                                                                            aria-hidden="true"
                                                                            className="text-[#7C8C9D]"
                                                                        >
                                                                            &rarr;
                                                                        </li>
                                                                    )}
                                                                    <li className="whitespace-nowrap">
                                                                        <span className="font-mono text-[11px] text-[#5B697A] tabular-nums">
                                                                            {
                                                                                tahap.urutan
                                                                            }
                                                                            .
                                                                        </span>{' '}
                                                                        <span className="text-[#0F172A]">
                                                                            {formatTahapProduksi(
                                                                                tahap.nama_tahap,
                                                                            )}
                                                                        </span>
                                                                    </li>
                                                                </Fragment>
                                                            ),
                                                        )}
                                                    </ol>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    item,
                                                                )
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
                                        );
                                    })}
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
                                  : 'Simpan Layanan'}
                        </button>
                    </>
                }
            >
                <form
                    id={formId}
                    onSubmit={handleFormSubmit}
                    className="space-y-4"
                >
                    {(errors as Record<string, string | undefined>).layanan && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3.5 py-2.5 text-xs font-medium text-[#9F1239]"
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
                                className="block text-xs font-semibold text-[#0F172A]"
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
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder:text-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            />
                            {errors.nama_layanan && (
                                <p className="mt-1.5 text-xs font-medium text-rose-600">
                                    {errors.nama_layanan}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="layanan-kecepatan"
                                className="block text-xs font-semibold text-[#0F172A]"
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
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            >
                                <option value="REGULER">REGULER</option>
                                <option value="EXPRESS">EXPRESS</option>
                            </select>
                            {errors.tingkat_kecepatan && (
                                <p className="mt-1.5 text-xs font-medium text-rose-600">
                                    {errors.tingkat_kecepatan}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label
                                htmlFor="layanan-metode"
                                className="block text-xs font-semibold text-[#0F172A]"
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
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            >
                                <option value="BERAT">BERAT (kg)</option>
                                <option value="JUMLAH">JUMLAH (pcs)</option>
                            </select>
                            {errors.metode_hitung && (
                                <p className="mt-1.5 text-xs font-medium text-rose-600">
                                    {errors.metode_hitung}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="layanan-satuan"
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Satuan (Otomatis)
                            </label>
                            <input
                                id="layanan-satuan"
                                type="text"
                                readOnly
                                value={data.satuan}
                                className="mt-1.5 block min-h-[2.625rem] w-full cursor-not-allowed rounded-xl border border-[#D8E2E6] bg-[#EEF2F5] px-3.5 py-2 font-mono text-sm font-semibold text-[#475569]"
                            />
                            {errors.satuan && (
                                <p className="mt-1.5 text-xs font-medium text-rose-600">
                                    {errors.satuan}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="layanan-harga"
                                className="block text-xs font-semibold text-[#0F172A]"
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
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-[#0F172A] placeholder:text-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            />
                            {errors.harga_satuan && (
                                <p className="mt-1.5 text-xs font-medium text-rose-600">
                                    {errors.harga_satuan}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label
                            htmlFor="layanan-setrika"
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5"
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
                                className="mt-0.5 h-4 w-4 rounded border-[#7C8C9D] accent-[#0F766E]"
                            />
                            <div>
                                <span className="block text-xs font-semibold text-[#0F172A]">
                                    Perlu Tahap Setrika
                                </span>
                                <span className="mt-0.5 block text-[11px] text-[#475569]">
                                    Nonaktifkan untuk layanan seperti Cuci Sepatu
                                    (tahap DISETRIKA dilarang).
                                </span>
                            </div>
                        </label>

                        <label
                            htmlFor="layanan-aktif"
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5"
                        >
                            <input
                                id="layanan-aktif"
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(event) =>
                                    setData('is_active', event.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-[#7C8C9D] accent-[#0F766E]"
                            />
                            <div>
                                <span className="block text-xs font-semibold text-[#0F172A]">
                                    Layanan Aktif
                                </span>
                                <span className="mt-0.5 block text-[11px] text-[#475569]">
                                    Hanya layanan aktif yang dapat dipilih pada
                                    form penerimaan nota baru.
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#0F172A]">
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
                                className="text-xs font-semibold text-[#0F766E] hover:text-[#115E59] hover:underline"
                            >
                                Reset Urutan Standar
                            </button>
                        </div>

                        <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs font-semibold text-[#0F172A]">
                            {data.tahap_layanan.map((stage, index) => (
                                <Fragment key={stage}>
                                    {index > 0 && (
                                        <li
                                            aria-hidden="true"
                                            className="text-[#7C8C9D]"
                                        >
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </li>
                                    )}
                                    <li className="inline-flex items-center gap-1 rounded-lg border border-[#D8E2E6] bg-white px-2.5 py-1">
                                        <span className="font-mono text-[11px] text-[#0F766E] tabular-nums">
                                            {index + 1}.
                                        </span>
                                        <span>
                                            {formatTahapProduksi(stage)}
                                        </span>
                                    </li>
                                </Fragment>
                            ))}
                        </ol>

                        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#D8E2E6] pt-3">
                            <span className="text-[11px] font-medium text-[#5B697A]">
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
                                                ? 'cursor-not-allowed text-[#5B697A] line-through'
                                                : 'cursor-pointer text-[#0F172A]'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            disabled={disabled}
                                            checked={checked}
                                            onChange={() =>
                                                handleToggleStage(stage)
                                            }
                                            className="h-3.5 w-3.5 rounded border-[#7C8C9D] accent-[#0F766E]"
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
                            {deleting ? 'Menghapus...' : 'Ya, Hapus Layanan'}
                        </button>
                    </>
                }
            >
                {deleteTarget && (
                    <div className="space-y-3 text-sm text-[#475569]">
                        <p>
                            Apakah Anda yakin ingin menghapus layanan{' '}
                            <span className="font-semibold text-[#0F172A]">
                                {deleteTarget.nama_layanan} (
                                {deleteTarget.tingkat_kecepatan})
                            </span>
                            ?
                        </p>
                        {(deleteTarget.transaksi_count ?? 0) > 0 && (
                            <div className="rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] p-3 text-xs text-[#78350F]">
                                Layanan ini tercatat digunakan pada{' '}
                                <span className="font-semibold tabular-nums">
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
