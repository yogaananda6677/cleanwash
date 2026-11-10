<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Pegawai;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuthAndRbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_guest_is_redirected_from_root_and_dashboard_to_login_page(): void
    {
        $this->get('/')->assertRedirect('/login');
        $this->get('/dashboard')->assertRedirect('/login');

        $response = $this->get('/login');
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Auth/Login')
            ->where('auth.user', null)
            ->has('flash')
        );
    }

    public function test_each_active_staff_role_can_login_and_receives_correct_inertia_auth_props(): void
    {
        $petugasUser = User::factory()->petugas()->create([
            'email' => 'kasir@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        $petugas = Petugas::create([
            'user_id' => $petugasUser->id,
            'nama_petugas' => 'Kasir Satu',
        ]);

        $pegawaiUser = User::factory()->pegawai()->create([
            'email' => 'produksi@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        $pegawai = Pegawai::create([
            'user_id' => $pegawaiUser->id,
            'nama_pegawai' => 'Produksi Satu',
        ]);

        $kurirUser = User::factory()->pengantar()->create([
            'email' => 'kurir@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        $kurir = PetugasPengantaran::create([
            'user_id' => $kurirUser->id,
            'nama_petugas_antar' => 'Kurir Satu',
        ]);

        $cases = [
            [$petugasUser, UserRole::PETUGAS->value, $petugas->id_petugas],
            [$pegawaiUser, UserRole::PEGAWAI->value, $pegawai->id_pegawai],
            [$kurirUser, UserRole::PENGANTAR->value, $kurir->id_petugas_antar],
        ];

        foreach ($cases as [$user, $expectedRole, $expectedActorId]) {
            $loginResponse = $this->post('/login', [
                'email' => $user->email,
                'password' => 'secret123',
            ]);

            $loginResponse->assertRedirect('/dashboard');
            $this->assertAuthenticatedAs($user);

            $this->get('/')->assertRedirect('/dashboard');

            $dashboardResponse = $this->get('/dashboard');
            $dashboardResponse->assertOk();
            $dashboardResponse->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('auth.user.id', $user->id)
                ->where('auth.user.name', $user->name)
                ->where('auth.user.email', $user->email)
                ->where('auth.user.role', $expectedRole)
                ->where('auth.user.is_active', true)
                ->where('auth.user.actor_id', $expectedActorId)
                ->where('summary.role', $expectedRole)
            );

            $this->post('/logout')->assertRedirect('/login');
            $this->assertGuest();
        }
    }

    public function test_inactive_user_cannot_login_and_receives_validation_error_on_email(): void
    {
        User::factory()->petugas()->inactive()->create([
            'email' => 'nonaktif@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->from('/login')->post('/login', [
            'email' => 'nonaktif@cleanwash.test',
            'password' => 'secret123',
        ]);

        $response->assertRedirect('/login');
        $response->assertSessionHasErrors('email');
        $this->assertGuest();

        $jsonResponse = $this->postJson('/login', [
            'email' => 'nonaktif@cleanwash.test',
            'password' => 'secret123',
        ]);

        $jsonResponse->assertStatus(422);
        $jsonResponse->assertJsonValidationErrors(['email']);
        $this->assertGuest();
    }

    public function test_wrong_password_is_rejected_with_validation_error_on_email(): void
    {
        User::factory()->petugas()->create([
            'email' => 'petugas@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/login', [
            'email' => 'petugas@cleanwash.test',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
        $this->assertGuest();
    }

    public function test_role_middleware_allows_authorized_role_and_forbids_other_roles_or_inactive_accounts(): void
    {
        Route::middleware(['web', 'auth', 'role:PETUGAS'])
            ->get('/_test/petugas-only', fn () => response()->json(['ok' => true]));

        $petugas = User::factory()->petugas()->create();
        $pegawai = User::factory()->pegawai()->create();
        $kurir = User::factory()->pengantar()->create();
        $inactivePetugas = User::factory()->petugas()->inactive()->create();

        $this->actingAs($petugas)
            ->get('/_test/petugas-only')
            ->assertOk()
            ->assertExactJson(['ok' => true]);

        $this->actingAs($pegawai)
            ->get('/_test/petugas-only')
            ->assertForbidden();

        $this->actingAs($kurir)
            ->get('/_test/petugas-only')
            ->assertForbidden();

        $this->actingAs($inactivePetugas)
            ->get('/_test/petugas-only')
            ->assertForbidden();

        $this->actingAs($inactivePetugas)
            ->get('/dashboard')
            ->assertForbidden();
    }

    public function test_authenticated_user_visiting_login_is_redirected_to_dashboard_and_multi_role_middleware_works(): void
    {
        Route::middleware(['web', 'auth', 'role:PETUGAS,PEGAWAI'])
            ->get('/_test/staff-produksi', fn () => response()->json(['ok' => true]));

        $petugas = User::factory()->petugas()->create();
        $pegawai = User::factory()->pegawai()->create();
        $kurir = User::factory()->pengantar()->create();

        $this->actingAs($petugas)
            ->get('/login')
            ->assertRedirect('/dashboard');

        $this->actingAs($petugas)->get('/_test/staff-produksi')->assertOk();
        $this->actingAs($pegawai)->get('/_test/staff-produksi')->assertOk();
        $this->actingAs($kurir)->get('/_test/staff-produksi')->assertForbidden();

        $this->post('/logout')->assertRedirect('/login');
        $this->postJson('/login', [
            'email' => 'not-an-email',
            'password' => '',
        ])->assertStatus(422)->assertJsonValidationErrors(['email', 'password']);
    }
}
