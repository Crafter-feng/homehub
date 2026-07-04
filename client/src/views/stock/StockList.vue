<template>
  <div class="stock-page">
    <!-- Page Header -->
    <div class="stock-page-header">
      <div class="stock-page-header-left">
        <h2 class="stock-page-title">{{ t('stock.title') }}</h2>
        <span class="stock-page-subtitle">{{ stockStore.items.length }} 个物品</span>
      </div>
      <div class="stock-page-header-right">
        <n-button v-if="!auditActive" size="small" @click="startAudit">
          <template #icon><n-icon :size="16"><ClipboardOutline /></n-icon></template>
          {{ t('stock.startInventory') }}
        </n-button>
        <n-button v-else type="warning" size="small" @click="cancelAudit">
          <template #icon><n-icon :size="16"><CloseOutline /></n-icon></template>
          {{ t('stock.cancelInventory') }}
        </n-button>
        <n-button v-if="auditActive" type="success" size="small" @click="confirmCompleteAudit">
          <template #icon><n-icon :size="16"><CheckmarkCircleOutline /></n-icon></template>
          {{ t('stock.completeInventory') }}
        </n-button>
        <n-button type="primary" size="small" @click="openQuickStockIn">
          <template #icon><n-icon :size="16"><AddOutline /></n-icon></template>
          快速入库
        </n-button>
      </div>
    </div>

    <!-- Alert Banner (优化7: 预警横幅) -->
    <div v-if="hasAlerts" class="alert-banner">
      <div
        v-if="expiredCount > 0"
        class="alert-item alert-item--error"
        @click="filterStatus = 'expired'"
      >
        <n-icon :size="16"><AlertCircleOutline /></n-icon>
        <span>{{ expiredCount }} 个已过期</span>
      </div>
      <div
        v-if="expiringCount > 0"
        class="alert-item alert-item--warning"
        @click="filterStatus = 'expiring'"
      >
        <n-icon :size="16"><WarningOutline /></n-icon>
        <span>{{ expiringCount }} 个即将过期</span>
      </div>
    </div>

    <!-- Stats Overview (优化5: 总库存价值) -->
    <div class="stats-overview">
      <div
        class="stat-card"
        :class="['stat-card--primary', { 'stat-card--active': filterStatus === null }]"
        @click="filterStatus = null"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><CubeOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">全部</span>
          <span class="stat-value">{{ stockStore.items.length }}</span>
        </div>
      </div>
      <div
        class="stat-card"
        :class="['stat-card--warning', { 'stat-card--active': filterStatus === 'expiring' }]"
        @click="filterStatus = filterStatus === 'expiring' ? null : 'expiring'"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><WarningOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">即将过期</span>
          <span class="stat-value">{{ expiringCount }}</span>
        </div>
      </div>
      <div
        class="stat-card"
        :class="['stat-card--error', { 'stat-card--active': filterStatus === 'expired' }]"
        @click="filterStatus = filterStatus === 'expired' ? null : 'expired'"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><AlertCircleOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">已过期</span>
          <span class="stat-value">{{ expiredCount }}</span>
        </div>
      </div>
      <div
        class="stat-card"
        :class="['stat-card--danger', { 'stat-card--active': filterStatus === 'lowStock' }]"
        @click="filterStatus = filterStatus === 'lowStock' ? null : 'lowStock'"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><ArrowDownOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">低库存</span>
          <span class="stat-value">{{ lowStockCount }}</span>
        </div>
      </div>
      <div
        class="stat-card"
        :class="['stat-card--success', { 'stat-card--active': filterStatus === 'normal' }]"
        @click="filterStatus = filterStatus === 'normal' ? null : 'normal'"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><WalletOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">库存价值</span>
          <span class="stat-value">¥{{ totalStockValue }}</span>
        </div>
      </div>
    </div>

    <!-- Audit Panel (collapsible) -->
    <n-collapse-transition :show="auditActive">
      <div class="audit-panel">
        <div class="audit-panel-header">
          <div class="audit-panel-title">
            <n-icon :size="18" color="var(--hh-primary)"><ClipboardOutline /></n-icon>
            <span>{{ t('stock.inventoryCount') }}</span>
          </div>
          <div class="audit-panel-stats">
            <n-tag type="info" size="small" round>{{ countedCount }} / {{ stockStore.items.length }} {{ t('stock.counted') }}</n-tag>
            <n-tag :type="discrepancyCount > 0 ? 'error' : 'success'" size="small" round>
              {{ discrepancyCount }} {{ t('stock.discrepancies') }}
            </n-tag>
          </div>
        </div>
        <div class="audit-progress">
          <div class="audit-progress-info">
            <span>{{ t('stock.auditProgress') }}</span>
            <span class="audit-progress-percent">{{ progressPercent }}%</span>
          </div>
          <n-progress
            type="line"
            :percentage="progressPercent"
            :color="'var(--hh-primary)'"
            :rail-color="'var(--hh-primary-light)'"
            :show-indicator="false"
            :height="8"
            :border-radius="4"
          />
        </div>
        <div class="audit-filter">
          <n-input
            v-model:value="auditSearchQuery"
            :placeholder="t('common.search')"
            clearable
            size="small"
            style="max-width: 200px"
          >
            <template #prefix><n-icon :size="14"><SearchOutline /></n-icon></template>
          </n-input>
          <n-select
            v-model:value="auditFilterStatus"
            :placeholder="t('stock.filterStatus')"
            :options="auditStatusOptions"
            clearable
            size="small"
            style="width: 140px"
          />
        </div>
      </div>
    </n-collapse-transition>

    <!-- Search + Filter Bar (优化9: 过滤器增强) -->
    <div class="filter-bar">
      <n-input
        v-model:value="searchQuery"
        :placeholder="t('common.search')"
        clearable
        size="small"
        class="search-input"
      >
        <template #prefix>
          <n-icon :size="16"><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-select
        v-model:value="filterCategory"
        :placeholder="t('stock.category')"
        :options="categoryOptions"
        clearable
        size="small"
        class="filter-select"
      />
      <n-select
        v-model:value="filterLocation"
        :placeholder="t('stock.location')"
        :options="locationOptions"
        clearable
        size="small"
        class="filter-select"
      />
      <n-select
        v-model:value="filterStatus"
        :placeholder="t('stock.status')"
        :options="statusFilterOptions"
        clearable
        size="small"
        class="filter-select"
      />
      <n-button
        v-if="hasActiveFilters"
        size="small"
        quaternary
        @click="clearAllFilters"
      >
        <template #icon><n-icon :size="16"><CloseOutline /></n-icon></template>
        清除
      </n-button>
      <div class="view-toggle">
        <n-button-group size="small">
          <n-button :type="viewMode === 'table' ? 'primary' : 'default'" @click="viewMode = 'table'">
            <template #icon><n-icon :size="16"><ListOutline /></n-icon></template>
          </n-button>
          <n-button :type="viewMode === 'card' ? 'primary' : 'default'" @click="viewMode = 'card'">
            <template #icon><n-icon :size="16"><GridOutline /></n-icon></template>
          </n-button>
          <n-popover v-if="groupableColumns.length" trigger="click" placement="bottom-end">
            <template #trigger>
              <n-button :type="groupBy ? 'primary' : 'default'">
                <template #icon><n-icon :size="16"><FolderOpenOutline /></n-icon></template>
              </n-button>
            </template>
            <div class="column-visibility-panel">
              <div class="column-visibility-item">
                <n-radio
                  :checked="groupBy === null"
                  @update:checked="() => { groupBy = null; collapsedGroups = new Set(); }"
                  size="small"
                >
                  不分组
                </n-radio>
              </div>
              <div v-for="col in groupableColumns" :key="'group-' + col.key" class="column-visibility-item">
                <n-radio
                  :checked="groupBy === col.key"
                  @update:checked="() => { groupBy = col.key; collapsedGroups = new Set(); }"
                  size="small"
                >
                  {{ col.label }}
                </n-radio>
              </div>
            </div>
          </n-popover>
        </n-button-group>
      </div>
    </div>

    <!-- Alert -->
    <n-alert v-if="stockStore.error" type="error" :title="stockStore.error" style="margin-bottom: var(--hh-space-4)" closable @close="stockStore.clearError()" />

    <!-- Card View -->
    <div v-if="viewMode === 'card'" class="card-grid">
      <n-spin :show="stockStore.loading">
        <!-- 分组模式 -->
        <template v-if="cardGroupedData">
          <div v-for="group in cardGroupedData" :key="group.key" class="card-group">
            <div class="card-group-header" @click="toggleGroupCollapse(group.key)">
              <span class="group-toggle">{{ collapsedGroups.has(group.key) ? '▶' : '▼' }}</span>
              <span class="group-label">{{ group.label }}</span>
              <span class="group-count">({{ group.items.length }})</span>
            </div>
            <n-grid v-if="!collapsedGroups.has(group.key)" :cols="3" :x-gap="16" :y-gap="16">
              <n-gi v-for="item in group.items" :key="item.id">
                <n-card class="stock-card" :class="getRowClass(item)" @click="auditActive ? null : openItemDetail(item.id)">
                  <template #header>
                    <div class="stock-card-header">
                      <span class="stock-card-name">{{ item.name }}</span>
                      <n-tag v-if="isExpired(item)" size="small" type="error" :bordered="false">{{ t('stock.expired') }}</n-tag>
                      <n-tag v-else-if="isLowStock(item)" size="small" type="warning" :bordered="false">{{ t('stock.lowStockLabel') }}</n-tag>
                    </div>
                  </template>
                  <div class="stock-card-meta">
                    <span class="stock-card-quantity">
                      {{ item.quantity }} {{ item.unit }}
                      <span v-if="item.currentState === 'opened'" class="opened-badge">已开</span>
                    </span>
                    <n-tag size="small" round :bordered="false" :type="getCategoryColor(item.type)">
                      {{ item.type }}
                    </n-tag>
                  </div>
                  <div class="stock-card-price" v-if="item.purchasePrice || item.avgPrice">
                    <span class="price-label">{{ item.avgPrice ? '均价' : '单价' }}</span>
                    <span class="price-value">¥{{ item.avgPrice || item.purchasePrice }}</span>
                    <span class="price-total" v-if="item.quantity > 1 && (item.avgPrice || item.purchasePrice)">
                      小计 ¥{{ (item.quantity * (item.avgPrice || item.purchasePrice!)).toFixed(2) }}
                    </span>
                  </div>
                  <div class="stock-card-meta" v-if="item.brand || item.shop">
                    <span v-if="item.brand" class="stock-card-brand">{{ item.brand }}</span>
                    <span v-if="item.shop" class="stock-card-shop">{{ item.shop }}</span>
                  </div>
                  <div class="stock-card-footer">
                    <span v-if="item.locationId" class="stock-card-location">
                      <n-icon :size="14"><LocationOutline /></n-icon>
                      {{ getLocationName(item.locationId) }}
                    </span>
                    <span v-if="item.expiryDate" class="stock-card-expiry" :class="{ 'expiry-danger': isExpired(item), 'expiry-warning': isExpiring(item) }">
                      {{ formatExpiry(item) }}
                    </span>
                  </div>
                  <div v-if="!auditActive" class="stock-card-actions" @click.stop>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-button size="tiny" quaternary type="error" @click.stop="confirmQuickConsume(item)">
                          <template #icon><n-icon :size="14"><RemoveCircleOutline /></n-icon></template>
                        </n-button>
                      </template>
                      消耗
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-button size="tiny" quaternary type="success" @click.stop="quickStockInItem(item)">
                          <template #icon><n-icon :size="14"><AddCircleOutline /></n-icon></template>
                        </n-button>
                      </template>
                      入库
                    </n-tooltip>
                    <n-tooltip v-if="item.currentState !== 'opened'" trigger="hover">
                      <template #trigger>
                        <n-button size="tiny" quaternary @click.stop="confirmMarkOpened(item)">
                          <template #icon><n-icon :size="14"><LockOpenOutline /></n-icon></template>
                        </n-button>
                      </template>
                      标记已开
                    </n-tooltip>
                  </div>
                  <div v-if="auditActive" class="stock-card-audit" @click.stop>
                    <div class="audit-input-row">
                      <span class="audit-label">{{ t('stock.systemQty') }}</span>
                      <span class="audit-system-qty">{{ item.quantity }}</span>
                    </div>
                    <div class="audit-input-row">
                      <span class="audit-label">{{ t('stock.actualQty') }}</span>
                      <n-input-number
                        :value="getAuditActualQty(item.id)"
                        size="small"
                        :min="0"
                        :placeholder="t('stock.enterQty')"
                        style="width: 100px"
                        @update:value="(val: number | null) => setAuditActualQty(item.id, val)"
                      />
                    </div>
                    <div class="audit-input-row" v-if="getAuditActualQty(item.id) !== null">
                      <span class="audit-label">{{ t('stock.difference') }}</span>
                      <span class="audit-diff" :class="getAuditDiffClass(item)">
                        {{ getAuditDiffText(item) }}
                      </span>
                    </div>
                  </div>
                </n-card>
              </n-gi>
            </n-grid>
          </div>
        </template>
        <!-- 非分组模式 -->
        <n-grid v-else :cols="3" :x-gap="16" :y-gap="16">
          <n-gi v-for="item in filteredItems" :key="item.id">
            <n-card class="stock-card" :class="getRowClass(item)" @click="auditActive ? null : openItemDetail(item.id)">
              <template #header>
                <div class="stock-card-header">
                  <span class="stock-card-name">{{ item.name }}</span>
                  <n-tag v-if="isExpired(item)" size="small" type="error" :bordered="false">{{ t('stock.expired') }}</n-tag>
                  <n-tag v-else-if="isLowStock(item)" size="small" type="warning" :bordered="false">{{ t('stock.lowStockLabel') }}</n-tag>
                </div>
              </template>
              <div class="stock-card-meta">
                <span class="stock-card-quantity">
                  {{ item.quantity }} {{ item.unit }}
                  <span v-if="item.currentState === 'opened'" class="opened-badge">已开</span>
                </span>
                <n-tag size="small" round :bordered="false" :type="getCategoryColor(item.type)">
                  {{ item.type }}
                </n-tag>
              </div>
              <div class="stock-card-price" v-if="item.purchasePrice || item.avgPrice">
                <span class="price-label">{{ item.avgPrice ? '均价' : '单价' }}</span>
                <span class="price-value">¥{{ item.avgPrice || item.purchasePrice }}</span>
                <span class="price-total" v-if="item.quantity > 1 && (item.avgPrice || item.purchasePrice)">
                  小计 ¥{{ (item.quantity * (item.avgPrice || item.purchasePrice!)).toFixed(2) }}
                </span>
              </div>
              <div class="stock-card-meta" v-if="item.brand || item.shop">
                <span v-if="item.brand" class="stock-card-brand">{{ item.brand }}</span>
                <span v-if="item.shop" class="stock-card-shop">{{ item.shop }}</span>
              </div>
              <div class="stock-card-footer">
                <span v-if="item.locationId" class="stock-card-location">
                  <n-icon :size="14"><LocationOutline /></n-icon>
                  {{ getLocationName(item.locationId) }}
                </span>
                <span v-if="item.expiryDate" class="stock-card-expiry" :class="{ 'expiry-danger': isExpired(item), 'expiry-warning': isExpiring(item) }">
                  {{ formatExpiry(item) }}
                </span>
              </div>
              <div v-if="!auditActive" class="stock-card-actions" @click.stop>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button size="tiny" quaternary type="error" @click.stop="confirmQuickConsume(item)">
                      <template #icon><n-icon :size="14"><RemoveCircleOutline /></n-icon></template>
                    </n-button>
                  </template>
                  消耗
                </n-tooltip>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button size="tiny" quaternary type="success" @click.stop="quickStockInItem(item)">
                      <template #icon><n-icon :size="14"><AddCircleOutline /></n-icon></template>
                    </n-button>
                  </template>
                  入库
                </n-tooltip>
                <n-tooltip v-if="item.currentState !== 'opened'" trigger="hover">
                  <template #trigger>
                    <n-button size="tiny" quaternary @click.stop="confirmMarkOpened(item)">
                      <template #icon><n-icon :size="14"><LockOpenOutline /></n-icon></template>
                    </n-button>
                  </template>
                  标记已开
                </n-tooltip>
              </div>
              <div v-if="auditActive" class="stock-card-audit" @click.stop>
                <div class="audit-input-row">
                  <span class="audit-label">{{ t('stock.systemQty') }}</span>
                  <span class="audit-system-qty">{{ item.quantity }}</span>
                </div>
                <div class="audit-input-row">
                  <span class="audit-label">{{ t('stock.actualQty') }}</span>
                  <n-input-number
                    :value="getAuditActualQty(item.id)"
                    size="small"
                    :min="0"
                    :placeholder="t('stock.enterQty')"
                    style="width: 100px"
                    @update:value="(val: number | null) => setAuditActualQty(item.id, val)"
                  />
                </div>
                <div class="audit-input-row" v-if="getAuditActualQty(item.id) !== null">
                  <span class="audit-label">{{ t('stock.difference') }}</span>
                  <span class="audit-diff" :class="getAuditDiffClass(item)">
                    {{ getAuditDiffText(item) }}
                  </span>
                </div>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
        <div v-if="filteredItems.length === 0 && !stockStore.loading" class="empty-stock-state">
          <div class="empty-stock-icon">
            <n-icon :size="48" color="var(--hh-text-tertiary)"><CubeOutline /></n-icon>
          </div>
          <h3 class="empty-stock-title">{{ t('stock.emptyTitle') }}</h3>
          <p class="empty-stock-desc">{{ t('stock.emptyDesc') }}</p>
          <div class="empty-stock-actions">
            <n-button type="primary" size="large" @click="openQuickStockIn">
              <template #icon><n-icon :size="20"><AddOutline /></n-icon></template>
              {{ t('stock.addFirstItem') }}
            </n-button>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- Table View (优化1: 列扩展 + 优化2: 行着色 + 优化3: 行内操作 + 优化4: timeago) -->
    <div v-else class="table-view">
      <n-spin :show="stockStore.loading">
        <div v-if="filteredItems.length > 0" class="table-wrapper">
          <!-- 列可见性 + 分组控制 -->
          <div class="table-toolbar">
            <n-popover trigger="click" placement="bottom-end">
              <template #trigger>
                <n-button size="tiny" quaternary>
                  <template #icon><n-icon :size="16"><SettingsOutline /></n-icon></template>
                  显示列
                </n-button>
              </template>
              <div class="column-visibility-panel">
                <div v-for="col in configurableColumns" :key="col.key" class="column-visibility-item">
                  <n-checkbox
                    :checked="visibleColumns.has(col.key)"
                    @update:checked="(val: boolean) => toggleColumn(col.key, val)"
                    size="small"
                  >
                    {{ col.label }}
                  </n-checkbox>
                </div>
              </div>
            </n-popover>
          </div>
          <n-data-table
            :columns="activeTableColumns"
            :data="auditActive ? auditFilteredItems : (groupBy ? groupedTableData : filteredItems)"
            :pagination="groupBy ? false : { pageSize: 20 }"
            :row-props="groupedRowProps"
            :row-class-name="groupedRowClassName"
            size="small"
          />
        </div>
        <div v-else class="empty-stock-state">
          <div class="empty-stock-icon">
            <n-icon :size="48" color="var(--hh-text-tertiary)"><CubeOutline /></n-icon>
          </div>
          <h3 class="empty-stock-title">{{ t('stock.emptyTitle') }}</h3>
          <p class="empty-stock-desc">{{ t('stock.emptyDesc') }}</p>
          <div class="empty-stock-actions">
            <n-button type="primary" size="large" @click="openQuickStockIn">
              <template #icon><n-icon :size="20"><AddOutline /></n-icon></template>
              {{ t('stock.addFirstItem') }}
            </n-button>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- 快速入库 Modal -->
    <n-modal v-model:show="showQuickStockInModal" title="快速入库" preset="card" style="max-width: 520px" :mask-closable="false" :segmented="{ footer: true }">
      <!-- Step 1: 搜索产品 -->
      <div v-if="quickStockInStep === 1" class="qs-step">
        <div class="qs-search-row">
          <n-input
            v-model:value="quickStockInSearch"
            placeholder="扫码或输入产品名称..."
            size="large"
            clearable
            @keyup.enter="handleQuickStockInSearch"
            :disabled="quickStockInSearching"
          >
            <template #prefix><n-icon :size="18"><SearchOutline /></n-icon></template>
          </n-input>
          <n-button type="primary" size="large" @click="handleQuickStockInSearch" :loading="quickStockInSearching" style="flex-shrink: 0">
            搜索
          </n-button>
          <n-button size="large" @click="handleBarcodeScan" :disabled="!barcodeAdapter?.isSupported" style="flex-shrink: 0">
            <template #icon><n-icon :size="20"><ScanOutline /></n-icon></template>
          </n-button>
        </div>

        <div v-if="quickStockInSearchResults.length > 0" class="qs-results">
          <div class="qs-results-count">找到 {{ quickStockInSearchResults.length }} 个产品</div>
          <div class="qs-result-list">
            <div
              v-for="item in quickStockInSearchResults"
              :key="item.id"
              class="qs-result-item"
              @click="selectQuickStockInProduct(item)"
            >
              <div class="qs-result-left">
                <span class="qs-result-name">{{ item.name }}</span>
                <div class="qs-result-tags">
                  <n-tag v-if="item.type" size="tiny" round :bordered="false">{{ item.type }}</n-tag>
                  <n-tag v-if="item.barcode" size="tiny" round :bordered="false">{{ item.barcode }}</n-tag>
                </div>
              </div>
              <div class="qs-result-right">
                <span class="qs-result-qty">{{ item.quantity }} {{ item.unit }}</span>
                <n-icon :size="16"><ChevronForwardOutline /></n-icon>
              </div>
            </div>
          </div>
        </div>

        <div v-if="quickStockInSearch && quickStockInSearchResults.length === 0 && !quickStockInSearching" class="qs-empty">
          <n-icon :size="40" color="var(--hh-text-tertiary)"><CubeOutline /></n-icon>
          <span class="qs-empty-text">未找到「{{ quickStockInSearch }}」</span>
          <n-button type="primary" @click="openProductFormDialog">
            <template #icon><n-icon :size="16"><AddOutline /></n-icon></template>
            快速添加
          </n-button>
        </div>
      </div>

      <!-- Step 3: 入库确认 -->
      <div v-if="quickStockInStep === 3" class="qs-step">
        <div class="qs-product-card">
          <div class="qs-product-name">{{ quickStockInSelectedProduct!.name }}</div>
          <div class="qs-product-meta">
            <span>当前库存: <strong>{{ quickStockInSelectedProduct!.quantity }} {{ quickStockInSelectedProduct!.unit }}</strong></span>
            <span v-if="quickStockInSelectedProduct!.type">类别: {{ quickStockInSelectedProduct!.type }}</span>
            <span v-if="quickStockInSelectedProduct!.barcode">条码: {{ quickStockInSelectedProduct!.barcode }}</span>
          </div>
        </div>
        <div class="qs-form-section">
          <div class="qs-form-grid">
            <div class="qs-form-row">
              <label class="qs-label">入库数量</label>
              <n-input-number v-model:value="quickStockInQuantity" :min="0.01" :max="99999" size="large" style="width: 100%" />
            </div>
            <div class="qs-form-row">
              <label class="qs-label">单价 (¥)</label>
              <n-input-number v-model:value="quickStockInPrice" :min="0" :precision="2" placeholder="0.00" size="large" style="width: 100%">
                <template #prefix>¥</template>
              </n-input-number>
            </div>
          </div>
          <div class="qs-form-row">
            <label class="qs-label">存放位置</label>
            <n-select v-model:value="quickStockInLocationId" :options="locationOptions" clearable placeholder="选择位置" />
          </div>
          <div class="qs-form-row">
            <label class="qs-label">备注</label>
            <n-input v-model:value="quickStockInNote" placeholder="可选" />
          </div>
        </div>
        <div v-if="quickStockInQuantity > 0" class="qs-preview">
          入库后库存: <strong class="qs-preview-val">{{ (quickStockInSelectedProduct!.quantity || 0) + quickStockInQuantity }} {{ quickStockInSelectedProduct!.unit }}</strong>
        </div>
        <div class="qs-footer-actions">
          <n-button @click="quickStockInStep = 1">重新选择</n-button>
          <n-button type="success" @click="handleQuickStockInConfirm" :loading="quickStockInConfirming" :disabled="!quickStockInQuantity">
            <template #icon><n-icon :size="16"><CheckmarkOutline /></n-icon></template>
            确认入库
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 优化3: 行内入库弹窗 -->
    <n-modal v-model:show="showInlineStockInModal" title="快速入库" preset="card" style="max-width: 360px">
      <div v-if="inlineActionItem">
        <div style="margin-bottom: 12px; color: var(--hh-text-secondary)">
          {{ inlineActionItem.name }} — 当前 {{ inlineActionItem.quantity }} {{ inlineActionItem.unit }}
        </div>
        <n-form-item label="入库数量">
          <n-input-number v-model:value="inlineStockInQty" :min="0.01" :max="9999" style="width: 100%" />
        </n-form-item>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showInlineStockInModal = false">取消</n-button>
          <n-button type="success" @click="confirmInlineStockIn">确认入库</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 优化3: 行内消耗弹窗 -->
    <n-modal v-model:show="showInlineConsumeModal" title="消耗物品" preset="card" style="max-width: 360px">
      <div v-if="inlineActionItem">
        <div style="margin-bottom: 12px; color: var(--hh-text-secondary)">
          {{ inlineActionItem.name }} — 当前 {{ inlineActionItem.quantity }} {{ inlineActionItem.unit }}
        </div>
        <n-form-item label="消耗数量">
          <n-input-number v-model:value="inlineConsumeQty" :min="0.01" :max="inlineActionItem.quantity" style="width: 100%" />
        </n-form-item>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showInlineConsumeModal = false">取消</n-button>
          <n-button type="error" @click="confirmInlineConsume">确认消耗</n-button>
        </n-space>
      </template>
    </n-modal>

    <ProductFormDialog
      v-model:visible="showProductFormDialog"
      @saved="onProductCreated"
    />

    <ItemDetailModal
      v-model:show="showItemDetail"
      :item-id="selectedItemId"
      @deleted="onItemDeleted"
      @updated="onItemUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, watch } from 'vue';
