<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Brain, MessageSquare, Network, Settings } from 'lucide-vue-next';
import SettingsDialog from '@/components/settings/SettingsDialog.vue';

const router = useRouter();
const showSettings = ref(false);
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 h-16 z-50 glass-panel rounded-none border-x-0 border-t-0"
  >
    <div class="h-full px-6 flex items-center justify-between">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center animate-pulse-glow"
        >
          <Brain class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-semibold gradient-text leading-none">Mnemo</h1>
          <p class="text-xs text-text-muted mt-0.5">记忆助理 Agent</p>
        </div>
      </div>

      <!-- 导航 -->
      <nav class="flex items-center gap-2">
        <button
          class="px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all"
          :class="router.currentRoute.value.name === 'chat'
            ? 'bg-primary/20 text-primary-light'
            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'"
          @click="router.push('/')"
        >
          <MessageSquare class="w-4 h-4" />
          对话
        </button>
        <button
          class="px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all"
          :class="router.currentRoute.value.name === 'memory'
            ? 'bg-primary/20 text-primary-light'
            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'"
          @click="router.push('/memory')"
        >
          <Network class="w-4 h-4" />
          记忆图谱
        </button>
      </nav>

      <!-- 设置 -->
      <button
        class="w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
        @click="showSettings = true"
      >
        <Settings class="w-5 h-5" />
      </button>
    </div>
  </header>

  <SettingsDialog v-model:visible="showSettings" />
</template>
