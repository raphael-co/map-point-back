// heic-convert.d.ts
declare module 'heic-convert' {
    interface HeicConvertOptions {
      buffer: Buffer;
      format: 'JPEG' | 'PNG';
      quality: number;
    }
  
    function heicConvert(options: HeicConvertOptions): Promise<Buffer>;
  
    export = heicConvert;
  }
  