import {
  NButton, NButtonGroup, NInput, NSelect, NDataTable,
  NModal, NInputNumber, NSpin, NAlert, NCollapseTransition,
  NTag, NIcon, NProgress, NCard, NGrid, NGi, NCheckbox,
  NPopover, NSpace, NFormItem, NDropdown, NTooltip, NRadio,
  useMessage, useDialog,
} from 'naive-ui';
import type { DataTableColumns, DataTableRowData } from 'naive-ui';
import { useStockStore } from '@/stores/stock.store';
import { useI18n } from '@/locales';
import { stockApi, locationsApi, unitsApi, productsApi } from '@/api/client';
import api from '@/api/client';
import type { Category, Location, Item } from '@/shared/types';
import {
  AddOutline, SearchOutline, ListOutline, GridOutline, LocationOutline,
  CheckmarkOutline,
  CubeOutline, WarningOutline, AlertCircleOutline,
  ClipboardOutline, CloseOutline, CheckmarkCircleOutline,
  ArrowDownOutline, ScanOutline,
  ChevronForwardOutline,
  SettingsOutline, WalletOutline, FolderOpenOutline,
  EllipsisVerticalOutline,
  RemoveCircleOutline, AddCircleOutline, LockOpenOutline,
  ArrowRedoOutline, EyeOutline, CreateOutline,
} from '@vicons/ionicons5';
import { getCategoryColor } from '@/utils/format';
import ProductFormDialog from '@/components/ProductFormDialog.vue';
import ItemDetailModal from '@/components/ItemDetailModal.vue';
import { clientRegistry } from '@/plugins/client-registry';
import type { ScanResult } from '@/plugins/types/client-plugin.types';

