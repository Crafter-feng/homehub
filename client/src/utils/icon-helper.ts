import type { Component } from 'vue';
import {
  RestaurantOutline, NutritionOutline, PizzaOutline, WineOutline, CafeOutline,
  WaterOutline, IceCreamOutline, EggOutline, FishOutline, FlameOutline,
  BeerOutline, GlassesOutline, PintOutline,
  ShirtOutline, BagOutline, BagHandleOutline, WalkOutline,
  MedkitOutline, BandageOutline, HeartCircleOutline,
  HomeOutline, BedOutline,
  PhonePortraitOutline, LaptopOutline, TvOutline, CameraOutline,
  BatteryChargingOutline, FlashOutline, BulbOutline,
  BuildOutline, HammerOutline, ConstructOutline,
  GiftOutline, BalloonOutline, RibbonOutline,
  CubeOutline, PricetagOutline, FolderOutline, BookmarkOutline,
} from '@vicons/ionicons5';

const iconMap: Record<string, Component> = {
  'icon-restaurant': RestaurantOutline,
  'icon-nutrition': NutritionOutline,
  'icon-pizza': PizzaOutline,
  'icon-fish': FishOutline,
  'icon-egg': EggOutline,
  'icon-flame': FlameOutline,
  'icon-wine': WineOutline,
  'icon-cafe': CafeOutline,
  'icon-water': WaterOutline,
  'icon-icecream': IceCreamOutline,
  'icon-beer': BeerOutline,
  'icon-coffee': CafeOutline,
  'icon-pint': PintOutline,
  'icon-glass-wine': GlassesOutline,
  'icon-shirt': ShirtOutline,
  'icon-bag': BagOutline,
  'icon-bag-handle': BagHandleOutline,
  'icon-footprints': WalkOutline,
  'icon-medkit': MedkitOutline,
  'icon-bandage': BandageOutline,
  'icon-heart-circle': HeartCircleOutline,
  'icon-home': HomeOutline,
  'icon-bed': BedOutline,
  'icon-phone': PhonePortraitOutline,
  'icon-laptop': LaptopOutline,
  'icon-tv': TvOutline,
  'icon-camera': CameraOutline,
  'icon-battery': BatteryChargingOutline,
  'icon-plug': FlashOutline,
  'icon-bulb': BulbOutline,
  'icon-build': BuildOutline,
  'icon-hammer': HammerOutline,
  'icon-construct': ConstructOutline,
  'icon-gift': GiftOutline,
  'icon-balloon': BalloonOutline,
  'icon-ribbon': RibbonOutline,
  'icon-cube': CubeOutline,
  'icon-pricetag': PricetagOutline,
  'icon-folder': FolderOutline,
  'icon-bookmark': BookmarkOutline,
};

export function isEmojiIcon(value: string): boolean {
  if (!value) return false;
  return !value.startsWith('icon-');
}

export function resolveIconComponent(name: string): Component {
  return iconMap[name] || CubeOutline;
}

export function renderIcon(name: string, size: number = 20) {
  return { name, isEmoji: isEmojiIcon(name), component: resolveIconComponent(name), size };
}
