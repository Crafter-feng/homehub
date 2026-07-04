<template>
  <n-card size="small" :bordered="true" style="margin-top: 12px">
    <template #header>
      <n-space align="center">
        <n-tag :type="stateTagType" size="small">{{ stateLabel }}</n-tag>
        <span>{{ itemTypeConfig?.name ?? '煤气罐' }}</span>
      </n-space>
    </template>

    <!-- State progress indicator -->
    <n-space vertical style="margin-bottom: 12px" v-if="stateMachine">
      <n-text depth="3">当前状态</n-text>
      <n-progress
        type="line"
        :percentage="stateProgress"
        :color="stateColor"
        rail-color="#e0e0e0"
        indicator-placement="inside"
        processing
      >
        {{ stateLabel }}
      </n-progress>
    </n-space>

    <!-- Available transition buttons -->
    <n-space style="margin-top: 8px" v-if="availableTransitions.length > 0">
      <n-button
        v-for="transition in availableTransitions"
        :key="transition.action"
        :type="transitionButtonType(transition)"
        size="small"
        :loading="transitionLoading[transition.action]"
        @click="executeTransition(transition)"
      >
        {{ transition.label }}
      </n-button>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  NCard, NSpace, NTag, NButton, NProgress, NText, useMessage,
} from 'naive-ui';
import { stockApi } from '@/api/client';
import { clientRegistry } from '@/plugins/client-registry';
import { slotManager } from '@/plugins/slot-manager';
import type { StateTransitionDef, ItemTypeFrontendConfig } from '@/plugins/types/client-plugin.types';

const props = defineProps<{
  /** Item ID */
  itemId: number;
  /** Item type key (e.g. 'gas_tank') */
  itemType: string;
  /** Current state machine state */
  currentState: string | null;
  /** Item custom fields */
  customFields?: Record<string, unknown> | null;
}>();

const message = useMessage();
const transitionLoading = ref<Record<string, boolean>>({});

/** Get ItemType config from ClientRegistry */
const itemTypeConfig = computed<ItemTypeFrontendConfig | null>(() => {
  return clientRegistry.getItemTypeConfig(props.itemType);
});

/** Get state machine definition */
const stateMachine = computed(() => itemTypeConfig.value?.stateMachine ?? null);

/** Get available transitions from the current state */
const availableTransitions = computed<StateTransitionDef[]>(() => {
  return slotManager.getAvailableTransitions(props.itemType, props.currentState);
});

/** Human-readable state label */
const stateLabel = computed<string>(() => {
  if (!props.currentState) return '未知';
  const labels: Record<string, string> = {
    full: '满',
    partial: '部分使用',
    empty: '空',
  };
  return labels[props.currentState] ?? props.currentState;
});

/** Tag color based on state */
const stateTagType = computed<'default' | 'info' | 'warning' | 'error' | 'success' | 'primary'>(() => {
  if (!props.currentState) return 'default';
  const colorMap: Record<string, 'default' | 'info' | 'warning' | 'error' | 'success' | 'primary'> = {
    full: 'success',
    partial: 'info',
    empty: 'error',
  };
  return colorMap[props.currentState] ?? 'default';
});

/** Progress bar percentage — represents remaining gas level */
const stateProgress = computed<number>(() => {
  if (!stateMachine.value || !props.currentState) return 50;
  const states = stateMachine.value.states;
  const idx = states.indexOf(props.currentState);
  if (idx < 0) return 50;
  // full=100, partial=50, empty=0
  return Math.round((1 - idx / (states.length - 1)) * 100);
});

/** Progress bar color */
const stateColor = computed<string>(() => {
  if (!props.currentState) return '#2080f0';
  const colorMap: Record<string, string> = {
    full: '#18a058',
    partial: '#2080f0',
    empty: '#d03050',
  };
  return colorMap[props.currentState] ?? '#2080f0';
});

/** Determine button type based on transition action */
function transitionButtonType(transition: StateTransitionDef): 'default' | 'tertiary' | 'primary' | 'info' | 'success' | 'warning' | 'error' {
  const action = transition.action;
  if (action === 'use') return 'warning';
  if (action === 'refill') return 'success';
  return 'default';
}

/** Execute a state machine transition */
async function executeTransition(transition: StateTransitionDef): Promise<void> {
  transitionLoading.value[transition.action] = true;

  try {
    await stockApi.update(props.itemId, {
      currentState: transition.to,
      notes: `状态转换: ${transition.from} → ${transition.to} (${transition.label})`,
    } as Record<string, unknown>);

    message.success(`${transition.label} 成功`);
  } catch (error) {
    const err = error as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message ?? '状态转换失败');
  } finally {
    transitionLoading.value[transition.action] = false;
  }
}
</script>
