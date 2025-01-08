<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import CurrentTask from "~/components/CurrentTask.vue";

const greetMsg = ref("");
const tasks = ref<Task[]>([]);

const taskPayload = ref<Task>({
  name: "",
  completed: false,
  createdAt: "",
});


function resetTaskPayload() {
  taskPayload.value = {
    name: "",
    completed: false,
    createdAt: "",
  };
}

async function addTask() {
  await invoke("add_task", { name: taskPayload.value.name });
  resetTaskPayload();
  hide_main_window();
}

async function hide_main_window() {
  await invoke("hide_main_window");
}
</script>

<template>
  <main class="container">
    <form class="row" @submit.prevent="addTask">
      <input id="greet-input" v-model="taskPayload.name" placeholder="Enter a task..." />
      <button type="submit">Task</button>
    </form>
    <CurrentTask />
  </main>
</template>

<style scoped>

</style>
<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  scrollbar-width: none;
  color: #0f0f0f;
  background-color: #FFFFFF00;
  height: 100vh;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  padding: 0 !important;
  margin: 0 !important;
  background-color: #00000000;
}

body {
  padding: 0 !important;
  margin: 0 !important;
  height: calc(100vh - 4px);
}

.container {
  margin-top: 10px;
  height: calc(100vh - 14px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background-color: #FFFFFF;
  filter: drop-shadow(0 0 4px #150b0b);
  position: relative;
}

.container::before {
  content: "";
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 0 10px 10px 10px;
  border-style: solid;
  border-color: transparent transparent #FFFFFF transparent;
  z-index: 1;
}

.container::after {
  content: "";
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 0 10px 10px 10px;
  border-style: solid;
  border-color: transparent transparent #e0e0e0 transparent;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}
button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

#greet-input {
  margin-right: 5px;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #00000000;
  }

  .container {
    margin-top: 10px;
    height: calc(100vh - 14px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    border-radius: 8px;
    border: 1px solid #1e1d1d;
    background-color: #2f2f2f;
    filter: drop-shadow(0 0 4px #150b0b);
    position: relative;
  }

  .container::before {
    content: "";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 10px 10px 10px;
    border-style: solid;
    border-color: transparent transparent #1e1d1d transparent;
    z-index: 1;
  }

  .container::after {
    content: "";
    position: absolute;
    top: -11px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 10px 10px 10px;
    border-style: solid;
    border-color: transparent transparent #1e1d1d transparent;
  }

  input,
  button {
    color: #ffffff;
    background-color: #0f0f0f98;
  }
  button:active {
    background-color: #0f0f0f69;
  }

  .container::before {
    border-color: transparent transparent #2f2f2f transparent;
  }
  
  .container::after {
    border-color: transparent transparent #1e1d1d transparent;
  }
}

</style>