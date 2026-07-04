<template>
  <div class="recipes-page">
    <n-page-header :title="t('recipe.title')" :subtitle="t('recipe.subtitle')">
      <template #extra>
        <n-space>
          <n-input v-model:value="searchQuery" placeholder="搜索食谱..." style="width: 200px" clearable />
          <n-button type="primary" @click="showCreateModal = true">{{ t('recipe.addRecipe') }}</n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 食谱推荐 -->
    <n-card :title="t('recipe.recommendations')" class="page-section" v-if="recommendations.length > 0">
      <n-grid :cols="3" :x-gap="16">
        <n-gi v-for="recipe in recommendations" :key="recipe.id">
          <n-card class="recipe-card hover-card" size="small" @click="openRecipe(recipe)">
            <div class="recipe-name">{{ recipe.name }}</div>
            <div class="recipe-desc">{{ recipe.description || '暂无描述' }}</div>
            <n-space style="margin-top: 8px">
              <n-tag size="small" type="info">{{ recipe.prepTime || 0 }}分钟</n-tag>
              <n-tag size="small" type="success">{{ recipe.servings || 2 }}人份</n-tag>
            </n-space>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 食谱列表 -->
    <n-card :title="t('recipe.allRecipes')" class="page-section">
      <n-grid :cols="3" :x-gap="16">
        <n-gi v-for="recipe in filteredRecipes" :key="recipe.id">
          <n-card class="recipe-card hover-card" size="small" @click="openRecipe(recipe)">
            <div class="recipe-name">{{ recipe.name }}</div>
            <div class="recipe-desc">{{ recipe.description || '暂无描述' }}</div>
            <div class="recipe-meta">
              <n-tag size="small">{{ t('recipe.ingredientCount') }}: {{ recipe.ingredients?.length || 0 }}</n-tag>
              <n-tag size="small">{{ t('recipe.stepCount') }}: {{ recipe.steps?.length || 0 }}</n-tag>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
      <n-empty v-if="filteredRecipes.length === 0" description="暂无食谱" />
    </n-card>

    <!-- 创建食谱弹窗 -->
    <n-modal v-model:show="showCreateModal" :title="t('recipe.addRecipe')" preset="card" style="max-width: 600px">
      <n-form :model="createForm">
        <n-form-item :label="t('recipe.recipeName')" required>
          <n-input v-model:value="createForm.name" placeholder="如：番茄炒蛋" />
        </n-form-item>
        <n-form-item :label="t('common.description')">
          <n-input v-model:value="createForm.description" type="textarea" placeholder="可选描述" />
        </n-form-item>
        <n-form-item :label="t('common.notes')">
          <n-input v-model:value="createForm.notes" type="textarea" placeholder="可选备注" />
        </n-form-item>
        <n-form-item :label="t('recipe.prepTime')">
          <n-input-number v-model:value="createForm.prepTime" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('recipe.cookTime')">
          <n-input-number v-model:value="createForm.cookTime" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('recipe.servings')">
          <n-input-number v-model:value="createForm.servings" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('recipe.ingredients')">
          <n-input v-model:value="createForm.ingredientsText" type="textarea" :placeholder="t('recipe.ingredientsHint')" />
        </n-form-item>
        <n-form-item :label="t('recipe.steps')">
          <n-input v-model:value="createForm.stepsText" type="textarea" :placeholder="t('recipe.stepsHint')" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 食谱详情弹窗 -->
    <n-modal v-model:show="showDetailModal" :title="currentRecipe?.name" preset="card" style="max-width: 600px">
      <div v-if="currentRecipe">
        <p style="color: var(--hh-text-secondary); margin-bottom: 16px">{{ currentRecipe.description || '暂无描述' }}</p>
        <p v-if="currentRecipe.notes" style="color: var(--hh-text-secondary); margin-bottom: 16px"><strong>备注：</strong>{{ currentRecipe.notes }}</p>
        <n-divider />
        <h4>食材</h4>
        <n-list>
          <n-list-item v-for="(ing, i) in (currentRecipe.ingredients || [])" :key="i">
            {{ ing.itemName }} - {{ ing.quantity }} {{ ing.unit }}
          </n-list-item>
        </n-list>
        <n-divider />
        <h4>步骤</h4>
        <n-list numbered>
          <n-list-item v-for="(step, i) in (currentRecipe.steps || [])" :key="i">
            {{ step.instruction }}
          </n-list-item>
        </n-list>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { NPageHeader, NButton, NSpace, NInput, NCard, NGrid, NGi, NEmpty, NModal, NForm, NFormItem, NInputNumber, NList, NListItem, NTag, NDivider, useMessage } from 'naive-ui';
import { useI18n } from '@/locales';
import { recipesApi } from '@/api/client';

const { t } = useI18n();
const message = useMessage();

const searchQuery = ref('');
const recipes = ref<any[]>([]);
const recommendations = ref<any[]>([]);
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const currentRecipe = ref<any>(null);

const createForm = reactive({
  name: '',
  description: '',
  notes: '',
  prepTime: 10,
  cookTime: 15,
  servings: 2,
  ingredientsText: '[]',
  stepsText: '[]',
});

const filteredRecipes = computed(() => {
  if (!searchQuery.value) return recipes.value;
  return recipes.value.filter(r => r.name.includes(searchQuery.value));
});

const loadRecipes = async () => {
  try {
    const [listRes, recRes] = await Promise.all([
      recipesApi.list(),
      recipesApi.getRecommendations(3),
    ]);
    recipes.value = listRes.data || [];
    recommendations.value = recRes.data || [];
  } catch (e) {
    // 忽略
  }
};

const handleCreate = async () => {
  if (!createForm.name) {
    message.warning('请输入食谱名称');
    return;
  }
  try {
    const ingredients = JSON.parse(createForm.ingredientsText || '[]');
    const steps = JSON.parse(createForm.stepsText || '[]');
    await recipesApi.create({
      name: createForm.name,
      description: createForm.description,
      notes: createForm.notes,
      prepTime: createForm.prepTime,
      cookTime: createForm.cookTime,
      servings: createForm.servings,
      ingredients,
      steps,
    });
    message.success(t('recipe.createSuccess'));
    showCreateModal.value = false;
    loadRecipes();
  } catch (e: any) {
    message.error(e.response?.data?.message || '创建失败');
  }
};

const openRecipe = (recipe: any) => {
  currentRecipe.value = recipe;
  showDetailModal.value = true;
};

onMounted(() => {
  loadRecipes();
});
</script>

<style scoped>
.recipes-page {
  max-width: 1200px;
  margin: 0 auto;
}

.recipe-card {
  cursor: pointer;
  margin-bottom: 16px;
}

.recipe-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.recipe-desc {
  font-size: 13px;
  color: var(--hh-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-meta {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
