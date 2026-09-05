declare namespace Cloudflare {
  interface Env {
    ORIGIN: string;
    STAFF_API_TOKEN: string;
    DESK_SHARED_SECRET: string;
  }
}
interface Env extends Cloudflare.Env {}
