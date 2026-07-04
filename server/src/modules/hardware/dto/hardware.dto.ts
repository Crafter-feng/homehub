import { IsString, IsOptional, IsEnum, IsNumber, IsObject } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  name: string;

  @IsEnum(['printer_thermal', 'printer_label', 'nfc_writer', 'pdf_export'])
  deviceType: 'printer_thermal' | 'printer_label' | 'nfc_writer' | 'pdf_export';

  @IsString()
  @IsOptional()
  connectionType?: 'usb' | 'bluetooth' | 'network' | 'virtual';

  @IsString()
  @IsOptional()
  connectionConfig?: string; // JSON string with connection details

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class PrintJobDto {
  @IsString()
  content: string; // SVG/HTML/text to print

  @IsEnum(['thermal', 'label', 'pdf'])
  outputType: 'thermal' | 'label' | 'pdf';

  @IsOptional()
  @IsNumber()
  copies?: number;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class NfcWriteDto {
  @IsString()
  payload: string;

  @IsOptional()
  @IsString()
  format?: 'ndef_text' | 'ndef_uri' | 'ndef_smartposter';
}