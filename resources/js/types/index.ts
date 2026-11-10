export type UserRole = 'PETUGAS' | 'PEGAWAI' | 'PENGANTAR';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    actor_id: number | null;
}

export interface FlashMessages {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
}

export interface SharedPageProps {
    [key: string]: unknown;
    auth: {
        user: AuthUser | null;
    };
    flash: FlashMessages;
    errors: Record<string, string>;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
    links: PaginationLink[];
}

export interface DashboardPetugasSummary {
    role: 'PETUGAS';
    total_pelanggan: number;
    total_layanan_aktif: number;
    total_voucher_tersedia: number;
    transaksi_aktif: number;
    transaksi_belum_lunas: number;
}

export interface DashboardPegawaiSummary {
    role: 'PEGAWAI';
    antrean_aktif: number;
    laporan_insiden_saya: number;
}

export interface DashboardPengantarSummary {
    role: 'PENGANTAR';
    jadwal_pengantaran_aktif: number;
    item_pengantaran_aktif: number;
}

export type DashboardSummary =
    | DashboardPetugasSummary
    | DashboardPegawaiSummary
    | DashboardPengantarSummary;

export interface DashboardIndexProps extends SharedPageProps {
    summary: DashboardSummary;
}

export interface PelangganItem {
    id_pelanggan: number;
    nama: string;
    no_telepon: string;
    alamat: string;
    boleh_bayar_akhir: boolean;
    transaksi_count?: number;
    created_at: string;
    updated_at: string;
}

export interface PelangganIndexProps extends SharedPageProps {
    pelanggan: Paginated<PelangganItem>;
    filters: {
        search: string;
    };
}

export type TingkatKecepatan = 'REGULER' | 'EXPRESS';
export type MetodeHitung = 'BERAT' | 'JUMLAH';
export type SatuanLayanan = 'kg' | 'pcs';
export type TahapProduksiCode =
    | 'DITERIMA'
    | 'DICUCI'
    | 'DIKERINGKAN'
    | 'DISETRIKA'
    | 'SELESAI';

export interface TahapLayananItem {
    id_tahap: number;
    id_layanan: number;
    nama_tahap: TahapProduksiCode;
    urutan: number;
}

export interface JenisLayananItem {
    id_layanan: number;
    nama_layanan: string;
    tingkat_kecepatan: TingkatKecepatan;
    metode_hitung: MetodeHitung;
    satuan: SatuanLayanan;
    harga_satuan: string;
    perlu_setrika: boolean;
    is_active: boolean;
    transaksi_count?: number;
    tahap_layanan: TahapLayananItem[];
}

export interface LayananIndexProps extends SharedPageProps {
    layanan: Paginated<JenisLayananItem>;
    filters: {
        search: string;
    };
}

export type VoucherStatus = 'TERSEDIA' | 'SUDAH_DIGUNAKAN' | 'KEDALUWARSA';

export interface VoucherItem {
    nomor_voucher: string;
    nilai: string;
    masa_berlaku: string;
    status_penggunaan: VoucherStatus;
    effective_status: VoucherStatus;
    digunakan_pada: string | null;
}

export interface VoucherValidateResponse {
    valid: boolean;
    nomor_voucher?: string;
    nilai?: string;
    masa_berlaku?: string;
    status_penggunaan?: VoucherStatus;
    reason?: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED';
    message: string;
    errors?: Record<string, string[]>;
}

export interface VoucherIndexProps extends SharedPageProps {
    voucher: Paginated<VoucherItem>;
    filters: {
        search: string;
        status?: VoucherStatus | '';
    };
}

export type StatusPembayaran =
    | 'BELUM_BAYAR'
    | 'DP'
    | 'LUNAS'
    | 'BELUM_LUNAS';
export type StatusTransaksi = 'AKTIF' | 'SELESAI' | 'DIAMBIL' | 'DIBATALKAN';
export type JenisBayar = 'DP' | 'PELUNASAN';

export interface DetailPakaianItem {
    id_detail: number;
    nomor_nota: string;
    jenis_pakaian: string;
    jumlah_potong: number;
    kondisi_pakaian: string;
}

export interface PembayaranItem {
    id_pembayaran: number;
    nomor_nota: string;
    id_petugas: number;
    tanggal_bayar: string;
    jenis_bayar: JenisBayar;
    nominal_bayar: string;
    petugas?: {
        id_petugas: number;
        nama_petugas: string;
    } | null;
}

export interface RiwayatStatusProduksiItem {
    id_status_produksi: number;
    nomor_nota: string;
    id_pegawai: number | null;
    tahap_status: TahapProduksiCode;
    waktu_update: string;
    catatan: string | null;
}

export interface TransaksiDetail {
    nomor_nota: string;
    tanggal_penerimaan: string;
    berat_atau_jumlah: string;
    catatan_khusus: string | null;
    harga_satuan_snapshot: string;
    nilai_voucher_snapshot: string;
    total_kompensasi: string;
    biaya_pembatalan: string;
    subtotal_layanan: string;
    total_harga: string;
    total_dibayar: string;
    sisa_tagihan: string;
    status_pembayaran: StatusPembayaran;
    status_transaksi: StatusTransaksi;
    diambil_pada: string | null;
    pelanggan: PelangganItem;
    petugas: {
        id_petugas: number;
        nama_petugas: string;
    };
    layanan: JenisLayananItem;
    voucher: VoucherItem | null;
    detail_pakaian: DetailPakaianItem[];
    pembayaran: PembayaranItem[];
    riwayat_status_produksi: RiwayatStatusProduksiItem[];
}

export type PelangganOption = Pick<
    PelangganItem,
    'id_pelanggan' | 'nama' | 'no_telepon' | 'boleh_bayar_akhir'
>;

export interface TransaksiCreateProps extends SharedPageProps {
    pelangganOptions: PelangganOption[];
    layananOptions: JenisLayananItem[];
}

export interface TransaksiIndexProps extends SharedPageProps {
    transaksi: Paginated<TransaksiDetail>;
    filters: {
        search: string;
        status_pembayaran?: StatusPembayaran | '';
    };
}

export interface TransaksiShowProps extends SharedPageProps {
    transaksi: TransaksiDetail;
}

export interface TransaksiNotaProps extends SharedPageProps {
    transaksi: TransaksiDetail;
}
