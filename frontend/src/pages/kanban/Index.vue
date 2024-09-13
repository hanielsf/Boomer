<template>
  <div v-if="userProfile === 'admin'">
    <q-page class="kanban-page">
      <div class="row q-pa-md">
        <div class="col-12">
          <h1 class="text-h4 q-mb-md">Dashboard Kanban</h1>
        </div>
      </div>
      <div ref="kanbanContainer"></div>
    </q-page>
  </div>
  <div v-else>
    <q-page class="flex flex-center">
      <p>Você não tem permissão para acessar esta página.</p>
    </q-page>
  </div>
</template>

<script>
import { defineComponent, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import React from 'react';
import ReactDOM from 'react-dom/client';
import KanbanBoard from './KanbanBoard.jsx';
import { ConsultarTickets, AtualizarStatusTicketTag } from 'src/service/tickets';
import { ListarEtiquetas } from 'src/service/etiquetas';
import { socketIO } from 'src/utils/socket';

export default defineComponent({
  name: 'KanbanPage',
  setup() {
    const userProfile = ref('user');
    const tickets = ref([]);
    const etiquetas = ref([]);
    const kanbanContainer = ref(null);
    let root = null;
    let socket = null;

    const fetchData = async () => {
      try {
        await Promise.all([fetchTickets(), fetchEtiquetas()]);
        renderKanbanBoard();
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };

    const fetchTickets = async () => {
      const params = {
        pageNumber: 1,
        status: ['open', 'pending'],
        showAll: true,
        includeNotQueueDefined: true,
        includeTags: true // Adicionamos este parâmetro para incluir informações das tags
      };
      try {
        const { data } = await ConsultarTickets(params);
        tickets.value = data.tickets;
      } catch (error) {
        console.error('Erro ao buscar tickets:', error);
      }
    };

    const fetchEtiquetas = async () => {
      try {
        const { data } = await ListarEtiquetas(true);
        etiquetas.value = data;
      } catch (error) {
        console.error('Erro ao buscar etiquetas:', error);
      }
    };

    const renderKanbanBoard = () => {
      const container = kanbanContainer.value;
      if (!root) {
        root = ReactDOM.createRoot(container);
      }
      root.render(
        React.createElement(KanbanBoard, {
          tickets: tickets.value,
          tags: etiquetas.value,
          onTicketMove: handleTicketMove,
          onTicketClick: handleTicketClick
        })
      );
    };

    const handleTicketMove = async (ticketId, newTagId) => {
      try {
        const userId = localStorage.getItem('userId');
        await AtualizarStatusTicketTag(ticketId, newTagId, userId);
        // Atualizamos o estado local para refletir a mudança imediatamente
        const updatedTickets = tickets.value.map(ticket => {
          if (ticket.id === ticketId) {
            return {
              ...ticket,
              tags: [etiquetas.value.find(tag => tag.id === newTagId)]
            };
          }
          return ticket;
        });
        tickets.value = updatedTickets;
        renderKanbanBoard();
      } catch (error) {
        console.error('Erro ao mover o ticket:', error);
      }
    };

    const handleTicketClick = (ticket) => {
      if (this.$q.screen.lt.md && ticket.status !== 'pending') {
        this.$root.$emit('infor-cabecalo-chat:acao-menu');
      }
      this.$store.commit('SET_HAS_MORE', true);
      this.$store.dispatch('AbrirChatMensagens', ticket);
    };

    const setupWebSocket = () => {
      socket = socketIO();
      const tenantId = localStorage.getItem('tenantId');

      socket.on('connect', () => {
        socket.emit(`${tenantId}:joinKanban`);
      });

      socket.on(`${tenantId}:ticket`, (data) => {
        if (data.action === 'update' || data.action === 'create' || data.action === 'delete') {
          fetchData(); // Atualizamos os dados quando houver mudanças
        }
      });
    };

    onMounted(() => {
      userProfile.value = localStorage.getItem('profile');
      if (userProfile.value === 'admin') {
        fetchData();
        setupWebSocket();
      }
    });

    onBeforeUnmount(() => {
      if (root) {
        root.unmount();
      }
      if (socket) {
        socket.disconnect();
      }
    });

    watch([tickets, etiquetas], () => {
      renderKanbanBoard();
    });

    return {
      userProfile,
      kanbanContainer,
      handleTicketMove,
      handleTicketClick
    };
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