<template>
  <div class="hardware-page">
    <n-page-header
      title="硬件管理"
      subtitle="打印机/NFC写入器/设备管理"
    />

    <n-card class="page-section">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- 已注册设备 -->
        <n-tab-pane name="devices" tab="已注册设备">
          <n-data-table
            :columns="deviceColumns"
            :data="devices"
            :pagination="{ pageSize: 20 }"
            :loading="loadingDevices"
            :bordered="false"
          />
        </n-tab-pane>

        <!-- 打印任务 -->
        <n-tab-pane name="print" tab="打印任务">
          <n-data-table
            :columns="printJobColumns"
            :data="printJobs"
            :pagination="{ pageSize: 20 }"
            :loading="loadingPrintJobs"
            :bordered="false"
            style="margin-bottom: 16px"
          />

          <n-divider />

          <n-form :model="printForm" label-placement="top">
            <n-form-item label="打印内容" required>
              <n-input
                v-model:value="printForm.content"
                type="textarea"
                :rows="4"
                placeholder="输入要打印的内容..."
              />
            </n-form-item>
            <n-form-item label="输出类型" required>
              <n-select
                v-model:value="printForm.outputType"
                :options="outputTypeOptions"
                placeholder="选择输出类型"
              />
            </n-form-item>
            <n-space justify="end">
              <n-button
                type="primary"
                :loading="submittingPrint"
                :disabled="!printForm.content || !printForm.outputType"
                @click="handlePrint"
              >
                提交打印
              </n-button>
            </n-space>
          </n-form>
        </n-tab-pane>

        <!-- NFC写入 -->
        <n-tab-pane name="nfc" tab="NFC写入">
          <n-form :model="nfcForm" label-placement="top">
            <n-form-item label="写入内容" required>
              <n-input
                v-model:value="nfcForm.text"
                placeholder="输入要写入 NFC 标签的内容..."
              />
            </n-form-item>
            <n-form-item label="数据格式" required>
              <n-select
                v-model:value="nfcForm.format"
                :options="nfcFormatOptions"
                placeholder="选择数据格式"
              />
            </n-form-item>
            <n-space justify="end">
              <n-button
                type="primary"
                :loading="submittingNfc"
                :disabled="!nfcForm.text || !nfcForm.format"
                @click="handleNfcWrite"
              >
                写入 NFC
              </n-button>
            </n-space>
          </n-form>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  NPageHeader,
  NCard,
  NTabs,
  NTabPane,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NSpace,
  NDivider,
  useMessage,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { hardwareApi } from '@/api/client';

const message = useMessage();
const activeTab = ref('devices');

// ── 设备列表 ──
const devices = ref<any[]>([]);
const loadingDevices = ref(false);

const deviceColumns: DataTableColumns<any> = [
  { title: '设备名称', key: 'name', width: 180 },
  { title: '类型', key: 'type', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: '序列号', key: 'serial', width: 180 },
  { title: '最后在线', key: 'lastSeen', width: 160 },
  { title: '备注', key: 'notes', ellipsis: { tooltip: true } },
];

// ── 打印任务 ──
const printJobs = ref<any[]>([]);
const loadingPrintJobs = ref(false);
const submittingPrint = ref(false);

const printForm = reactive({
  content: '',
  outputType: '',
});

const outputTypeOptions = [
  { label: '热敏票据', value: 'thermal' },
  { label: 'A4 标签', value: 'a4_label' },
  { label: 'A4 文档', value: 'a4_document' },
  { label: '便签 (80mm)', value: 'note_80mm' },
];

const printJobColumns: DataTableColumns<any> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '内容预览', key: 'content', ellipsis: { tooltip: true } },
  { title: '输出类型', key: 'outputType', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '提交时间', key: 'createdAt', width: 160 },
];

// ── NFC 写入 ──
const nfcForm = reactive({
  text: '',
  format: '',
});
const submittingNfc = ref(false);

const nfcFormatOptions = [
  { label: '纯文本 (Text)', value: 'text' },
  { label: 'URL', value: 'url' },
  { label: 'WiFi 配置', value: 'wifi' },
  { label: 'vCard 名片', value: 'vcard' },
  { label: 'JSON 数据', value: 'json' },
];

// ── 数据加载 ──
async function loadDevices() {
  loadingDevices.value = true;
  try {
    const { data } = await hardwareApi.listDevices();
    devices.value = data.data || data;
  } catch (e: any) {
    message.error('加载设备列表失败');
  } finally {
    loadingDevices.value = false;
  }
}

async function loadPrintJobs() {
  loadingPrintJobs.value = true;
  try {
    const { data } = await hardwareApi.listPrintJobs();
    printJobs.value = data.data || data;
  } catch (e: any) {
    message.error('加载打印任务失败');
  } finally {
    loadingPrintJobs.value = false;
  }
}

// ── 打印 ──
async function handlePrint() {
  if (!printForm.content || !printForm.outputType) return;
  submittingPrint.value = true;
  try {
    await hardwareApi.print({
      content: printForm.content,
      outputType: printForm.outputType,
    });
    message.success('打印任务已提交');
    printForm.content = '';
    printForm.outputType = '';
    loadPrintJobs();
  } catch (e: any) {
    message.error('提交打印任务失败');
  } finally {
    submittingPrint.value = false;
  }
}

// ── NFC 写入 ──
async function handleNfcWrite() {
  if (!nfcForm.text || !nfcForm.format) return;
  submittingNfc.value = true;
  // 等待用户将 NFC 标签靠近写入器
  try {
    await hardwareApi.nfcWrite({
      text: nfcForm.text,
      format: nfcForm.format,
    });
    message.success('NFC 写入成功');
    nfcForm.text = '';
    nfcForm.format = '';
  } catch (e: any) {
    message.error('NFC 写入失败');
  } finally {
    submittingNfc.value = false;
  }
}

onMounted(() => {
  loadDevices();
  loadPrintJobs();
});
</script>

<style scoped>
.hardware-page {
  max-width: 1100px;
}
</style>