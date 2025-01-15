<script setup lang="ts">
import TaskItem from "~/components/TaskItem.vue";

const props = defineProps<{
  tasks: Task[];
}>();

console.log('current task', props.tasks);
</script>
<template>
  <div class="current-task">
    <h1>Current Tasks</h1>
    <template v-if="tasks?.length > 0">
      <TaskItem v-for="task in tasks" :key="task.id" :task="task" :tasks="task.children">
        <template #children>
          <TaskItem v-for="child in task.children" :key="child.id" :task="child" :tasks="child.children" />
        </template>
      </TaskItem>
    </template>
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

.task {
  display: flex;
  flex-direction: row;
  align-items: start;
  gap: 4px;
}
</style>

