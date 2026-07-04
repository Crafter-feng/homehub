<template>
  <div class="settings-page">
    <n-page-header :title="t('settings.title')" :subtitle="t('settings.subtitle')" />

    <!-- 个人资料 -->
    <n-card :title="t('settings.profile')" class="page-section">
      <div class="profile-section">
        <!-- 头像区域 -->
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <n-avatar round :size="100" :src="profileForm.avatar" class="profile-avatar">
              {{ profileForm.name?.charAt(0) || 'U' }}
            </n-avatar>
            <n-button size="small" class="avatar-change-btn" @click="showAvatarModal = true">
              {{ t('settings.changeAvatar') }}
            </n-button>
          </div>
        </div>

        <!-- 表单区域 -->
        <div class="form-section">
          <n-form :model="profileForm" label-placement="left" label-width="80">
            <n-form-item :label="t('auth.name')">
              <n-input v-model:value="profileForm.name" />
            </n-form-item>
            <n-form-item :label="t('auth.email')">
              <n-input v-model:value="profileForm.email" />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="saveProfile" :loading="saving">{{ t('common.save') }}</n-button>
            </n-form-item>
          </n-form>
        </div>
      </div>
    </n-card>

    <!-- 家庭空间 -->
    <n-card :title="t('settings.family')" class="page-section">
      <template #header-extra>
        <n-button text type="primary" @click="showJoinModal = true">{{ t('settings.joinFamily') }}</n-button>
      </template>
      <div v-if="family">
        <n-descriptions bordered :column="2">
          <n-descriptions-item :label="t('settings.familyName')">{{ family.name }}</n-descriptions-item>
          <n-descriptions-item :label="t('settings.inviteCode')">{{ family.inviteCode }}</n-descriptions-item>
          <n-descriptions-item :label="t('settings.role')">{{ family.role === 'admin' ? t('settings.admin') : t('settings.member') }}</n-descriptions-item>
        </n-descriptions>
      </div>
      <n-empty v-else :description="t('settings.noFamily')" />
    </n-card>

    <!-- API Token -->
    <n-card :title="t('settings.apiTokens')" class="page-section">
      <template #header-extra>
        <n-button text type="primary" @click="showTokenModal = true">{{ t('settings.createToken') }}</n-button>
      </template>
      <n-data-table :columns="tokenColumns" :data="tokens" />
    </n-card>

    <!-- 修改密码 -->
    <n-card :title="t('settings.changePassword')" class="page-section">
      <n-form :model="passwordForm" label-placement="left" label-width="80" style="max-width: 400px">
        <n-form-item :label="t('settings.oldPassword')">
          <n-input v-model:value="passwordForm.oldPassword" type="password" show-password-on="click" />
        </n-form-item>
        <n-form-item :label="t('settings.newPassword')">
          <n-input v-model:value="passwordForm.newPassword" type="password" show-password-on="click" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="changePassword">{{ t('settings.changePassword') }}</n-button>
        </n-form-item>
      </n-form>
    </n-card>

    <!-- 头像更换弹窗 -->
    <n-modal v-model:show="showAvatarModal" :title="t('settings.changeAvatar')" preset="card" style="max-width: 500px">
      <div class="avatar-preview">
        <n-avatar round :size="120" :src="avatarPreview || profileForm.avatar" class="preview-avatar">
          {{ profileForm.name?.charAt(0) || 'U' }}
        </n-avatar>
      </div>

      <!-- 上传图片 -->
      <div class="upload-section">
        <n-upload
          :max="1"
          accept="image/*"
          :default-upload="false"
          @change="handleFileChange"
          list-type="image-card"
        >
          <div class="upload-trigger">
            <n-icon size="24"><ImageOutline /></n-icon>
            <span>{{ t('settings.selectImage') }}</span>
          </div>
        </n-upload>
      </div>

      <n-divider>或</n-divider>

      <!-- URL输入 -->
      <n-form-item :label="t('settings.imageUrl')">
        <n-input v-model:value="avatarPreview" placeholder="输入图片URL" />
      </n-form-item>

      <!-- 预设头像 -->
      <n-form-item :label="t('settings.selectColor')">
        <n-space>
          <div v-for="(color, i) in presetColors" :key="i" class="preset-avatar" :style="{ background: color }" @click="selectPresetColor(color)">
            {{ profileForm.name?.charAt(0) || 'U' }}
          </div>
        </n-space>
      </n-form-item>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showAvatarModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="confirmAvatar" :loading="uploading">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 加入家庭弹窗 -->
    <n-modal v-model:show="showJoinModal" :title="t('settings.joinFamily')" preset="card" style="max-width: 400px">
      <n-form-item :label="t('settings.inviteCode')">
        <n-input v-model:value="joinCode" :placeholder="t('settings.enterInviteCode')" />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showJoinModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="joinFamily">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 创建Token弹窗 -->
    <n-modal v-model:show="showTokenModal" :title="t('settings.createToken')" preset="card" style="max-width: 400px">
      <n-form-item :label="t('settings.tokenName')">
        <n-input v-model:value="tokenForm.name" :placeholder="t('settings.enterTokenName')" />
      </n-form-item>
      <n-form-item :label="t('settings.permissions')">
        <n-select v-model:value="tokenForm.permissions" :options="permissionOptions" multiple />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTokenModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="createToken">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Token显示弹窗 -->
    <n-modal v-model:show="showTokenValue" :title="t('settings.tokenCreated')" preset="card" style="max-width: 400px">
      <n-alert type="warning" :title="t('settings.tokenWarning')" style="margin-bottom: 16px">
        {{ t('settings.tokenOnceOnly') }}
      </n-alert>
      <n-input :value="createdTokenValue" readonly />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue';
