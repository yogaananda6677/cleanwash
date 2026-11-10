<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
        ];
    }

    public function petugas(): HasOne
    {
        return $this->hasOne(Petugas::class, 'user_id', 'id');
    }

    public function pegawai(): HasOne
    {
        return $this->hasOne(Pegawai::class, 'user_id', 'id');
    }

    public function petugasPengantaran(): HasOne
    {
        return $this->hasOne(PetugasPengantaran::class, 'user_id', 'id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'user_id', 'id');
    }

    /**
     * Resolve the role-specific actor primary key for this user.
     */
    public function actorId(): ?int
    {
        return match ($this->role) {
            UserRole::PETUGAS => $this->petugas?->id_petugas,
            UserRole::PEGAWAI => $this->pegawai?->id_pegawai,
            UserRole::PENGANTAR => $this->petugasPengantaran?->id_petugas_antar,
            default => null,
        };
    }
}
