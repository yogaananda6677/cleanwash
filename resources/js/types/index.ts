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
    insiden_menunggu_konfirmasi: number;
    transaksi_selesai_siap_ambil: number;
    pengantaran_aktif: number;
    piutang_belum_lunas: number;
    piutang_nominal_total: string;
}

export interface DashboardPegawaiSummary {
    role: 'PEGAWAI';
    antrean_aktif: number;
    laporan_insiden_saya: number;
    perlu_timbang_ulang: number;
    siap_proses_berikutnya: number;
}

export interface DashboardPengantarSummary {
    role: 'PENGANTAR';
    jadwal_pengantaran_aktif: number;
    item_pengantaran_aktif: number;
    item_terkirim_hari_ini: number;
    item_gagal_perlu_tindak_lanjut: number;
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
export type JenisInsiden = 'RUSAK' | 'HILANG';
export type StatusKonfirmasiInsiden = 'MENUNGGU_KONFIRMASI' | 'TERKONFIRMASI';

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
    pegawai?: {
        id_pegawai: number;
        nama_pegawai: string;
    } | null;
}

export interface LaporanInsidenItem {
    id_laporan: number;
    nomor_nota: string;
    id_detail: number;
    id_petugas: number | null;
    id_pegawai_pelapor: number | null;
    jenis_insiden: JenisInsiden;
    keterangan: string;
    nilai_kompensasi: string;
    kelebihan_ganti_rugi: string;
    estimasi_kompensasi: string;
    status_konfirmasi: StatusKonfirmasiInsiden;
    created_at: string;
    updated_at: string;
    detail_pakaian: DetailPakaianItem;
    petugas?: {
        id_petugas: number;
        nama_petugas: string;
    } | null;
    pegawai_pelapor?: {
        id_pegawai: number;
        nama_pegawai: string;
    } | null;
}

export interface LaporanInsidenDetailItem extends LaporanInsidenItem {
    transaksi: {
        nomor_nota: string;
        status_transaksi: StatusTransaksi;
        status_pembayaran: StatusPembayaran;
        subtotal_layanan: string;
        total_harga: string;
        total_dibayar: string;
        sisa_tagihan: string;
        pelanggan: Pick<PelangganItem, 'id_pelanggan' | 'nama' | 'no_telepon'>;
        layanan: Pick<
            JenisLayananItem,
            | 'id_layanan'
            | 'nama_layanan'
            | 'tingkat_kecepatan'
            | 'metode_hitung'
            | 'satuan'
        >;
    };
}

export interface AuditLogItem {
    id: number;
    user_id: number | null;
    actor_role: UserRole;
    action: string;
    subject_type: string;
    subject_id: string;
    payload_before: Record<string, unknown> | null;
    payload_after: Record<string, unknown> | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
    } | null;
}

export interface TransaksiDetailPhase3Additions {
    bisa_pelunasan: boolean;
    bisa_serah_terima_loket: boolean;
    sedang_diantar_kurir: boolean;
    pengantaran_aktif: ItemPengantaranSummary | null;
    riwayat_pengantaran: ItemPengantaranSummary[];
}

export interface TransaksiDetail extends TransaksiDetailPhase3Additions {
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
    kelebihan_bayar_tunai: string;
    total_kelebihan_ganti_rugi: string;
    total_pengembalian_pelanggan: string;
    status_pembayaran: StatusPembayaran;
    status_transaksi: StatusTransaksi;
    diambil_pada: string | null;
    tahap_produksi_terakhir: TahapProduksiCode | null;
    tahap_produksi_berikutnya: TahapProduksiCode | null;
    bisa_timbang_ulang: boolean;
    bisa_ubah_layanan: boolean;
    bisa_batalkan: boolean;
    perlu_biaya_pembatalan: boolean;
    estimasi_biaya_pembatalan: string;
    insiden_pending_count: number;
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
    laporan_insiden: LaporanInsidenItem[];
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
        status_transaksi: StatusTransaksi | '';
    };
}

export interface TransaksiShowProps extends SharedPageProps {
    transaksi: TransaksiDetail;
    layananOptions: JenisLayananItem[];
    auditLogs: AuditLogItem[];
}

export interface TransaksiNotaProps extends SharedPageProps {
    transaksi: TransaksiDetail;
    isPublicView?: boolean;
}

export interface ProduksiIndexProps extends SharedPageProps {
    transaksi: Paginated<TransaksiDetail>;
    filters: {
        search: string;
        tahap_status: TahapProduksiCode | '';
        status_transaksi: 'AKTIF' | 'SELESAI' | 'ALL';
    };
    stageCounts: Record<TahapProduksiCode, number>;
}

export interface EligibleInsidenTransaksiOption {
    nomor_nota: string;
    status_transaksi: StatusTransaksi;
    pelanggan_nama: string;
    layanan_nama: string;
    subtotal_layanan: string;
    total_potong: number;
    detail_pakaian: DetailPakaianItem[];
}

