<template>
  <div class="register-page">
    <div class="register-header">
      <AuthToolbar />
    </div>

    <div class="register-container">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="brand-logo">🏠</div>
          <h1 class="brand-title">HomeHub</h1>
          <p class="brand-subtitle">创建你的家庭空间</p>
          <div class="brand-stats">
            <div class="stat-item">
              <span class="stat-number">1000+</span>
              <span class="stat-label">活跃家庭</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">50000+</span>
              <span class="stat-label">物品管理</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">99.9%</span>
              <span class="stat-label">可用性</span>
            </div>
          </div>
        </div>
        <div class="brand-decoration">
          <div class="decoration-circle"></div>
        </div>
      </div>

      <!-- 右侧注册表单 -->
      <div class="register-section">
        <div class="register-card">
          <div class="register-header-content">
            <h2 class="register-title">创建账户</h2>
            <p class="register-subtitle">开始管理你的家庭库存</p>
          </div>

          <n-form @submit.prevent="handleRegister" class="register-form">
            <n-form-item :label="t('auth.name')">
              <n-input
                v-model:value="form.name"
                :placeholder="t('auth.name')"
                size="large"
                class="modern-input"
              >
                <template #prefix>
                  <n-icon :size="18"><PersonOutline /></n-icon>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item :label="t('auth.email')">
              <n-input
                v-model:value="form.email"
                :placeholder="t('auth.email')"
                size="large"
                class="modern-input"
              >
                <template #prefix>
                  <n-icon :size="18"><MailOutline /></n-icon>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item :label="t('auth.password')">
              <n-input
                v-model:value="form.password"
                type="password"
                :placeholder="t('auth.password')"
                size="large"
                show-password-on="click"
                class="modern-input"
              >
                <template #prefix>
                  <n-icon :size="18"><LockClosedOutline /></n-icon>
                </template>
              </n-input>
            </n-form-item>

            <n-button
              type="primary"
              block
              size="large"
              :loading="loading"
              class="register-btn"
              @click="handleRegister"
            >
              {{ t('auth.registerButton') }}
            </n-button>
          </n-form>

          <div class="register-footer">
            <span>{{ t('auth.hasAccount') }}</span>
            <router-link to="/login" class="login-link">立即登录</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui';
import { PersonOutline, MailOutline, LockClosedOutline } from '@vicons/ionicons5';
import { useAuthStore } from '@/stores/auth.store';
import { useI18n } from '@/locales';
import AuthToolbar from '@/components/AuthToolbar.vue';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const { t } = useI18n();
const loading = ref(false);
const form = reactive({ name: '', email: '', password: '' });

const handleRegister = async () => {
  loading.value = true;
  try {
    await authStore.register(form.name, form.email, form.password);
    message.success(t('auth.registerSuccess'));
    router.push('/dashboard');
  } catch (e: any) {
    const errMsg = typeof e.response?.data?.message === 'string'
      ? e.response.data.message
      : t('common.error');
    message.error(errMsg);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: var(--hh-bg);
}

.register-header {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
}

.register-container {
  display: flex;
  min-height: 100vh;
}

.brand-section {
  flex: 1;
  background: var(--hh-gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
  overflow: hidden;
}

.brand-content {
  position: relative;
  z-index: 1;
  color: white;
}

.brand-logo {
  font-size: 64px;
  margin-bottom: 24px;
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 12px;
}

.brand-subtitle {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 48px;
}

.brand-stats {
  display: flex;
  gap: 48px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

.brand-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.decoration-circle {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  top: -100px;
  right: -100px;
}

.register-section {
  width: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.register-card {
  width: 100%;
  max-width: 400px;
}

.register-header-content {
  margin-bottom: 40px;
}

.register-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--hh-text);
  margin-bottom: 8px;
}

.register-subtitle {
  font-size: 15px;
  color: var(--hh-text-secondary);
}

.register-form {
  margin-bottom: 24px;
}

.register-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
}

.register-footer {
  text-align: center;
  font-size: 14px;
  color: var(--hh-text-secondary);
}

.login-link {
  color: var(--hh-primary);
  font-weight: 500;
  text-decoration: none;
  margin-left: 4px;
}

.login-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .brand-section {
    display: none;
  }

  .register-section {
    width: 100%;
    padding: 24px;
  }
}
</style>