interface UnitOption { id: number; name: string; ratio?: number; notes?: string }
type ViewMode = 'table' | 'card';

const message = useMessage();
const dialog = useDialog();
const stockStore = useStockStore();
const { t } = useI18n();

// ── Page State ──
const searchQuery = ref('');
const filterCategory = ref<string | null>(null);
const filterLocation = ref<string | null>(null);
const filterStatus = ref<string | null>(null);
const viewMode = ref<ViewMode>('table');
const showItemDetail = ref(false);
const selectedItemId = ref<number | null>(null);

// ── 优化1: 列可见性控制 + 动态分组 ──
interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible: boolean;
  allowGrouping?: boolean;
}

const columnConfigs: ColumnConfig[] = [
  { key: 'name', label: '名称', defaultVisible: true },
  { key: 'quantity', label: '数量', defaultVisible: true },
  { key: 'type', label: '类别', defaultVisible: true, allowGrouping: true },
  { key: 'locationId', label: '位置', defaultVisible: true, allowGrouping: true },
  { key: 'expiryDate', label: '保质期', defaultVisible: true, allowGrouping: true },
  { key: 'purchasePrice', label: '单价', defaultVisible: false },
  { key: 'totalValue', label: '小计', defaultVisible: false },
  { key: 'avgPrice', label: '均价', defaultVisible: false },
  { key: 'minStock', label: '最低库存', defaultVisible: false, allowGrouping: true },
  { key: 'currentState', label: '状态', defaultVisible: false, allowGrouping: true },
  { key: 'purchaseDate', label: '购买日期', defaultVisible: false, allowGrouping: true },
  { key: 'brand', label: '品牌', defaultVisible: false, allowGrouping: true },
  { key: 'shop', label: '商店', defaultVisible: false, allowGrouping: true },
  { key: 'actions', label: '操作', defaultVisible: true },
];

