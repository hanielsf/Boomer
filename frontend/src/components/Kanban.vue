<template>
  <div class="kanban-board">
    <draggable v-for="status in statuses" :key="status" :list="tasks[status]">
      <div v-for="task in tasks[status]" :key="task.id" class="task-card">
        {{ task.name }}
      </div>
    </draggable>
  </div>
</template>

<script>
import draggable from 'vuedraggable'

export default {
  components: { draggable },
  data () {
    return {
      statuses: ['Aberto', 'Orçamento', 'Venda Finalizada', 'Em Produção'],
      tasks: {
        Aberto: [{ id: 1, name: 'Tarefa 1' }],
        Orçamento: [],
        'Venda Finalizada': [],
        'Em Produção': []
      }
    }
  }
}
</script>

<style scoped>
.kanban-board {
  display: flex;
  justify-content: space-around;
}
.task-card {
  background-color: #f4f4f4;
  padding: 10px;
  margin: 10px;
  border-radius: 5px;
  cursor: grab;
}
</style>
