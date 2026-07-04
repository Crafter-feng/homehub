import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/client';
import { TokenStorage } from '@/utils/token-storage';
import type { User, Family } from '@/shared/types';

interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  user: { id: number; email: string };
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const family = ref<Family | null>(null);
  const accessToken = ref<string | null>(TokenStorage.getAccessToken());
  const refreshToken = ref<string | null>(TokenStorage.getRefreshToken());

  const isLoggedIn = computed(() => !!accessToken.value);

  async function login(account: string, password: string): Promise<AuthResponseData> {
    const { data: response } = await authApi.login({ account, password });
    const responseData = response as AuthResponseData;
    accessToken.value = responseData.accessToken;
    refreshToken.value = responseData.refreshToken;
    TokenStorage.setAccessToken(responseData.accessToken);
    TokenStorage.setRefreshToken(responseData.refreshToken);
    return responseData;
  }

  async function register(name: string, email: string, password: string): Promise<AuthResponseData> {
    const { data: response } = await authApi.register({ name, email, password });
    const responseData = response as AuthResponseData;
    accessToken.value = responseData.accessToken;
    refreshToken.value = responseData.refreshToken;
    TokenStorage.setAccessToken(responseData.accessToken);
    TokenStorage.setRefreshToken(responseData.refreshToken);
    return responseData;
  }

  async function fetchProfile() {
    try {
      const { data } = await authApi.me();
      user.value = data;
      family.value = data.family;
    } catch (_e) {
      // 不清除 token，让页面自己判断
    }
  }

  /** 静默刷新 accessToken — 由 api client 拦截器自动调用，也可供路由守卫手动调用 */
  async function silentRefresh(): Promise<string> {
    const currentRefreshToken = TokenStorage.getRefreshToken();
    if (!currentRefreshToken) {
      throw new Error('No refresh token available');
    }
    const { data: response } = await authApi.refresh(currentRefreshToken);
    const responseData = response as AuthResponseData;
    accessToken.value = responseData.accessToken;
    refreshToken.value = responseData.refreshToken;
    TokenStorage.setAccessToken(responseData.accessToken);
    TokenStorage.setRefreshToken(responseData.refreshToken);
    return responseData.accessToken;
  }

  function logout() {
    user.value = null;
    family.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    TokenStorage.clearAll();
  }

  return {
    user,
    family,
    accessToken,
    refreshToken,
    isLoggedIn,
    login,
    register,
    fetchProfile,
    silentRefresh,
    logout,
  };
});
