export type UserRole = 'PETUGAS' | 'PEGAWAI' | 'PENGANTAR';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: UserRole | null;
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
