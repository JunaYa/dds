<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { onMounted, ref } from "vue";

const task = ref<Task[]>([]);

onMounted(async () => {
  task.value = await invoke("get_current_tasks");
});
</script>
<template>
  <div class="current-task">
    <h1>Current Tasks</h1>
    <div v-if="task?.length > 0">{{ task[0].name }}</div>
  </div>
</template>
<style scoped>

.current-task {
  display: flex;
  flex-direction: column;
  align-items: start;
}

h1 {
  font-size: 18px;
  font-weight: bold;
}
</style>
