<template>
  <n-card size="small" :bordered="true" style="margin-top: 12px">
    <template #header>
      <n-space align="center">
        <n-tag :type="stateTagType" size="small">{{ stateLabel }}</n-tag>
        <span>{{ itemTypeConfig?.name ?? '充电电池' }}</span>
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

    <!-- Cycle count display (if supported) -->
    <n-text depth="3" v-if="cycleCount != null" style="margin-top: 8px">
      循环次数: {{ cycleCount }}
    </n-text>
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
  /** Item type key (e.g. 'rechargeable_battery') */
  itemType: string;
  /** Current state machine state */
  currentState: string | null;
  /** Item custom fields (contains cycleCount, etc.) */
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
    charged: '已充电',
    depleted: '已耗尽',
    charging: '充电中',
  };
  return labels[props.currentState] ?? props.currentState;
});

/** Tag color based on state */
const stateTagType = computed<'default' | 'info' | 'warning' | 'error' | 'success' | 'primary'>(() => {
  if (!props.currentState) return 'default';
  const colorMap: Record<string, 'default' | 'info' | 'warning' | 'error' | 'success' | 'primary'> = {
    charged: 'success',
    depleted: 'warning',
    charging: 'info',
  };
  return colorMap[props.currentState] ?? 'default';
});

/** Progress bar percentage — represents state position in lifecycle
 *  For 3-state (charged/depleted/charging): charged=100%, charging=50%, depleted=0%
 *  For 2-state or others: linear interpolation based on state index */
const stateProgress = computed<number>(() => {
  if (!stateMachine.value || !props.currentState) return 50;
  // For rechargeable_battery specifically, use meaningful percentages
  const progressMap: Record<string, number> = {
    charged: 100,
    charging: 50,
    depleted: 0,
  };
  if (progressMap[props.currentState] !== undefined) {
    return progressMap[props.currentState];
  }
  // Generic fallback: linear interpolation
  const states = stateMachine.value.states;
  const idx = states.indexOf(props.currentState);
  if (idx < 0) return 50;
  return Math.round((idx / (states.length - 1)) * 100);
});

/** Progress bar color */
const stateColor = computed<string>(() => {
  if (!props.currentState) return '#2080f0';
  const colorMap: Record<string, string> = {
    charged: '#18a058',
    depleted: '#f0a020',
    charging: '#2080f0',
  };
  return colorMap[props.currentState] ?? '#2080f0';
});

/** Cycle count from customFields */
const cycleCount = computed<number | null>(() => {
  if (!props.customFields) return null;
  return (props.customFields.cycleCount as number) ?? null;
});

/** Determine button type based on transition action */
function transitionButtonType(transition: StateTransitionDef): 'default' | 'tertiary' | 'primary' | 'info' | 'success' | 'warning' | 'error' {
  const action = transition.action;
  if (action === 'use' || action === 'discharge') return 'warning';
  if (action === 'charge' || action === 'refill' || action === 'complete') return 'success';
  return 'default';
}

/** Execute a state machine transition */
async function executeTransition(transition: StateTransitionDef): Promise<void> {
  transitionLoading.value[transition.action] = true;

  try {
    // Update the item's currentState via stockApi
    await stockApi.update(props.itemId, {
      currentState: transition.to,
      notes: `状态转换: ${transition.from} → ${transition.to} (${transition.label})`,
    } as Record<string, unknown>);

    message.success(`${transition.label} 成功`);
    // Reload item data — the parent component should handle this
    // by re-fetching the item after the transition
  } catch (error) {
    const err = error as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message ?? '状态转换失败');
  } finally {
    transitionLoading.value[transition.action] = false;
  }
}
</script>
