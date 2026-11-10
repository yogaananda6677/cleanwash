<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_application_redirects_guests_to_login_and_shares_inertia_props(): void
    {
        $this->withoutVite();

        $this->get('/')->assertRedirect('/login');

        $response = $this->get('/login');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Auth/Login')
            ->where('auth.user', null)
            ->has('flash')
        );
    }

    public function test_application_uses_asia_jakarta_timezone_and_isolated_mysql_testing_database(): void
    {
        $this->assertSame('Asia/Jakarta', config('app.timezone'));
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame('3307', (string) config('database.connections.mysql.port'));
        $this->assertSame('cleanwash_testing', DB::connection()->getDatabaseName());

        $version = DB::selectOne('SELECT VERSION() AS version');
        $this->assertNotNull($version);
        $this->assertStringStartsWith('8.4.', (string) $version->version);
    }
}
