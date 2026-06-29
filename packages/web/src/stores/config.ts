import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getConfig, getLLMModels } from '@/services/api';

export const useConfigStore = defineStore('config', () => {
  const config = ref<any>(null);
  const providers = ref<any[]>([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      const [cfg, models] = await Promise.all([getConfig(), getLLMModels()]);
      config.value = cfg;
      providers.value = models.providers;
    } catch (e) {
      console.error('[config] 加载失败:', e);
    } finally {
      loading.value = false;
    }
  }

  return { config, providers, loading, load };
});
