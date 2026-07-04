import { Injectable, Logger } from '@nestjs/common';

export interface BarcodeLookupResult {
  name: string;
  brand?: string;
  category?: string;
  image?: string;
  barcode: string;
  source: string;
}

@Injectable()
export class BarcodeLookupService {
  private readonly logger = new Logger(BarcodeLookupService.name);

  /**
   * Lookup barcode from external APIs
   */
  async lookup(barcode: string): Promise<BarcodeLookupResult | null> {
    // Try apizero.cn first (Chinese barcode database)
    const apizeroResult = await this.lookupApizero(barcode);
    if (apizeroResult) return apizeroResult;

    // Fallback to Open Food Facts
    const offResult = await this.lookupOpenFoodFacts(barcode);
    if (offResult) return offResult;

    return null;
  }

  private async lookupApizero(barcode: string): Promise<BarcodeLookupResult | null> {
    try {
      const response = await fetch(`https://api.apizero.cn/barcode/${barcode}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;

      const data = await response.json() as any;
      if (!data.name && !data.title) return null;

      return {
        name: data.name || data.title || '',
        brand: data.brand || data.manufacturer || undefined,
        category: data.category || undefined,
        image: data.image || undefined,
        barcode,
        source: 'apizero',
      };
    } catch (err) {
      this.logger.warn(`apizero lookup failed for ${barcode}: ${(err as Error).message}`);
      return null;
    }
  }

  private async lookupOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult | null> {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;

      const data = await response.json() as any;
      if (!data.product) return null;

      return {
        name: data.product.product_name || data.product.product_name_zh || '',
        brand: data.product.brands || undefined,
        category: data.product.categories || undefined,
        image: data.product.image_url || undefined,
        barcode,
        source: 'openfoodfacts',
      };
    } catch (err) {
      this.logger.warn(`OpenFoodFacts lookup failed for ${barcode}: ${(err as Error).message}`);
      return null;
    }
  }
}
