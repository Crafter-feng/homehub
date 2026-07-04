<template>
  <div class="icon-picker-wrapper">
    <!-- Selected display -->
    <div class="selected-display" @click="showPicker = true">
      <template v-if="modelValue">
        <span v-if="isEmoji(modelValue)" class="icon-emoji">{{ modelValue }}</span>
        <n-icon v-else :size="22" :color="color">
          <component :is="resolveIcon(modelValue)" />
        </n-icon>
      </template>
      <span v-else class="icon-placeholder">{{ placeholder }}</span>
      <n-icon :size="14" class="chevron"><ChevronDown /></n-icon>
    </div>

    <!-- Picker Modal -->
    <n-modal v-model:show="showPicker" :title="title" preset="card" style="max-width: 560px">
      <n-input v-model:value="searchQuery" :placeholder="searchPlaceholder" clearable style="margin-bottom: 12px">
        <template #prefix><n-icon :size="16"><SearchOutline /></n-icon></template>
      </n-input>

      <n-tabs v-model:value="activeTab" type="segment" animated size="small">
        <!-- SVG Icons Tab -->
        <n-tab-pane name="svg" :tab="svgTabLabel">
          <n-tabs v-model:value="activeGroup" type="line" animated size="small" tab-style="margin-bottom: 8px">
            <n-tab-pane v-for="group in svgIconGroups" :key="group.name" :name="group.name" :tab="group.label">
              <div class="icon-grid">
                <div
                  v-for="icon in filteredSvgIcons(group.icons)"
                  :key="icon.name"
                  class="icon-item"
                  :class="{ active: modelValue === icon.name }"
                  @click="selectIcon(icon.name)"
                >
                  <n-icon :size="22"><component :is="icon.component" /></n-icon>
                </div>
              </div>
              <n-empty v-if="filteredSvgIcons(group.icons).length === 0" :description="noMatchText" size="small" />
            </n-tab-pane>
          </n-tabs>
        </n-tab-pane>

        <!-- Emoji Tab -->
        <n-tab-pane name="emoji" :tab="emojiTabLabel">
          <n-tabs v-model:value="activeEmojiGroup" type="line" animated size="small" tab-style="margin-bottom: 8px">
            <n-tab-pane v-for="group in emojiGroups" :key="group.name" :name="group.name" :tab="group.label">
              <div class="icon-grid">
                <div
                  v-for="emoji in filteredEmojis(group.icons)"
                  :key="emoji"
                  class="icon-item emoji-item"
                  :class="{ active: modelValue === emoji }"
                  @click="selectIcon(emoji)"
                >
                  {{ emoji }}
                </div>
              </div>
              <n-empty v-if="filteredEmojis(group.icons).length === 0" :description="noMatchText" size="small" />
            </n-tab-pane>
          </n-tabs>
        </n-tab-pane>
      </n-tabs>

      <template #footer>
        <n-space justify="space-between" align="center">
          <n-button v-if="modelValue" size="small" quaternary type="error" @click="clearIcon">
            {{ clearText }}
          </n-button>
          <n-button @click="showPicker = false">{{ closeText }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Component } from 'vue';
import { NModal, NTabs, NTabPane, NInput, NIcon, NButton, NSpace, NEmpty } from 'naive-ui';
import {
  ChevronDown, SearchOutline,
  // Food
  RestaurantOutline, NutritionOutline, PizzaOutline, WineOutline, CafeOutline,
  WaterOutline, IceCreamOutline, EggOutline, FishOutline, FlameOutline,
  // Drink
  BeerOutline, GlassesOutline, PintOutline,
  // Daily
  ShirtOutline, BagOutline, BagHandleOutline, WalkOutline,
  // Medical
  MedkitOutline, BandageOutline, HeartCircleOutline,
  // Home
  HomeOutline, BedOutline,
  // Electronic
  PhonePortraitOutline, LaptopOutline, TvOutline, CameraOutline,
  BatteryChargingOutline, FlashOutline, BulbOutline,
  // Tool
  BuildOutline, HammerOutline, ConstructOutline,
  // Other
  GiftOutline, BalloonOutline, RibbonOutline,
  // General
  CubeOutline, PricetagOutline, FolderOutline, BookmarkOutline,
} from '@vicons/ionicons5';
import { useI18n } from '@/locales';