import { NPageHeader, NCard, NForm, NFormItem, NInput, NButton, NSpace, NDataTable, NModal, NSelect, NDescriptions, NDescriptionsItem, NEmpty, NAlert, NIcon, NAvatar, NUpload, NDivider, useMessage } from 'naive-ui';
import type { DataTableColumns, UploadFileInfo } from 'naive-ui';
import { TrashOutline, ImageOutline } from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import { authApi, familiesApi, usersApi } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';

const { t } = useI18n();
const message = useMessage();

const saving = ref(false);
const uploading = ref(false);
const profileForm = reactive({ id: null as number | null, name: '', email: '', avatar: '' });
const passwordForm = reactive({ oldPassword: '', newPassword: '' });
const family = ref<any>(null);
const tokens = ref<any[]>([]);

const showJoinModal = ref(false);
const showTokenModal = ref(false);
const showTokenValue = ref(false);
const showAvatarModal = ref(false);
const joinCode = ref('');
const createdTokenValue = ref('');
const avatarPreview = ref('');
const tokenForm = reactive({ name: '', permissions: ['read'] });

const presetColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const permissionOptions = [
  { label: '只读', value: 'read' },
  { label: '读写', value: 'write' },
  { label: '管理', value: 'admin' },
];

const tokenColumns: DataTableColumns<any> = [
  { title: '名称', key: 'name' },
  { title: '前缀', key: 'tokenPrefix' },
  { title: '权限', key: 'permissions', render: (row) => (row.permissions || []).join(', ') },
  { title: '最后使用', key: 'lastUsedAt', render: (row) => row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString('zh-CN') : '从未' },
  {
    title: '操作', key: 'actions', width: 60,
    render: (row) => h(NButton, { size: 'small', type: 'error', text: true, onClick: () => revokeToken(row.id) }, {
      icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
    }),
  },
];

