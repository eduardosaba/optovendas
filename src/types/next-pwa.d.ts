declare module "next-pwa" {
  type PWAOptions = {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
  };

  export default function withPWA(options: PWAOptions): <T>(config: T) => T;
}
