<script setup lang="ts">
import { formatTime } from '~/utils/format';

const props = defineProps<{
  task: Task;
}>();

console.log('task', props.task);

const handleClick = () => {
  console.log('click');
};

</script>

<template>
  <div class="task">
    <div class="name">{{ task.name }}</div>
    <div class="created-at">{{ formatTime(task.created_at) }}</div>
    <!-- <div>{{ task.updated_at }}</div> -->
    <div class="completed-at">{{ task.completed_at || '--:--' }}</div>
    <div>{{ task.duration }}<span class="duration-unit">h</span></div>
    <button @click="handleClick">完成</button>
    <slot name="children"></slot>
  </div>
</template>

<style scoped>
.task {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  background-color: #080101;
  border-radius: 4px;
  margin-bottom: 4px;
  padding: 4px 8px;
}

.name {
  font-size: 14px;
  font-weight: 500;
}

.created-at {
  font-size: 14px;
  color: #bbbbbb;
  font-weight: 500;
  margin-left: 4px;
}

.completed-at {
  font-size: 14px;
  color: #bbbbbb;
  font-weight: 500;
  margin-left: 4px;
}

.duration-unit {
  font-size: 14px;
  color: #bbbbbb;
  font-weight: 500;
  margin-left: 4px;
}
</style>
