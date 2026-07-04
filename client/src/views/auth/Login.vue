<template>
  <div class="login-page">
    <div class="login-header">
      <AuthToolbar />
    </div>

    <div class="login-container">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="brand-logo">
            <svg width="56" height="56" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="24" height="24" rx="6" fill="white" fill-opacity="0.2"/>
              <text x="14" y="19" text-anchor="middle" fill="white" font-size="13" font-weight="600" font-family="Inter, sans-serif">HH</text>
            </svg>
          </div>
          <h1 class="brand-title">HomeHub</h1>
          <p class="brand-subtitle">现代化家庭库存管理系统</p>
          <div class="brand-features">
            <div class="feature-item">
              <div class="feature-icon-wrap">
                <n-icon :size="20"><CubeOutline /></n-icon>
              </div>
              <span>智能库存管理</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon-wrap">
                <n-icon :size="20"><PhonePortraitOutline /></n-icon>
              </div>
              <span>NFC 一碰即查</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon-wrap">
                <n-icon :size="20"><HardwareChipOutline /></n-icon>
              </div>
              <span>AI 智能助手</span>
            </div>
          </div>
        </div>
        <div class="brand-decoration">
          <div class="decoration-circle"></div>
          <div class="decoration-circle small"></div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="login-section">
        <div class="login-card">
          <div class="login-header-content">
            <h2 class="login-title">欢迎回来</h2>
            <p class="login-subtitle">登录你的账户以继续</p>
          </div>

          <n-form @submit.prevent="handleLogin" class="login-form">
            <n-form-item label="邮箱或用户名">
              <n-input
                v-model:value="form.account"
                placeholder="请输入邮箱或用户名"
                size="large"
                class="modern-input"
              >
                <template #prefix>
                  <n-icon :size="18"><PersonOutline /></n-icon>
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
              class="login-btn"
              @click="handleLogin"
            >
              {{ t('auth.loginButton') }}
            </n-button>
          </n-form>

          <div class="login-footer">
            <span>{{ t('auth.noAccount') }}</span>
            <router-link to="/register" class="register-link">立即注册</router-link>
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
import { PersonOutline, LockClosedOutline, CubeOutline, PhonePortraitOutline, HardwareChipOutline } from '@vicons/ionicons5';
import { useAuthStore } from '@/stores/auth.store';
import { useI18n } from '@/locales';
import AuthToolbar from '@/components/AuthToolbar.vue';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const { t } = useI18n();
const loading = ref(false);
const form = reactive({ account: '', password: '' });

const handleLogin = async () => {
  loading.value = true;
  try {
    await authStore.login(form.account, form.password);
    message.success(t('auth.loginSuccess'));
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
.login-page {
  min-height: 100vh;
  background: var(--hh-bg);
}

.login-header {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
}

.login-container {
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
  width: 56px;
  height: 56px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
}

.feature-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
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

.decoration-circle.small {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
}

.login-section {
  width: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-header-content {
  margin-bottom: 40px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--hh-text);
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 15px;
  color: var(--hh-text-secondary);
}

.login-form {
  margin-bottom: 24px;
}

.login-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
}

.login-footer {
  text-align: center;
  font-size: 14px;
  color: var(--hh-text-secondary);
}

.register-link {
  color: var(--hh-primary);
  font-weight: 500;
  text-decoration: none;
  margin-left: 4px;
}

.register-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .brand-section {
    display: none;
  }

  .login-section {
    width: 100%;
    padding: 24px;
  }
}
</style>
