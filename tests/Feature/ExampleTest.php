<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_application_returns_a_successful_inertia_welcome_response(): void
    {
        $this->withoutVite();

        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Welcome')
            ->where('appName', 'CleanWash')
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
