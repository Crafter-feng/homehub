<template>
  <div class="plugin-slot" v-if="slotEntries.length > 0">
    <component
      v-for="(entry, index) in slotEntries"
      :key="`${name}-${index}`"
      :is="entry.component"
      v-bind="entry.props"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { slotManager } from '@/plugins/slot-manager';
import type { SlotEntry } from '@/plugins/slot-manager';

const props = defineProps<{
  /** Slot position name, e.g. 'stock:item-detail-extra', 'stock:item-actions' */
  name: string;
  /** Props to pass to the rendered slot components */
  props?: Record<string, unknown>;
}>();

/** Resolve all components registered to this slot, with merged props */
const slotEntries = computed<SlotEntry[]>(() => {
  return slotManager.getComponentsForSlot(props.name, props.props ?? {});
});
</script>

<style scoped>
.plugin-slot {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