const configurableColumns = computed(() => columnConfigs.filter(c => c.key !== 'name' && c.key !== 'actions'));
const groupableColumns = computed(() => columnConfigs.filter(c => c.allowGrouping));

// ── 动态分组状态（localStorage 持久化） ──
const STOCK_GROUPBY_KEY = 'hh_stock_groupBy';
const groupBy = ref<string | null>(localStorage.getItem(STOCK_GROUPBY_KEY) || null);
watch(groupBy, (val) => {
  if (val) localStorage.setItem(STOCK_GROUPBY_KEY, val);
  else localStorage.removeItem(STOCK_GROUPBY_KEY);
});
const collapsedGroups = ref<Set<string>>(new Set());

function toggleGroupCollapse(groupKey: string) {
  const newSet = new Set(collapsedGroups.value);
  if (newSet.has(groupKey)) newSet.delete(groupKey);
  else newSet.add(groupKey);
  collapsedGroups.value = newSet;
}

function getGroupValue(item: Item, colKey: string): string {
  switch (colKey) {
    case 'type': return item.type || '未分类';
    case 'locationId': return getLocationName(item.locationId);
    case 'expiryDate': return item.expiryDate ? formatExpiryGroup(item.expiryDate) : '无保质期';
    case 'minStock': return item.minStock !== null ? (item.quantity <= item.minStock ? '低库存' : '库存充足') : '未设置';
    case 'currentState': return item.currentState === 'opened' ? '已开封' : '未开封';
    case 'purchaseDate': return item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }) : '未知';
    case 'brand': return item.brand || '无品牌';
    case 'shop': return item.shop || '未知商店';
    default: return '-';
  }
}

function formatExpiryGroup(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '已过期';
  if (diffDays === 0) return '今天过期';
  if (diffDays <= 7) return '1周内过期';
  if (diffDays <= 30) return '1月内过期';
  if (diffDays <= 90) return '3月内过期';
  return '3月后过期';
}

// 分组后的表格数据：在数据行之间插入分组头行
interface GroupHeaderRow {
  _isGroupHeader: true;
  _groupKey: string;
  _groupLabel: string;
  _groupCount: number;
  _collapsed: boolean;
}

interface GroupDataRow extends Item {
  _isGroupHeader?: false;
  _groupKey: string;
}

type GroupedRow = GroupHeaderRow | GroupDataRow;

const groupedTableData = computed(() => {
  if (!groupBy.value) return filteredItems.value;

  const colKey = groupBy.value;
  const groups = new Map<string, Item[]>();

  for (const item of filteredItems.value) {
    const gv = getGroupValue(item, colKey);
    if (!groups.has(gv)) groups.set(gv, []);
    groups.get(gv)!.push(item);
  }

  // 按组名排序
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const result: GroupedRow[] = [];

  for (const key of sortedKeys) {
    const items = groups.get(key)!;
    const isCollapsed = collapsedGroups.value.has(key);
    result.push({
      _isGroupHeader: true,
      _groupKey: key,
      _groupLabel: key,
      _groupCount: items.length,
      _collapsed: isCollapsed,
    });
    if (!isCollapsed) {
      for (const item of items) {
        result.push({ ...item, _isGroupHeader: false, _groupKey: key } as GroupDataRow);
      }
    }
  }

  return result;
});

// Card 视图分组数据
const cardGroupedData = computed(() => {
  if (!groupBy.value) return null;
  const colKey = groupBy.value;
  const groups = new Map<string, Item[]>();
  for (const item of filteredItems.value) {
    const gv = getGroupValue(item, colKey);
    if (!groups.has(gv)) groups.set(gv, []);
    groups.get(gv)!.push(item);
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  return sortedKeys.map(key => ({ key, label: key, items: groups.get(key)! }));
});

const visibleColumns = ref<Set<string>>(new Set(
  columnConfigs.filter(c => c.defaultVisible).map(c => c.key)
));

function toggleColumn(key: string, visible: boolean) {
  const newSet = new Set(visibleColumns.value);
  if (visible) newSet.add(key);
  else newSet.delete(key);
  visibleColumns.value = newSet;
}

// ── 优化3: 行内快捷操作状态 ──
const inlineActionItem = ref<Item | null>(null);
const showInlineStockInModal = ref(false);
const showInlineConsumeModal = ref(false);
const inlineStockInQty = ref(1);
const inlineConsumeQty = ref(1);

// ── Audit State ──
const auditActive = ref(false);
const auditSearchQuery = ref('');
const auditFilterStatus = ref<string | null>(null);
const auditActualQtyMap = ref<Map<number, number | null>>(new Map());

const auditStatusOptions = computed(() => [
  { label: t('stock.all'), value: 'all' },
  { label: t('stock.pending'), value: 'pending' },
  { label: t('stock.matched'), value: 'matched' },
  { label: t('stock.discrepancy'), value: 'discrepancy' },
]);

// ── Quick Stock In State ──
const showQuickStockInModal = ref(false);
const showProductFormDialog = ref(false);
const quickStockInStep = ref(1);
const quickStockInSearch = ref('');
const quickStockInSearching = ref(false);
const quickStockInSearchResults = ref<any[]>([]);
const quickStockInSelectedProduct = ref<any | null>(null);
const quickStockInQuantity = ref(1);
const quickStockInPrice = ref(0);
const quickStockInLocationId = ref<number | null>(null);
const quickStockInNote = ref('');
const quickStockInConfirming = ref(false);
const locations = ref<Location[]>([]);

// ── Data ──
const categories = ref<Category[]>([]);
const units = ref<UnitOption[]>([]);

// ── 优化6: 操作撤销 (预留框架 — 需后端返回 transactionId + undo 端点)
// const lastTransactionId = ref<number | null>(null);
// const undoTimer = ref<ReturnType<typeof setTimeout> | null>(null);
// async function showUndoToast(transactionId: number) { ... }

// ── Computed ──
const expiringCount = computed(() =>
  stockStore.items.filter(i => isExpiring(i)).length
);

const lowStockCount = computed(() =>
  stockStore.items.filter(i => isLowStock(i)).length
);

const expiredCount = computed(() =>
  stockStore.items.filter(i => isExpired(i)).length
);

const categoryOptions = computed(() =>
  categories.value.map(c => ({ label: `${c.icon || ''} ${c.name}`, value: c.name }))
);

const locationOptions = computed(() =>
  locations.value.map(l => ({ label: l.name, value: l.id }))
);


const statusFilterOptions = computed(() => [
  { label: '全部', value: 'all' },
  { label: '即将过期', value: 'expiring' },
  { label: '已过期', value: 'expired' },
  { label: '低库存', value: 'lowStock' },
  { label: '正常', value: 'normal' },
]);

// 优化5: 总库存价值
const totalStockValue = computed(() => {
  const total = stockStore.items.reduce((sum, i) => {
    const price = i.avgPrice || i.purchasePrice || 0;
    return sum + i.quantity * price;
  }, 0);
  return total.toFixed(2);
});

// 优化7: 预警横幅
const hasAlerts = computed(() => expiredCount.value > 0 || expiringCount.value > 0);

// 优化9: 有激活的过滤条件
const hasActiveFilters = computed(() =>
  !!searchQuery.value || !!filterCategory.value || !!filterLocation.value || !!filterStatus.value
);

function clearAllFilters() {
  searchQuery.value = '';
  filterCategory.value = null;
  filterLocation.value = null;
  filterStatus.value = null;
}

const filteredItems = computed(() => {
  let items = stockStore.items;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.brand && i.brand.toLowerCase().includes(q)) ||
      (i.barcode && i.barcode.toLowerCase().includes(q))
    );
  }
  if (filterCategory.value) items = items.filter(i => i.type === filterCategory.value);
  if (filterLocation.value) items = items.filter(i => i.locationId === Number(filterLocation.value));
  if (filterStatus.value && filterStatus.value !== 'all') {
    items = items.filter(i => {
      if (filterStatus.value === 'expired') return isExpired(i);
      if (filterStatus.value === 'expiring') return isExpiring(i) && !isExpired(i);
      if (filterStatus.value === 'lowStock') return isLowStock(i) && !isExpired(i);
      if (filterStatus.value === 'normal') return !isExpired(i) && !isExpiring(i) && !isLowStock(i);
      return true;
    });
  }
  return items;
});