const loadProfile = async () => {
  try {
    const { data } = await authApi.me();
    profileForm.id = data.id;
    profileForm.name = data.name || '';
    profileForm.email = data.email || '';
    profileForm.avatar = data.avatar || '';
    family.value = data.family;
  } catch (e) {
    // 忽略
  }
};

const loadTokens = async () => {
  try {
    const { data } = await authApi.listTokens();
    tokens.value = data || [];
  } catch (e) {
    // 忽略
  }
};

const authStore = useAuthStore();
const saveProfile = async () => {
  saving.value = true;
  try {
    await usersApi.updateProfile({ name: profileForm.name, email: profileForm.email, avatar: profileForm.avatar });
    message.success(t('settings.saveSuccess'));
    authStore.fetchProfile();
  } catch (e: any) {
    message.error(t('settings.saveFail'));
  } finally {
    saving.value = false;
  }
};

const handleFileChange = async (options: { fileList: UploadFileInfo[] }) => {
  const file = options.fileList[0]?.file;
  if (!file) return;
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await usersApi.uploadAvatar(formData);
    if (data.url) {
      profileForm.avatar = data.url;
      avatarPreview.value = data.url;
      message.success('头像上传成功');
    }
  } catch (e: any) {
    message.error('上传失败');
  } finally {
    uploading.value = false;
  }
};

const selectPresetColor = (color: string) => {
  const initial = profileForm.name?.charAt(0) || 'U';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' rx='100' fill='${color}'/><text x='100' y='115' text-anchor='middle' fill='white' font-size='80' font-weight='600' font-family='Inter,sans-serif'>${initial}</text></svg>`;
  avatarPreview.value = `data:image/svg+xml;base64,${btoa(svg)}`;
};

const confirmAvatar = () => {
  if (avatarPreview.value && !avatarPreview.value.startsWith('/uploads/')) {
    profileForm.avatar = avatarPreview.value;
  }
  showAvatarModal.value = false;
};

const changePassword = async () => {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    message.warning('请填写完整');
    return;
  }
  try {
    await usersApi.changePassword(passwordForm);
    message.success(t('settings.passwordSuccess'));
    Object.assign(passwordForm, { oldPassword: '', newPassword: '' });
  } catch (e: any) {
    message.error(t('settings.passwordFail'));
  }
};

const joinFamily = async () => {
  if (!joinCode.value) {
    message.warning(t('settings.enterInviteCode'));
    return;
  }
  try {
    await familiesApi.join({ inviteCode: joinCode.value });
    message.success(t('settings.joinSuccess'));
    showJoinModal.value = false;
    loadProfile();
  } catch (e: any) {
    message.error(e.response?.data?.message || t('settings.joinFail'));
  }
};

const createToken = async () => {
  if (!tokenForm.name) {
    message.warning(t('settings.tokenName'));
    return;
  }
  try {
    const { data } = await authApi.createToken(tokenForm);
    createdTokenValue.value = data.token;
    showTokenValue.value = true;
    showTokenModal.value = false;
    loadTokens();
  } catch (e: any) {
    message.error('创建失败');
  }
};

const revokeToken = async (id: number) => {
  try {
    await authApi.revokeToken(id);
    message.success('已删除');
    loadTokens();
  } catch (e: any) {
    message.error('删除失败');
  }
};

onMounted(() => {
  loadProfile();
  loadTokens();
});
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 0 auto;
}

.profile-section {
  display: flex;
  gap: 40px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.profile-avatar {
  background: var(--hh-gradient-primary);
  color: white;
  font-size: 36px;
  font-weight: 600;
}

.form-section {
  flex: 1;
}

.avatar-preview {
  display: flex;
  justify-content: center;
}

.preview-avatar {
  background: var(--hh-gradient-primary);
  color: white;
  font-size: 42px;
  font-weight: 600;
}

.preset-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.preset-avatar:hover {
  transform: scale(1.1);
}

@media (max-width: 600px) {
  .profile-section {
    flex-direction: column;
    align-items: center;
  }
}
</style>
