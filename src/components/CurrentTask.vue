<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import TaskItem from "~/components/TaskItem.vue";

const props = defineProps<{
  tasks: Task[];
}>();

console.log('current task', props.tasks);
</script>
<template>
  <div class="current-task">
    <h1>Task List</h1>
    <template v-if="tasks?.length > 0">
      <TaskItem v-for="task in tasks" :key="task.id" :task="task">
        <template v-slot:children>
          <TaskItem v-for="child in task.children" :key="child.id" :task="child"/>
        </template>
      </TaskItem>
    </template>
  </div>
</template>
<style scoped>

.current-task {
  display: flex;
  flex-direction: column;
  align-items: space-between;
  justify-content: center;
  padding: 0 8px;
}

h1 {
  font-size: 16px;
  font-weight: bold;
}
</style>