const auditFilteredItems = computed(() => {
  let items = filteredItems.value;
  if (auditSearchQuery.value) {
    const q = auditSearchQuery.value.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q));
  }
  if (auditFilterStatus.value && auditFilterStatus.value !== 'all') {
    items = items.filter(i => {
      const actual = auditActualQtyMap.value.get(i.id);
      if (auditFilterStatus.value === 'pending') return actual === null || actual === undefined;
      if (auditFilterStatus.value === 'matched') return actual !== null && actual === i.quantity;
      if (auditFilterStatus.value === 'discrepancy') return actual !== null && actual !== i.quantity;
      return true;
    });
  }
  return items;
});

const countedCount = computed(() => {
  let count = 0;
  for (const item of stockStore.items) {
    const actual = auditActualQtyMap.value.get(item.id);
    if (actual !== null && actual !== undefined) count++;
  }
  return count;
});

const discrepancyCount = computed(() => {
  let count = 0;
  for (const item of stockStore.items) {
    const actual = auditActualQtyMap.value.get(item.id);
    if (actual !== null && actual !== undefined && actual !== item.quantity) count++;
  }
  return count;
});

const progressPercent = computed(() => {
  if (stockStore.items.length === 0) return 0;
  return Math.round((countedCount.value / stockStore.items.length) * 100);
});