export interface InsidenIndexProps extends SharedPageProps {
    laporan: Paginated<LaporanInsidenDetailItem>;
    filters: {
        search: string;
        jenis_insiden: JenisInsiden | '';
        status_konfirmasi: StatusKonfirmasiInsiden | '';
    };
    pendingCount: number;
    eligibleTransaksiOptions: EligibleInsidenTransaksiOption[];
}

export type StatusPengantaran = 'DIJADWALKAN' | 'BERJALAN' | 'SELESAI';
export type StatusItemPengantaran =
    | 'MENUNGGU'
    | 'DIAMBIL'
    | 'DALAM_PERJALANAN'
    | 'DITERIMA'
    | 'GAGAL';

export interface KurirOption {
    id_petugas_antar: number;
    nama_petugas_antar: string;
    is_active: boolean;
}

export interface ItemPengantaranSummary {
    id_item_antar: number;
    id_pengantaran: number;
    nomor_nota: string;
    status_terima_pelanggan: StatusItemPengantaran;
    alasan_gagal: string | null;
    waktu_update: string | null;
    pengantaran?: {
        id_pengantaran: number;
        id_petugas_antar: number;
        tanggal_pengantaran: string;
        status_pengantaran: StatusPengantaran;
        nama_petugas_antar: string;
    } | null;
}

export interface ItemPengantaranDetail extends ItemPengantaranSummary {
    bisa_jadwalkan_ulang: boolean;
    status_berikutnya: StatusItemPengantaran[];
    transaksi: {
        nomor_nota: string;
        status_transaksi: StatusTransaksi;
        status_pembayaran: StatusPembayaran;
        total_harga: string;
        total_dibayar: string;
        sisa_tagihan: string;
        diambil_pada: string | null;
        pelanggan: Pick<
            PelangganItem,
            'id_pelanggan' | 'nama' | 'no_telepon' | 'alamat' | 'boleh_bayar_akhir'
        >;
        layanan: Pick<
            JenisLayananItem,
            'id_layanan' | 'nama_layanan' | 'tingkat_kecepatan' | 'satuan'
        >;
        berat_atau_jumlah: string;
        detail_pakaian_count: number;
    };
}

export interface PengantaranSummary {
    id_pengantaran: number;
    id_petugas_antar: number;
    tanggal_pengantaran: string;
    status_pengantaran: StatusPengantaran;
    created_at: string;
    updated_at: string;
    petugas_pengantaran: {
        id_petugas_antar: number;
        nama_petugas_antar: string;
    };
    total_item: number;
    item_selesai_count: number;
    item_gagal_count: number;
    items: ItemPengantaranDetail[];
}

export interface EligiblePengantaranTransaksiOption {
    nomor_nota: string;
    tanggal_penerimaan: string;
    total_harga: string;
    total_dibayar: string;
    sisa_tagihan: string;
    status_pembayaran: StatusPembayaran;
    insiden_pending_count: number;
    has_previous_failed_delivery: boolean;
    pelanggan: Pick<
        PelangganItem,
        'id_pelanggan' | 'nama' | 'no_telepon' | 'alamat' | 'boleh_bayar_akhir'
    >;
    layanan: Pick<
        JenisLayananItem,
        'id_layanan' | 'nama_layanan' | 'tingkat_kecepatan' | 'satuan'
    >;
    berat_atau_jumlah: string;
}

export interface PengantaranIndexProps extends SharedPageProps {
    pengantaran: Paginated<PengantaranSummary>;
    filters: {
        search: string;
        status_pengantaran: StatusPengantaran | '';
        tanggal_pengantaran: string;
        id_petugas_antar: string;
    };
    kurirOptions: KurirOption[];
    eligibleTransaksiOptions: EligiblePengantaranTransaksiOption[];
    statusCounts: Record<StatusPengantaran, number>;
}

export interface PengantaranShowProps extends SharedPageProps {
    pengantaran: PengantaranSummary;
    kurirOptions: KurirOption[];
}

export interface SerahTerimaIndexProps extends SharedPageProps {
    transaksi: Paginated<TransaksiDetail>;
    filters: {
        search: string;
        mode: 'SIAP_AMBIL' | 'PIUTANG' | 'RIWAYAT_DIAMBIL';
    };
    summary: {
        siap_ambil_count: number;
        sedang_diantar_count: number;
        piutang_count: number;
        total_piutang_nominal: string;
    };
}

export interface PiutangTransaksiItem {
    nomor_nota: string;
    diambil_pada: string;
    total_harga: string;
    total_dibayar: string;
    sisa_tagihan: string;
    status_pembayaran: StatusPembayaran;
    pelanggan: Pick<
        PelangganItem,
        'id_pelanggan' | 'nama' | 'no_telepon' | 'boleh_bayar_akhir'
    >;
    layanan: Pick<
        JenisLayananItem,
        'id_layanan' | 'nama_layanan' | 'tingkat_kecepatan'
    >;
}

export interface AuditIndexProps extends SharedPageProps {
    logs: Paginated<AuditLogItem>;
    filters: {
        search: string;
        action: string;
        actor_role: UserRole | '';
    };
    availableActions: string[];
    piutangSummary: {
        total_nota_piutang: number;
        total_nominal_piutang: string;
        items: PiutangTransaksiItem[];
    };
}