const props = withDefaults(defineProps<{
  modelValue: string;
  title?: string;
  placeholder?: string;
  color?: string;
}>(), {
  title: '',
  placeholder: '',
  color: 'var(--hh-primary)',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useI18n();

const showPicker = ref(false);
const searchQuery = ref('');
const activeTab = ref('svg');
const activeGroup = ref('food');
const activeEmojiGroup = ref('food');

const title = computed(() => props.title || t('masterData.selectIcon'));
const placeholder = computed(() => props.placeholder || t('masterData.clickToSelect'));
const searchPlaceholder = computed(() => t('masterData.searchIcon'));
const svgTabLabel = computed(() => t('masterData.icon'));
const emojiTabLabel = computed(() => 'Emoji');
const noMatchText = computed(() => t('masterData.noMatchingIcon'));
const closeText = computed(() => t('common.close'));
const clearText = computed(() => t('common.delete'));

interface SvgIconDef {
  name: string;
  component: Component;
  keywords: string[];
}

const svgIconGroups = computed(() => [
  {
    name: 'food',
    label: t('masterData.iconGroupFood'),
    icons: [
      { name: 'icon-restaurant', component: RestaurantOutline, keywords: ['food', 'meal', 'dish'] },
      { name: 'icon-nutrition', component: NutritionOutline, keywords: ['food', 'apple', 'health'] },
      { name: 'icon-pizza', component: PizzaOutline, keywords: ['food', 'pizza', 'fast'] },
      { name: 'icon-fish', component: FishOutline, keywords: ['food', 'seafood', 'fish'] },
      { name: 'icon-egg', component: EggOutline, keywords: ['food', 'egg', 'protein'] },
      { name: 'icon-flame', component: FlameOutline, keywords: ['food', 'cook', 'fire'] },
    ] as SvgIconDef[],
  },
  {
    name: 'drink',
    label: t('masterData.iconGroupDrink'),
    icons: [
      { name: 'icon-wine', component: WineOutline, keywords: ['drink', 'wine', 'alcohol'] },
      { name: 'icon-cafe', component: CafeOutline, keywords: ['drink', 'coffee', 'cafe'] },
      { name: 'icon-water', component: WaterOutline, keywords: ['drink', 'water', 'bottle'] },
      { name: 'icon-icecream', component: IceCreamOutline, keywords: ['drink', 'dessert', 'sweet'] },
      { name: 'icon-beer', component: BeerOutline, keywords: ['drink', 'beer', 'alcohol'] },
      { name: 'icon-coffee', component: CafeOutline, keywords: ['drink', 'coffee', 'hot'] },
      { name: 'icon-pint', component: PintOutline, keywords: ['drink', 'beer', 'glass'] },
      { name: 'icon-glass-wine', component: GlassesOutline, keywords: ['drink', 'wine', 'glass'] },
    ] as SvgIconDef[],
  },
  {
    name: 'daily',
    label: t('masterData.iconGroupDaily'),
    icons: [
      { name: 'icon-shirt', component: ShirtOutline, keywords: ['clothing', 'shirt', 'daily'] },
      { name: 'icon-bag', component: BagOutline, keywords: ['bag', 'shopping', 'daily'] },
      { name: 'icon-bag-handle', component: BagHandleOutline, keywords: ['bag', 'shopping', 'daily'] },
      { name: 'icon-footprints', component: WalkOutline, keywords: ['shoes', 'clothing', 'daily'] },
    ] as SvgIconDef[],
  },
  {
    name: 'medical',
    label: t('masterData.iconGroupMedical'),
    icons: [
      { name: 'icon-medkit', component: MedkitOutline, keywords: ['medical', 'first aid', 'health'] },
      { name: 'icon-bandage', component: BandageOutline, keywords: ['medical', 'bandage', 'first aid'] },
      { name: 'icon-heart-circle', component: HeartCircleOutline, keywords: ['medical', 'health', 'heart'] },
    ] as SvgIconDef[],
  },
  {
    name: 'home',
    label: t('masterData.iconGroupHome'),
    icons: [
      { name: 'icon-home', component: HomeOutline, keywords: ['home', 'house', 'living'] },
      { name: 'icon-bed', component: BedOutline, keywords: ['home', 'bed', 'furniture'] },
      { name: 'icon-cafe-home', component: CafeOutline, keywords: ['home', 'kitchen', 'cafe'] },
    ] as SvgIconDef[],
  },
  {
    name: 'electronic',
    label: t('masterData.iconGroupElectronic'),
    icons: [
      { name: 'icon-phone', component: PhonePortraitOutline, keywords: ['electronic', 'phone', 'mobile'] },
      { name: 'icon-laptop', component: LaptopOutline, keywords: ['electronic', 'laptop', 'computer'] },
      { name: 'icon-tv', component: TvOutline, keywords: ['electronic', 'tv', 'screen'] },
      { name: 'icon-camera', component: CameraOutline, keywords: ['electronic', 'camera', 'photo'] },
      { name: 'icon-battery', component: BatteryChargingOutline, keywords: ['electronic', 'battery', 'power'] },
      { name: 'icon-plug', component: FlashOutline, keywords: ['electronic', 'plug', 'power'] },
      { name: 'icon-bulb', component: BulbOutline, keywords: ['electronic', 'light', 'bulb'] },
    ] as SvgIconDef[],
  },
  {
    name: 'tool',
    label: t('masterData.iconGroupTool'),
    icons: [
      { name: 'icon-build', component: BuildOutline, keywords: ['tool', 'wrench', 'fix'] },
      { name: 'icon-hammer', component: HammerOutline, keywords: ['tool', 'hammer', 'fix'] },
      { name: 'icon-construct', component: ConstructOutline, keywords: ['tool', 'construction', 'fix'] },
    ] as SvgIconDef[],
  },
  {
    name: 'other',
    label: t('masterData.iconGroupOther'),
    icons: [
      { name: 'icon-gift', component: GiftOutline, keywords: ['gift', 'present', 'other'] },
      { name: 'icon-balloon', component: BalloonOutline, keywords: ['party', 'balloon', 'other'] },
      { name: 'icon-ribbon', component: RibbonOutline, keywords: ['ribbon', 'decoration', 'other'] },
      { name: 'icon-cube', component: CubeOutline, keywords: ['box', 'item', 'generic'] },
      { name: 'icon-pricetag', component: PricetagOutline, keywords: ['tag', 'label', 'price'] },
      { name: 'icon-folder', component: FolderOutline, keywords: ['folder', 'category', 'group'] },
      { name: 'icon-bookmark', component: BookmarkOutline, keywords: ['bookmark', 'mark', 'save'] },
    ] as SvgIconDef[],
  },
]);

const emojiGroups = [
  { name: 'food', label: t('masterData.iconGroupFood'), icons: ['🍖', '🥩', '🍗', '🐟', '🥚', '🧀', '🥛', '🍞', '🍎', '🍊', '🍌', '🍉', '🍇', '🍓', '🍅', '🥕', '🥬', '🍜', '🍣', '🍱'] },
  { name: 'drink', label: t('masterData.iconGroupDrink'), icons: ['☕', '🍵', '🧃', '🥤', '🍺', '🍷', '🍾', '🧋'] },
  { name: 'daily', label: t('masterData.iconGroupDaily'), icons: ['🧴', '🧼', '🧹', '📦', '🛍️', '👕', '👖', '👗', '👟', '🧳'] },
  { name: 'medical', label: t('masterData.iconGroupMedical'), icons: ['💊', '💉', '🩹', '🩺', '🔬', '🏥'] },
  { name: 'home', label: t('masterData.iconGroupHome'), icons: ['🏠', '🪑', '🛋️', '🛏️', '🚿', '🚪', '🔑'] },
  { name: 'electronic', label: t('masterData.iconGroupElectronic'), icons: ['📱', '💻', '🖥️', '📺', '📷', '🔋', '🔌', '💡'] },
  { name: 'tool', label: t('masterData.iconGroupTool'), icons: ['🔧', '🔨', '⚙️', '📏', '🧰'] },
  { name: 'other', label: t('masterData.iconGroupOther'), icons: ['🎁', '🎈', '🎉', '🏷️', '📌', '📍'] },
];

function isEmoji(value: string): boolean {
  if (!value) return false;
  // Check if it starts with 'icon-' (SVG) or is a single emoji character
  return !value.startsWith('icon-');
}

function resolveIcon(name: string): Component {
  for (const group of svgIconGroups.value) {
    const found = group.icons.find(i => i.name === name);
    if (found) return found.component;
  }
  return CubeOutline;
}

function filteredSvgIcons(icons: SvgIconDef[]): SvgIconDef[] {
  if (!searchQuery.value) return icons;
  const q = searchQuery.value.toLowerCase();
  return icons.filter(i => i.name.includes(q) || i.keywords.some(k => k.includes(q)));
}

function filteredEmojis(emojis: string[]): string[] {
  if (!searchQuery.value) return emojis;
  return emojis.filter(e => e.includes(searchQuery.value));
}

function selectIcon(value: string) {
  emit('update:modelValue', value);
  showPicker.value = false;
}

function clearIcon() {
  emit('update:modelValue', '');
  showPicker.value = false;
}
</script>

<style scoped>
.selected-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--hh-border);
  border-radius: var(--hh-radius-md);
  min-height: 40px;
  cursor: pointer;
  transition: all var(--hh-transition-fast) var(--hh-easing-default);
}

.selected-display:hover {
  border-color: var(--hh-primary);
  box-shadow: var(--hh-shadow-glow);
}

.icon-emoji {
  font-size: 22px;
  line-height: 1;
}

.icon-placeholder {
  color: var(--hh-text-tertiary);
  font-size: var(--hh-text-sm);
  flex: 1;
}

.chevron {
  color: var(--hh-text-tertiary);
  margin-left: auto;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  padding: 8px 0;
  min-height: 120px;
}

.icon-item {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--hh-radius-md);
  cursor: pointer;
  transition: all var(--hh-transition-fast) var(--hh-easing-default);
  border: 2px solid transparent;
  color: var(--hh-text);
}

.icon-item.emoji-item {
  font-size: 22px;
}

.icon-item:hover {
  background: var(--hh-bg-secondary);
  transform: scale(1.1);
}

.icon-item.active {
  border-color: var(--hh-primary);
  background: var(--hh-primary-light);
  color: var(--hh-primary);
}
</style>