// ── 优化4: 到期日timeago ──
function formatExpiry(item: Item): string {
  if (!item.expiryDate) return '-';
  const expiry = new Date(item.expiryDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `已过期 ${Math.abs(diffDays)} 天`;
  if (diffDays === 0) return '今天过期';
  if (diffDays === 1) return '明天过期';
  if (diffDays <= 7) return `${diffDays} 天后过期`;
  if (diffDays <= 30) return `${diffDays} 天后过期`;
  return expiry.toLocaleDateString('zh-CN');
}

// ── 优化2: 行状态着色 ──
function getRowClass(item: Item): string {
  if (isExpired(item)) return 'row-expired';
  if (isExpiring(item)) return 'row-expiring';
  if (isLowStock(item)) return 'row-low-stock';
  return '';
}

// ── 动态分组：行属性和样式 ──
function groupedRowClassName(row: DataTableRowData): string {
  const r = row as unknown;
  if ((r as GroupHeaderRow)._isGroupHeader) return 'group-header-row';
  return getRowClass(row as Item);
}

const groupedRowProps = (row: DataTableRowData) => {
  const r = row as unknown;
  if ((r as GroupHeaderRow)._isGroupHeader) {
    const header = r as GroupHeaderRow;
    return {
      onClick: () => toggleGroupCollapse(header._groupKey),
      style: 'cursor: pointer;',
    };
  }
  if (auditActive.value) return {};
  const item = row as Item;
  return { style: 'cursor: pointer;', onClick: () => openItemDetail(item.id) };
};

// ── 优化3: 行内快捷操作方法（弹窗确认防误触） ──

function confirmQuickConsume(item: Item) {
  dialog.warning({
    title: '消耗物品',
    content: `确定消耗 1 ${item.unit}「${item.name}」吗？当前库存 ${item.quantity} ${item.unit}。`,
    positiveText: '确认消耗',
    negativeText: '取消',
    onPositiveClick: () => doConsume(item, 1),
  });
}

function confirmMarkOpened(item: Item) {
  dialog.info({
    title: '标记已开',
    content: `确定将「${item.name}」标记为已开封吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: () => doMarkOpened(item),
  });
}

function quickStockInItem(item: Item) {
  inlineActionItem.value = item;
  inlineStockInQty.value = 1;
  showInlineStockInModal.value = true;
}

async function confirmInlineStockIn() {
  if (!inlineActionItem.value) return;
  try {
    await stockApi.stockIn(inlineActionItem.value.id, { quantity: inlineStockInQty.value });
    message.success(`入库 ${inlineStockInQty.value} ${inlineActionItem.value.unit}`);
    showInlineStockInModal.value = false;
    stockStore.fetchItems();
  } catch {
    message.error('入库失败');
  }
}

async function confirmInlineConsume() {
  if (!inlineActionItem.value) return;
  try {
    await stockApi.consume(inlineActionItem.value.id, { quantity: inlineConsumeQty.value });
    message.success(`消耗 ${inlineConsumeQty.value} ${inlineActionItem.value.unit}`);
    showInlineConsumeModal.value = false;
    stockStore.fetchItems();
  } catch {
    message.error('消耗失败');
  }
}

async function doConsume(item: Item, qty: number) {
  try {
    await stockApi.consume(item.id, { quantity: qty });
    message.success(`已消耗 ${qty} ${item.unit}`);
    stockStore.fetchItems();
  } catch {
    message.error('消耗失败');
  }
}

async function doMarkOpened(item: Item) {
  try {
    await stockApi.update(item.id, { currentState: 'opened' } as Partial<Item>);
    message.success(`已标记「${item.name}」为已开`);
    stockStore.fetchItems();
  } catch {
    message.error('操作失败');
  }
}

// 优化6: 撤销操作 (框架 — 需后端 undo 端点)
// async function showUndoToast(transactionId: number) {
//   const msg = message.info('操作完成 — 点击撤销', { duration: 5000 });
//   // 用户点击撤销时调用 POST /stock/transactions/:id/undo
// }

// ── 优化1: 表格列定义（扩展版） ──
function buildNormalTableColumns(): DataTableColumns<any> {
  const cols: DataTableColumns<any> = [];

  // 辅助：分组头行返回空内容
  const skipGroupHeader = (row: any, render: () => any) =>
    row._isGroupHeader ? h('span') : render();

  // 名称列（始终显示；分组模式下渲染分组头行）
  cols.push({
    title: t('stock.name'),
    key: 'name',
    minWidth: 150,
    ellipsis: { tooltip: true },
    render: (row) => {
      // 分组头行
      if (row._isGroupHeader) {
        const caret = row._collapsed ? '▶' : '▼';
        return h('span', { style: 'font-weight: 600; font-size: 13px; color: var(--hh-primary);' },
          `${caret} ${row._groupLabel} (${row._groupCount})`
        );
      }
      // 普通数据行
      return h('span', {
        style: 'font-weight: 500; cursor: pointer;',
        onClick: (e: Event) => { e.stopPropagation(); openItemDetail(row.id); },
      }, row.name);
    },
  });

  // 数量列（含已开标记 — 优化8）
  if (visibleColumns.value.has('quantity')) {
    cols.push({
      title: t('stock.quantity'),
      key: 'quantity',
      width: 100,
      render: (row) => skipGroupHeader(row, () => {
        const children: any[] = [h('span', {}, `${row.quantity} ${row.unit}`)];
        if (row.currentState === 'opened') {
          children.push(h('span', { style: 'font-size: 11px; color: var(--hh-warning); margin-left: 4px;' }, '已开'));
        }
        return h('span', {}, children);
      }),
    });
  }

  if (visibleColumns.value.has('type')) {
    cols.push({
      title: t('stock.category'),
      key: 'type',
      width: 80,
      render: (row) => skipGroupHeader(row, () =>
        h(NTag as any, { size: 'small', round: true, bordered: false, type: getCategoryColor(row.type) }, { default: () => row.type })
      ),
    });
  }

  if (visibleColumns.value.has('locationId')) {
    cols.push({
      title: '位置',
      key: 'locationId',
      width: 90,
      render: (row) => skipGroupHeader(row, () => h('span', {}, getLocationName(row.locationId))),
    });
  }

  // 优化4: 到期日 timeago
  if (visibleColumns.value.has('expiryDate')) {
    cols.push({
      title: t('stock.expiryDate'),
      key: 'expiryDate',
      width: 120,
      render: (row) => skipGroupHeader(row, () => {
        if (!row.expiryDate) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
        const text = formatExpiry(row);
        let color = 'var(--hh-text)';
        if (isExpired(row)) color = 'var(--hh-error)';
        else if (isExpiring(row)) color = 'var(--hh-warning)';
        return h('span', { style: { color, fontSize: '13px' } }, text);
      }),
    });
  }

  // 扩展列：单价
  if (visibleColumns.value.has('purchasePrice')) {
    cols.push({
      title: '单价',
      key: 'purchasePrice',
      width: 80,
      render: (row) => skipGroupHeader(row, () => {
        const price = row.avgPrice || row.purchasePrice;
        if (!price) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
        return h('span', { style: 'font-weight: 500' }, `¥${price}`);
      }),
    });
  }

  // 扩展列：小计价值
  if (visibleColumns.value.has('totalValue')) {
    cols.push({
      title: '小计',
      key: 'totalValue',
      width: 90,
      render: (row) => skipGroupHeader(row, () => {
        const price = row.avgPrice || row.purchasePrice;
        if (!price) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
        return h('span', { style: 'font-weight: 500; color: var(--hh-success)' }, `¥${(row.quantity * price).toFixed(2)}`);
      }),
    });
  }

  // 扩展列：均价
  if (visibleColumns.value.has('avgPrice')) {
    cols.push({
      title: '均价',
      key: 'avgPrice',
      width: 80,
      render: (row) => skipGroupHeader(row, () => {
        if (!row.avgPrice) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
        return h('span', {}, `¥${row.avgPrice}`);
      }),
    });
  }

  // 扩展列：最低库存
  if (visibleColumns.value.has('minStock')) {
    cols.push({
      title: '最低库存',
      key: 'minStock',
      width: 90,
      render: (row) => skipGroupHeader(row, () => {
        if (row.minStock === null) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
        const isLow = row.quantity <= row.minStock;
        return h('span', { style: isLow ? { color: 'var(--hh-error)', fontWeight: 500 } : {} }, `${row.minStock} ${row.unit}`);
      }),
    });
  }

  // 扩展列：状态
  if (visibleColumns.value.has('currentState')) {
    cols.push({
      title: '状态',
      key: 'currentState',
      width: 70,
      render: (row) => skipGroupHeader(row, () => {
        if (row.currentState === 'opened') return h(NTag, { size: 'small', round: true, type: 'warning', bordered: false }, { default: () => '已开' });
        return h(NTag, { size: 'small', round: true, type: 'success', bordered: false }, { default: () => '未开' });
      }),
    });
  }

  // 扩展列：购买日期
  if (visibleColumns.value.has('purchaseDate')) {
    cols.push({
      title: '购买日期',
      key: 'purchaseDate',
      width: 100,
      render: (row) => skipGroupHeader(row, () => {
        if (!row.purchaseDate) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
        return h('span', {}, new Date(row.purchaseDate).toLocaleDateString('zh-CN'));
      }),
    });
  }

  if (visibleColumns.value.has('brand')) {
    cols.push({
      title: '品牌',
      key: 'brand',
      width: 80,
      render: (row) => skipGroupHeader(row, () => {
        if (!row.brand) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
        return h('span', {}, row.brand);
      }),
    });
  }

  // 扩展列：商店
  if (visibleColumns.value.has('shop')) {
    cols.push({
      title: '商店',
      key: 'shop',
      width: 80,
      render: (row) => skipGroupHeader(row, () => {
        if (!row.shop) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
        return h('span', {}, row.shop);
      }),
    });
  }

  // 优化3: 操作列
  if (visibleColumns.value.has('actions')) {
    cols.push({
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (row) => skipGroupHeader(row, () => h('div', { class: 'row-actions', onClick: (e: Event) => e.stopPropagation() }, [
        // 快速消耗
        h(NTooltip, { trigger: 'hover' }, {
          trigger: () => h(NButton, {
            size: 'tiny', quaternary: true, type: 'error',
            onClick: () => confirmQuickConsume(row),
          }, { icon: () => h(NIcon, { size: 14 }, { default: () => h(RemoveCircleOutline) }) }),
          default: () => '消耗',
        }),
        // 快速入库
        h(NTooltip, { trigger: 'hover' }, {
          trigger: () => h(NButton, {
            size: 'tiny', quaternary: true, type: 'success',
            onClick: () => quickStockInItem(row),
          }, { icon: () => h(NIcon, { size: 14 }, { default: () => h(AddCircleOutline) }) }),
          default: () => '入库',
        }),
        // 标记已开
        row.currentState !== 'opened' ? h(NTooltip, { trigger: 'hover' }, {
          trigger: () => h(NButton, {
            size: 'tiny', quaternary: true,
            onClick: () => confirmMarkOpened(row),
          }, { icon: () => h(NIcon, { size: 14 }, { default: () => h(LockOpenOutline) }) }),
          default: () => '标记已开',
        }) : null,
        // 更多操作：竖三点图标
        h(NDropdown, {
          options: getMoreActions(row),
          trigger: 'click',
          onSelect: (key: string) => handleMoreAction(key, row),
        }, {
          default: () => h(NButton, { size: 'tiny', quaternary: true }, {
            icon: () => h(NIcon, { size: 14 }, { default: () => h(EllipsisVerticalOutline) }),
          }),
        }),
      ].filter(Boolean))),
    });
  }

  return cols;
}

function getMoreActions(item: Item) {
  const actions = [
    { label: '消耗指定量', key: 'consume-custom', icon: () => h(NIcon, { size: 14 }, { default: () => h(RemoveCircleOutline) }) },
    { label: '转移', key: 'transfer', icon: () => h(NIcon, { size: 14 }, { default: () => h(ArrowRedoOutline) }) },
    { label: '调整', key: 'adjust', icon: () => h(NIcon, { size: 14 }, { default: () => h(CreateOutline) }) },
  ];
  if (item.currentState !== 'opened') {
    actions.push({ label: '标记已开', key: 'mark-opened', icon: () => h(NIcon, { size: 14 }, { default: () => h(LockOpenOutline) }) });
  }
  actions.push({ label: '查看详情', key: 'detail', icon: () => h(NIcon, { size: 14 }, { default: () => h(EyeOutline) }) });
  actions.push({ label: '编辑', key: 'edit', icon: () => h(NIcon, { size: 14 }, { default: () => h(CreateOutline) }) });
  return actions;
}

function handleMoreAction(key: string, item: Item) {
  switch (key) {
    case 'consume-custom':
      inlineActionItem.value = item;
      inlineConsumeQty.value = 1;
      showInlineConsumeModal.value = true;
      break;
    case 'transfer':
    case 'adjust':
      openItemDetail(item.id);
      break;
    case 'mark-opened':
      confirmMarkOpened(item);
      break;
    case 'detail':
      openItemDetail(item.id);
      break;
    case 'edit':
      openItemDetail(item.id);
      break;
  }
}

const normalTableColumns = computed(() => buildNormalTableColumns());

const activeTableColumns = computed(() =>
  auditActive.value ? auditTableColumns : normalTableColumns.value
);

const auditTableColumns: DataTableColumns<Item> = [
  { title: t('stock.name'), key: 'name', width: 160, render: (row) => h('span', { style: 'font-weight: 500' }, row.name) },
  { title: t('stock.systemQty'), key: 'quantity', width: 100, align: 'center', render: (row) => h('span', { style: 'font-weight: 500' }, `${row.quantity} ${row.unit}`) },
  { title: t('stock.actualQty'), key: 'actualQty', width: 130, align: 'center', render: (row) => h(NInputNumber, {
    value: getAuditActualQty(row.id),
    size: 'small',
    min: 0,
    placeholder: t('stock.enterQty'),
    style: 'width: 100px',
    onUpdateValue: (val: number | null) => setAuditActualQty(row.id, val),
  })},
  { title: t('stock.difference'), key: 'diff', width: 80, align: 'center', render: (row) => {
    const actual = getAuditActualQty(row.id);
    if (actual === null) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
    const diff = actual - row.quantity;
    const cls = diff === 0 ? 'diff-match' : diff > 0 ? 'diff-surplus' : 'diff-shortage';
    return h('span', { class: cls, style: 'font-weight: 600' }, getAuditDiffText(row));
  }},
  { title: t('stock.status'), key: 'status', width: 90, align: 'center', render: (row) => {
    const actual = getAuditActualQty(row.id);
    if (actual === null) return h(NTag, { size: 'small', round: true, type: 'default' }, { default: () => t('stock.pending') });
    if (actual === row.quantity) return h(NTag, { size: 'small', round: true, type: 'success' }, { default: () => t('stock.matched') });
    return h(NTag, { size: 'small', round: true, type: 'error' }, { default: () => t('stock.discrepancy') });
  }},
];

// ── Item Detail Modal ──
function openItemDetail(itemId: number) {
  selectedItemId.value = itemId;
  showItemDetail.value = true;
}

function onItemDeleted() {
  showItemDetail.value = false;
  stockStore.fetchItems();
}

function onItemUpdated() {
  stockStore.fetchItems();
}

// ── Quick Stock In Methods ──
function openQuickStockIn() {
  quickStockInStep.value = 1;
  quickStockInSearch.value = '';
  quickStockInSearchResults.value = [];
  quickStockInSelectedProduct.value = null;
  quickStockInQuantity.value = 1;
  quickStockInPrice.value = 0;
  quickStockInLocationId.value = null;
  quickStockInNote.value = '';
  showQuickStockInModal.value = true;
}

async function handleQuickStockInSearch() {
  if (!quickStockInSearch.value.trim()) return;
  quickStockInSearching.value = true;
  try {
    const res = await productsApi.search(quickStockInSearch.value.trim());
    quickStockInSearchResults.value = res.data || [];
  } catch {
    message.error('搜索失败');
  } finally {
    quickStockInSearching.value = false;
  }
}

function selectQuickStockInProduct(product: any) {
  quickStockInSelectedProduct.value = product;
  quickStockInQuantity.value = 1;
  quickStockInPrice.value = product.defaultPrice || 0;
  quickStockInStep.value = 3;
}

function openProductFormDialog() {
  showProductFormDialog.value = true;
}

function onProductCreated(product: any) {
  quickStockInSelectedProduct.value = product;
  quickStockInQuantity.value = 1;
  quickStockInPrice.value = product.defaultPrice || 0;
  quickStockInStep.value = 3;
}

async function handleQuickStockInConfirm() {
  if (!quickStockInSelectedProduct.value || !quickStockInQuantity.value) return;
  quickStockInConfirming.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: quickStockInSelectedProduct.value.name,
      productId: quickStockInSelectedProduct.value.id,
      unit: quickStockInSelectedProduct.value.unit || '个',
      type: 'generic',
      quantity: quickStockInQuantity.value,
      purchasePrice: quickStockInPrice.value || undefined,
      locationId: quickStockInLocationId.value || undefined,
      notes: quickStockInNote.value || undefined,
    };
    await stockApi.create(payload);
    message.success('入库成功');
    showQuickStockInModal.value = false;
    await stockStore.fetchItems();
  } catch {
    message.error('入库失败');
  } finally {
    quickStockInConfirming.value = false;
  }
}

// ── Barcode Scanner ──
const barcodeAdapter = computed(() => {
  void clientRegistry.getRevision();
  return clientRegistry.getScannerAdapter('barcode');
});

async function handleBarcodeScan() {
  const adapter = barcodeAdapter.value;
  if (!adapter?.isSupported) {
    message.warning('当前浏览器不支持摄像头扫码');
    return;
  }
  try {
    const result: ScanResult = await adapter.scan();
    quickStockInSearch.value = result.raw;
    await handleQuickStockInSearch();
    message.success(`扫码成功: ${result.raw}`);
  } catch {
    message.info('扫码已取消');
  }
}

// ── Audit Methods ──
function getAuditActualQty(itemId: number): number | null {
  const val = auditActualQtyMap.value.get(itemId);
  return val !== undefined ? val : null;
}

function setAuditActualQty(itemId: number, val: number | null) {
  const newMap = new Map(auditActualQtyMap.value);
  newMap.set(itemId, val);
  auditActualQtyMap.value = newMap;
}

function getAuditDiffText(item: Item): string {
  const actual = getAuditActualQty(item.id);
  if (actual === null) return '-';
  const diff = actual - item.quantity;
  if (diff === 0) return '0';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function getAuditDiffClass(item: Item): string {
  const actual = getAuditActualQty(item.id);
  if (actual === null) return '';
  const diff = actual - item.quantity;
  if (diff === 0) return 'diff-match';
  if (diff > 0) return 'diff-surplus';
  return 'diff-shortage';
}

function startAudit() {
  auditActive.value = true;
  auditActualQtyMap.value = new Map();
  message.info(t('stock.inventoryStarted'));
}

function cancelAudit() {
  dialog.warning({
    title: t('stock.cancelInventory'),
    content: t('stock.cancelInventoryConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      auditActive.value = false;
      auditActualQtyMap.value = new Map();
    },
  });
}

function confirmCompleteAudit() {
  const uncounted = stockStore.items.length - countedCount.value;
  const disc = discrepancyCount.value;
  dialog.warning({
    title: t('stock.completeInventory'),
    content: uncounted > 0
      ? `${t('stock.completeInventoryMsg')} (${uncounted} ${t('stock.pending')})`
      : t('stock.completeInventoryMsg'),
    positiveText: t('stock.completeInventory'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      message.success(t('stock.inventoryComplete', { total: stockStore.items.length, diff: disc }));
      auditActive.value = false;
      auditActualQtyMap.value = new Map();
    },
  });
}

// ── Existing Methods ──
const isExpired = (item: Item): boolean => item.expiryDate ? new Date(item.expiryDate) < new Date() : false;
const isExpiring = (item: Item): boolean => {
  if (!item.expiryDate) return false;
  const d = new Date(item.expiryDate);
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);
  return d >= now && d <= in30Days;
};
const isLowStock = (item: Item): boolean => item.minStock !== null && item.quantity <= item.minStock;
const getLocationName = (locationId: number | null): string => {
  if (!locationId) return '-';
  const loc = locations.value.find(l => l.id === locationId);
  return loc ? loc.name : String(locationId);
};

onMounted(async () => {
  try { await stockStore.fetchItems(); } catch (_e: unknown) {}
  try {
    const [catRes, locRes, unitRes] = await Promise.all([
      api.get('/categories').then(r => r.data || []),
      locationsApi.list().then(r => r.data || []),
      unitsApi.list().then(r => r.data || []),
    ]);
    categories.value = catRes as Category[];
    locations.value = locRes as Location[];
    units.value = unitRes as UnitOption[];
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message || '加载选项失败');
  }
});
</script>

<style scoped>
.stock-page { max-width: 1200px; margin: 0 auto; }

.stock-page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--hh-space-4); gap: var(--hh-space-3); }
.stock-page-header-left { display: flex; align-items: baseline; gap: var(--hh-space-3); min-width: 0; }
.stock-page-title { font-size: var(--hh-text-xl); font-weight: var(--hh-weight-bold); color: var(--hh-text); margin: 0; white-space: nowrap; }
.stock-page-subtitle { font-size: var(--hh-text-sm); color: var(--hh-text-tertiary); white-space: nowrap; }
.stock-page-header-right { display: flex; align-items: center; gap: var(--hh-space-2); flex-shrink: 0; }

/* 优化7: Alert Banner */
.alert-banner {
  display: flex; gap: var(--hh-space-3); margin-bottom: var(--hh-space-4);
  border-radius: var(--hh-radius); overflow: hidden;
}
.alert-item {
  display: flex; align-items: center; gap: var(--hh-space-2);
  padding: var(--hh-space-2) var(--hh-space-4); border-radius: var(--hh-radius);
  font-size: var(--hh-text-sm); font-weight: var(--hh-weight-medium);
  cursor: pointer; transition: opacity 0.2s;
}
.alert-item:hover { opacity: 0.85; }
.alert-item--error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.alert-item--warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
.alert-item--info { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }

/* Stats Overview */
.stats-overview { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--hh-space-3); margin-bottom: var(--hh-space-4); }
.stat-card { display: flex; align-items: center; gap: var(--hh-space-3); padding: var(--hh-space-3); background: var(--hh-bg-card); border-radius: var(--hh-radius); border: 1px solid var(--hh-border-light); box-shadow: var(--hh-shadow-sm); cursor: pointer; transition: all 0.2s; }
.stat-card:hover { border-color: var(--hh-primary); }
.stat-card--active { border-color: var(--hh-primary); background: var(--hh-primary-lighter); }
.stat-icon-wrap { width: 36px; height: 36px; border-radius: var(--hh-radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-card--primary .stat-icon-wrap { background: #eff6ff; color: #3b82f6; }
.stat-card--info .stat-icon-wrap { background: #f0f9ff; color: #0ea5e9; }
.stat-card--warning .stat-icon-wrap { background: #fffbeb; color: #f59e0b; }
.stat-card--error .stat-icon-wrap { background: #fef2f2; color: #ef4444; }
.stat-card--danger .stat-icon-wrap { background: #fff1f2; color: #f43f5e; }
.stat-card--success .stat-icon-wrap { background: #f0fdf4; color: #22c55e; }
.stat-body { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); }
.stat-value { font-size: var(--hh-text-xl); font-weight: var(--hh-weight-bold); color: var(--hh-text); line-height: 1; }

/* 优化2: Row State Coloring */
:deep(.row-expired) { background: #fef2f2 !important; }
:deep(.row-expiring) { background: #fffbeb !important; }
:deep(.row-low-stock) { background: #eff6ff !important; }

/* Audit Panel */
.audit-panel { background: var(--hh-bg-card); border-radius: var(--hh-radius); border: 1px solid var(--hh-primary); box-shadow: var(--hh-shadow-sm); padding: var(--hh-space-4); margin-bottom: var(--hh-space-4); }
.audit-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--hh-space-3); }
.audit-panel-title { display: flex; align-items: center; gap: var(--hh-space-2); font-size: var(--hh-text-base); font-weight: var(--hh-weight-semibold); color: var(--hh-text); }
.audit-panel-stats { display: flex; gap: var(--hh-space-2); }
.audit-progress { margin-bottom: var(--hh-space-3); }
.audit-progress-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--hh-space-2); font-size: var(--hh-text-sm); color: var(--hh-text-secondary); }
.audit-progress-percent { font-weight: var(--hh-weight-bold); color: var(--hh-primary); }
.audit-filter { display: flex; gap: var(--hh-space-2); align-items: center; }

/* Audit Diff */
.diff-match { color: var(--hh-success); }
.diff-surplus { color: var(--hh-warning); }
.diff-shortage { color: var(--hh-error); }

/* Card Audit */
.stock-card-audit { margin-top: var(--hh-space-3); padding-top: var(--hh-space-3); border-top: 1px solid var(--hh-border-light); display: flex; flex-direction: column; gap: var(--hh-space-2); }
.audit-input-row { display: flex; align-items: center; gap: var(--hh-space-2); }
.audit-label { font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); min-width: 50px; }
.audit-system-qty { font-size: var(--hh-text-sm); font-weight: var(--hh-weight-medium); }
.audit-diff { font-size: var(--hh-text-sm); font-weight: var(--hh-weight-bold); }

/* 优化8: Opened Badge */
.opened-badge {
  font-size: 11px; color: var(--hh-warning); background: #fffbeb;
  padding: 1px 5px; border-radius: 3px; margin-left: 4px; font-weight: 500;
}

/* Filter Bar */
.filter-bar { display: flex; align-items: center; gap: var(--hh-space-3); margin-bottom: var(--hh-space-4); padding: var(--hh-space-3) var(--hh-space-4); background: var(--hh-bg-card); border-radius: var(--hh-radius); border: 1px solid var(--hh-border-light); box-shadow: var(--hh-shadow-sm); }
.search-input { flex: 1; min-width: 200px; }
.filter-select { width: 140px; }
.view-toggle { margin-left: auto; }

/* Card Grid */
.stock-card { cursor: pointer; }
.stock-card.row-expired { border-color: #fecaca; }
.stock-card.row-expiring { border-color: #fde68a; }
.stock-card.row-low-stock { border-color: #bfdbfe; }
.stock-card-header { display: flex; justify-content: space-between; align-items: center; gap: var(--hh-space-2); }
.stock-card-name { font-weight: 600; font-size: 15px; }
.stock-card-meta { display: flex; align-items: center; justify-content: space-between; gap: var(--hh-space-2); margin-top: var(--hh-space-2); }
.stock-card-quantity { font-size: var(--hh-text-sm); color: var(--hh-text-secondary); font-weight: var(--hh-weight-medium); }
.stock-card-price { display: flex; align-items: baseline; gap: var(--hh-space-2); margin-top: var(--hh-space-2); padding-top: var(--hh-space-2); border-top: 1px solid var(--hh-border-light); }
.price-label { font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); }
.price-value { font-size: var(--hh-text-sm); font-weight: var(--hh-weight-semibold); color: var(--hh-success); }
.price-total { font-size: var(--hh-text-xs); color: var(--hh-text-secondary); }
.stock-card-brand, .stock-card-shop { font-size: var(--hh-text-xs); color: var(--hh-text-secondary); background: var(--hh-bg-secondary); padding: 2px 6px; border-radius: var(--hh-radius-sm); }
.stock-card-footer { display: flex; align-items: center; justify-content: space-between; gap: var(--hh-space-2); margin-top: var(--hh-space-2); }
.stock-card-location { display: flex; align-items: center; gap: var(--hh-space-1); font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); }
.stock-card-expiry { font-size: var(--hh-text-xs); }
.stock-card-expiry.expiry-danger { color: var(--hh-error); font-weight: 500; }
.stock-card-expiry.expiry-warning { color: var(--hh-warning); font-weight: 500; }

/* 优化3: Card Quick Actions */
.stock-card-actions {
  display: flex; gap: var(--hh-space-1); margin-top: var(--hh-space-3);
  padding-top: var(--hh-space-2); border-top: 1px solid var(--hh-border-light);
  justify-content: flex-end;
}

/* Table View */
.table-view { background: var(--hh-bg-card); border-radius: var(--hh-radius); border: 1px solid var(--hh-border-light); box-shadow: var(--hh-shadow-sm); padding: var(--hh-space-3); overflow-x: auto; }
.table-toolbar { display: flex; justify-content: flex-end; margin-bottom: var(--hh-space-2); }

/* Column Visibility Panel */
.column-visibility-panel { display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
.column-visibility-item { display: flex; align-items: center; }

/* Row Actions */
.row-actions { display: flex; align-items: center; gap: 4px; }

/* Group Header Row */
:deep(.group-header-row) td {
  background: var(--hh-bg-secondary) !important;
  font-weight: 600;
  font-size: 13px;
  color: var(--hh-text);
  padding: 8px 12px !important;
  border-bottom: 1px solid var(--hh-border-light);
  cursor: pointer;
  user-select: none;
}
:deep(.group-header-row):hover td {
  background: var(--hh-primary-lighter) !important;
}
:deep(.group-header-row) .group-toggle {
  margin-right: 6px;
  font-size: 11px;
  color: var(--hh-text-secondary);
  transition: transform 0.15s;
}
:deep(.group-header-row) .group-label {
  font-weight: 600;
}
:deep(.group-header-row) .group-count {
  margin-left: 8px;
  font-weight: 400;
  font-size: 12px;
  color: var(--hh-text-tertiary);
}

/* Card Group Header */
.card-group { margin-bottom: 16px; }
.card-group-header {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; margin-bottom: 12px;
  background: var(--hh-bg-secondary); border-radius: var(--hh-radius);
  cursor: pointer; user-select: none;
  transition: background 0.15s;
}
.card-group-header:hover { background: var(--hh-primary-lighter); }
.card-group-header .group-toggle { font-size: 11px; color: var(--hh-text-secondary); }
.card-group-header .group-label { font-weight: 600; font-size: 13px; color: var(--hh-primary); }
.card-group-header .group-count { font-weight: 400; font-size: 12px; color: var(--hh-text-tertiary); }

/* Empty Stock */
.empty-stock-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--hh-space-8) var(--hh-space-4); text-align: center; gap: var(--hh-space-4); }
.empty-stock-icon { opacity: 0.5; margin-bottom: var(--hh-space-2); }
.empty-stock-title { font-size: var(--hh-text-xl); font-weight: var(--hh-weight-semibold); color: var(--hh-text); margin: 0; }
.empty-stock-desc { font-size: var(--hh-text-sm); color: var(--hh-text-secondary); max-width: 360px; line-height: 1.5; margin: 0; }
.empty-stock-actions { display: flex; gap: var(--hh-space-3); margin-top: var(--hh-space-2); }

/* Quick Stock In Modal */
.qs-step { display: flex; flex-direction: column; gap: 16px; min-height: 200px; }
.qs-search-row { display: flex; gap: 8px; }
.qs-search-row .n-input { flex: 1; }

.qs-results-count { font-size: 12px; color: var(--hh-text-tertiary); }
.qs-result-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
.qs-result-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--hh-bg-secondary); border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.qs-result-item:hover { background: var(--hh-primary-lighter); border-color: var(--hh-primary); }
.qs-result-left { display: flex; flex-direction: column; gap: 4px; }
.qs-result-name { font-size: 14px; font-weight: 500; color: var(--hh-text); }
.qs-result-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.qs-result-right { display: flex; align-items: center; gap: 6px; color: var(--hh-text-secondary); }
.qs-result-qty { font-size: 13px; font-weight: 500; }

.qs-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; }
.qs-empty-text { font-size: 14px; color: var(--hh-text-tertiary); }

.qs-form-section { display: flex; flex-direction: column; gap: 12px; }
.qs-form-row { display: flex; flex-direction: column; gap: 4px; }
.qs-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.qs-label { font-size: 13px; font-weight: 500; color: var(--hh-text-secondary); }

.qs-product-card { background: linear-gradient(135deg, var(--hh-primary-lighter), #f0f9ff); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.qs-product-name { font-size: 16px; font-weight: 600; color: var(--hh-primary); }
.qs-product-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px; color: var(--hh-text-secondary); }
.qs-product-meta strong { color: var(--hh-text); }

.qs-preview { background: #f0fdf4; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--hh-text-secondary); text-align: center; }
.qs-preview-val { color: var(--hh-success); font-weight: 600; }

.qs-footer-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

/* Responsive */
@media (max-width: 768px) {
  .stats-overview { grid-template-columns: repeat(2, 1fr); }
  .alert-banner { flex-wrap: wrap; }
  .filter-bar { flex-wrap: wrap; }
  .search-input { min-width: 100%; }
  .filter-select { width: 120px; }
  .qs-form-grid { grid-template-columns: 1fr; }
}
</style>
