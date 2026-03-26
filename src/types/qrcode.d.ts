declare module 'qrcode' {
  export function toDataURL(data: string, options?: any): Promise<string>;
  const qrcode: {
    toDataURL: typeof toDataURL;
  };
  export default qrcode;
}
