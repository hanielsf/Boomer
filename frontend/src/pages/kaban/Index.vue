<template>
    <q-page class="kanban-page">
      <div class="row q-pa-md">
        <div class="col-12">
          <h1 class="text-h4 q-mb-md">Dashboard Kanban</h1>
          <q-btn color="primary" label="Atualizar" @click="fetchData" class="q-mb-md" />
        </div>
      </div>
      <VueKanbanBoard :tickets="tickets" :tags="etiquetas" @ticket-move="handleTicketMove" />
    </q-page>
  </template>
  
  <script>
  import { defineComponent } from 'vue';
  import { h } from 'vue';
  import { createReactWrapper } from '@vue/runtime-dom';
  import KanbanBoard from './KanbanBoard.jsx';
  import { ConsultarTickets } from 'src/service/tickets';
  import { ListarEtiquetas } from 'src/service/etiquetas';
  import { EditarEtiquetasContato } from 'src/service/contatos';
  
  const VueKanbanBoard = createReactWrapper(h, KanbanBoard);
  
  export default defineComponent({
    name: 'KanbanPage',
    components: {
      VueKanbanBoard
    },
    data() {
      return {
        tickets: [],
        etiquetas: [],
        loading: false
      };
    },
    methods: {
      async fetchData() {
        this.loading = true;
        try {
          await this.fetchTickets();
          await this.fetchEtiquetas();
        } catch (error) {
          console.error('Erro ao buscar dados:', error);
          this.$q.notify({
            color: 'negative',
            message: 'Erro ao carregar dados. Por favor, tente novamente.',
            icon: 'report_problem'
          });
        } finally {
          this.loading = false;
        }
      },
      async fetchTickets() {
        const params = {
          pageNumber: 1,
          status: ['open', 'pending'],
          showAll: true,
          includeNotQueueDefined: true
        };
        const { data } = await ConsultarTickets(params);
        this.tickets = data.tickets;
      },
      async fetchEtiquetas() {
        const { data } = await ListarEtiquetas(true);
        this.etiquetas = data;
      },
      async handleTicketMove(ticketId, newTagId) {
        try {
          const ticket = this.tickets.find(t => t.id.toString() === ticketId);
          if (!ticket) return;
  
          const updatedTags = [...ticket.tags.map(t => t.id), newTagId];
          await EditarEtiquetasContato(ticket.contact.id, updatedTags);
  
          // Atualizar o ticket localmente
          const updatedTicket = {
            ...ticket,
            tags: this.etiquetas.filter(tag => updatedTags.includes(tag.id))
          };
          this.tickets = this.tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t);
  
          this.$q.notify({
            color: 'positive',
            message: 'Ticket atualizado com sucesso!',
            icon: 'check_circle'
          });
        } catch (error) {
          console.error('Erro ao mover ticket:', error);
          this.$q.notify({
            color: 'negative',
            message: 'Erro ao atualizar ticket. Por favor, tente novamente.',
            icon: 'report_problem'
          });
        }
      }
    },
    mounted() {
      this.fetchData();
    }
  });
  </script>
  
  <style lang="scss" scoped>
  .kanban-page {
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  </style>