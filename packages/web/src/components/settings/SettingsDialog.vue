<script setup lang="ts">
import { ref, watch } from 'vue';
import { useConfigStore } from '@/stores/config';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ 'update:visible': [v: boolean] }>();

const configStore = useConfigStore();
const activeTab = ref('llm');

watch(
  () => props.visible,
  (v) => {
    if (v) configStore.load();
  }
);

function close() {
  emit('update:visible', false);
}

const memoryTypeOptions = [
  { label: '事件记忆 (Episodic)', value: 'episodic' },
  { label: '知识记忆 (Semantic)', value: 'semantic' },
  { label: '流程记忆 (Procedural)', value: 'procedural' },
];
</script>

<template>
  <t-dialog
    :visible="visible"
    header="设置"
    :width="680"
    :footer="false"
    placement="center"
    @close="close"
  >
    <t-tabs v-model="activeTab" class="mt-2">
      <!-- LLM 配置 -->
      <t-tab-panel value="llm" label="LLM 配置">
        <div class="space-y-4 py-2" v-if="configStore.config">
          <t-form labelAlign="top">
            <t-form-item label="服务商">
              <t-select
                :value="configStore.config.llm.baseURL"
                placeholder="选择 LLM 服务商"
              >
                <t-option
                  v-for="p in configStore.providers"
                  :key="p.baseURL"
                  :value="p.baseURL"
                  :label="p.name"
                />
              </t-select>
            </t-form-item>
            <t-form-item label="API Base URL">
              <t-input :value="configStore.config.llm.baseURL" readonly />
            </t-form-item>
            <t-form-item label="模型">
              <t-input :value="configStore.config.llm.model" readonly />
            </t-form-item>
            <t-form-item label="API Key">
              <t-input
                :value="configStore.config.llm.hasApiKey ? '••••••••' : ''"
                readonly
                placeholder="未配置 API Key"
              />
            </t-form-item>
            <t-form-item label="Temperature">
              <t-slider :value="configStore.config.llm.temperature" :min="0" :max="2" :step="0.1" />
            </t-form-item>
          </t-form>
          <p class="text-xs text-text-muted">
            配置请编辑 config/mnemo.config.local.yaml，修改后重启服务生效
          </p>
        </div>
        <div v-else class="py-8 text-center text-text-muted">加载中...</div>
      </t-tab-panel>

      <!-- MCP 管理 -->
      <t-tab-panel value="mcp" label="MCP 管理">
        <div class="py-2 space-y-2">
          <div
            v-for="server in configStore.config?.mcpServers ?? []"
            :key="server.name"
            class="glass-panel rounded-xl p-3 flex items-center justify-between"
          >
            <div>
              <div class="text-text-primary font-medium">{{ server.name }}</div>
              <div class="text-xs text-text-muted">
                {{ server.transport }} · {{ server.command ?? server.url }}
              </div>
            </div>
            <t-switch :value="server.enabled" />
          </div>
          <div
            v-if="!configStore.config?.mcpServers?.length"
            class="py-8 text-center text-text-muted"
          >
            暂未配置 MCP Server
          </div>
        </div>
      </t-tab-panel>

      <!-- Skills -->
      <t-tab-panel value="skills" label="Skills">
        <div class="py-2 space-y-2">
          <div class="glass-panel rounded-xl p-3">
            <div class="text-text-primary font-medium mb-1">Skills 目录</div>
            <t-input :value="configStore.config?.skills?.directory" readonly />
          </div>
          <div
            v-for="skill in configStore.config?.skills?.enabled ?? []"
            :key="skill"
            class="glass-panel rounded-xl p-3 flex items-center justify-between"
          >
            <span class="text-text-primary">{{ skill }}</span>
            <t-switch :value="true" />
          </div>
          <div
            v-if="!configStore.config?.skills?.enabled?.length"
            class="py-8 text-center text-text-muted"
          >
            所有 Skills 默认启用
          </div>
        </div>
      </t-tab-panel>

      <!-- Rules -->
      <t-tab-panel value="rules" label="Rules">
        <div class="py-2 space-y-3">
          <div class="glass-panel rounded-xl p-3">
            <div class="text-text-primary font-medium mb-2">全局规则目录</div>
            <t-input :value="configStore.config?.rules?.globalRulesPath" readonly />
          </div>
          <div class="glass-panel rounded-xl p-3">
            <div class="text-text-primary font-medium mb-2">项目规则</div>
            <t-textarea
              :value="configStore.config?.rules?.projectRules"
              :autosize="{ minRows: 4 }"
              readonly
              placeholder="无项目规则"
            />
          </div>
        </div>
      </t-tab-panel>
    </t-tabs>
  </t-dialog>
</template>
