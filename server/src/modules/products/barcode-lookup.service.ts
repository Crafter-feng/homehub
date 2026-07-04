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
    // Try Open Food Facts first
    const offResult = await this.lookupOpenFoodFacts(barcode);
    if (offResult) return offResult;

    // Add more providers here as needed
    return null;
  }

  private async lookupOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult | null> {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
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
