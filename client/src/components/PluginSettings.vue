<template>
  <n-card title="插件配置">
    <n-spin :show="loading">
      <n-form v-if="schema && formModel" :model="formModel">
        <n-form-item
          v-for="(fieldDef, fieldKey) in schemaProperties"
          :key="fieldKey"
          :label="fieldDef.title || fieldKey"
        >
          <!-- String input -->
          <n-input
            v-if="fieldDef.type === 'string' && !fieldDef.enum"
            v-model:value="formModel[fieldKey]"
            :placeholder="fieldDef.description || ''"
          />

          <!-- Select (string with enum) -->
          <n-select
            v-if="fieldDef.type === 'string' && fieldDef.enum"
            v-model:value="formModel[fieldKey]"
            :options="enumToOptions(fieldDef.enum, fieldDef.enumTitles)"
            :placeholder="fieldDef.description || '请选择'"
          />

          <!-- Number input -->
          <n-input-number
            v-if="fieldDef.type === 'number' || fieldDef.type === 'integer'"
            v-model:value="formModel[fieldKey]"
            :placeholder="fieldDef.description || ''"
            :step="fieldDef.type === 'integer' ? 1 : 0.01"
            style="width: 100%"
          />

          <!-- Boolean switch -->
          <n-switch
            v-if="fieldDef.type === 'boolean'"
            v-model:value="formModel[fieldKey]"
          />
        </n-form-item>
      </n-form>

      <n-empty v-else description="此插件无配置项" />

      <n-space justify="end" style="margin-top: 16px">
        <n-button @click="handleReset">重置</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
      </n-space>
    </n-spin>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  NCard, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch,
  NSpace, NButton, NSpin, NEmpty, useMessage,
} from 'naive-ui';
import { pluginsApi } from '@/api/client';

interface SchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean';
  title?: string;
  description?: string;
  enum?: string[];
  enumTitles?: Record<string, string>;
  default?: unknown;
}

interface ConfigSchema {
  type: 'object';
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

const props = defineProps<{
  /** Plugin ID */
  pluginId: string;
  /** JSON Schema for the plugin config (optional — fetched from backend if not provided) */
  schema?: ConfigSchema;
}>();

const message = useMessage();
const loading = ref(false);
const saving = ref(false);
const formModel = ref<Record<string, any>>({});
const fetchedSchema = ref<ConfigSchema | null>(null);

/** Effective schema: use provided schema or fetched one */
const schema = computed<ConfigSchema | null>(() => props.schema ?? fetchedSchema.value);

/** Extract properties from the schema */
const schemaProperties = computed<Record<string, SchemaProperty>>(() => {
  if (!schema.value?.properties) return {};
  return schema.value.properties;
});

/** Convert enum values to NSelect options */
function enumToOptions(
  enumValues: string[],
  enumTitles?: Record<string, string>,
): Array<{ label: string; value: string }> {
  return enumValues.map((v) => ({
    label: enumTitles?.[v] ?? v,
    value: v,
  }));
}

/** Initialize form model from schema defaults */
function initFormModel(schemaObj: ConfigSchema): void {
  const model: Record<string, unknown> = {};
  if (schemaObj.properties) {
    for (const [key, prop] of Object.entries(schemaObj.properties)) {
      model[key] = prop.default ?? (prop.type === 'boolean' ? false : prop.type === 'number' || prop.type === 'integer' ? 0 : '');
    }
  }
  formModel.value = model;
}

/** Load plugin config and schema from backend */
async function loadConfig(): Promise<void> {
  loading.value = true;
  try {
    const { data } = await pluginsApi.getById(props.pluginId);
    const pluginData = data as Record<string, unknown>;

    // Extract configSchema from meta if available
    const meta = pluginData.meta as Record<string, unknown> | undefined;
    if (meta?.configSchema && !props.schema) {
      fetchedSchema.value = meta.configSchema as ConfigSchema;
    }

    // Extract current config values if available
    const currentConfig = pluginData.config as Record<string, unknown> | undefined;
    if (currentConfig) {
      // Merge current config into form model
      for (const [key, value] of Object.entries(currentConfig)) {
        formModel.value[key] = value;
      }
    }
  } catch (error) {
    message.error('加载插件配置失败');
  } finally {
    loading.value = false;
  }
}

/** Save config to backend */
async function handleSave(): Promise<void> {
  saving.value = true;
  try {
    await pluginsApi.updateConfig(props.pluginId, formModel.value);
    message.success('配置已保存');
  } catch (error) {
    message.error('保存配置失败');
  } finally {
    saving.value = false;
  }
}

/** Reset form to schema defaults */
function handleReset(): void {
  if (schema.value) {
    initFormModel(schema.value);
  }
}

onMounted(() => {
  if (schema.value) {
    initFormModel(schema.value);
  } else {
    loadConfig();
  }
});
</script>
