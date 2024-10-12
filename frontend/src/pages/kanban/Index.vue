<template>
  <div>
    <q-page class="kanban-page">
      <div class="row q-pa-md">
        <div class="col-12">
          <h1 class="text-h4 q-mb-md">Dashboard Kanban</h1>
        </div>
      </div>
      <div ref="kanbanContainer"></div>
    </q-page>

    <q-dialog v-model="showTicketDetails" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Detalhes do Ticket #{{ selectedTicket?.id }}</div>
        </q-card-section>

        <q-card-section v-if="selectedTicket">
          <p><strong>Contato:</strong> {{ selectedTicket.contact_name || 'Nome não disponível' }}</p>
          <p><strong>Última Mensagem:</strong> {{ selectedTicket.lastMessage }}</p>
          <p><strong>Prioridade:</strong> {{ selectedTicket.priority }}</p>
          <p><strong>Responsável:</strong> {{ selectedTicket.assignee }}</p>
          <p><strong>Status:</strong> {{ selectedTicket.status }}</p>
          <div>
            <strong>Tags:</strong>
            <q-chip
              v-for="tag in selectedTicket.tags"
              :key="tag.id"
              :style="{ backgroundColor: tag.color, color: 'white' }"
              size="sm"
              class="q-ma-xs"
            >
              {{ tag.tag }}
            </q-chip>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Fechar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { defineComponent, onMounted, onBeforeUnmount, ref } from 'vue'
import React from 'react'
import ReactDOM from 'react-dom/client'
import KanbanBoard from './KanbanBoard.jsx'
import { ConsultarTickets, AtualizarStatusTicketTag } from 'src/service/tickets'
import { ListarEtiquetas } from 'src/service/etiquetas'
import { socketIO } from 'src/utils/socket'

export default defineComponent({
  name: 'KanbanPage',
  setup () {
    const userProfile = ref('user')
    const tickets = ref([])
    const etiquetas = ref([])
    const kanbanContainer = ref(null)
    const selectedTicket = ref(null)
    const showTicketDetails = ref(false)
    let root = null
    let socket = null

    const fetchData = async () => {
      try {
        await Promise.all([fetchTickets(), fetchEtiquetas()])
        renderKanbanBoard()
      } catch (error) {
        console.error('Erro ao buscar dados:', error)
      }
    }

    const fetchTickets = async () => {
      const params = {
        pageNumber: 1,
        status: ['open', 'pending'],
        showAll: true,
        includeNotQueueDefined: true,
        includeTags: true
      }
      try {
        const { data } = await ConsultarTickets(params)
        tickets.value = data.tickets.map(ticket => ({
          ...ticket,
          priority: getPriority(ticket),
          assignee: getAssignee(ticket)
        }))
      } catch (error) {
        console.error('Erro ao buscar tickets:', error)
      }
    }

    const fetchEtiquetas = async () => {
      try {
        const { data } = await ListarEtiquetas(true)
        etiquetas.value = data
      } catch (error) {
        console.error('Erro ao buscar etiquetas:', error)
      }
    }

    const getPriority = (ticket) => {
      const waitTime = new Date() - new Date(ticket.createdAt)
      if (waitTime > 24 * 60 * 60 * 1000) return 'Alta'
      if (waitTime > 12 * 60 * 60 * 1000) return 'Média'
      return 'Baixa'
    }

    const getAssignee = (ticket) => {
      return ticket.assignedUser ? ticket.assignedUser.name : 'Não atribuído'
    }

    const renderKanbanBoard = () => {
      const container = kanbanContainer.value
      if (!root) {
        root = ReactDOM.createRoot(container)
      }
      root.render(
        React.createElement(KanbanBoard, {
          tickets: tickets.value,
          tags: etiquetas.value,
          onTicketMove: handleTicketMove,
          onTicketClick: handleTicketClick
        })
      )
    }

    const handleTicketMove = async (ticketId, newTagId) => {
      try {
        const userId = localStorage.getItem('userId')
        await AtualizarStatusTicketTag(ticketId, newTagId, userId)
        const updatedTickets = tickets.value.map(ticket => {
          if (ticket.id === ticketId) {
            return {
              ...ticket,
              tags: [etiquetas.value.find(tag => tag.id === newTagId)]
            }
          }
          return ticket
        })
        tickets.value = updatedTickets
        renderKanbanBoard()
      } catch (error) {
        console.error('Erro ao mover o ticket:', error)
      }
    }

    const handleTicketClick = (ticket) => {
      selectedTicket.value = ticket
      showTicketDetails.value = true
    }

    const setupWebSocket = () => {
      socket = socketIO()
      const tenantId = localStorage.getItem('tenantId')

      socket.on('connect', () => {
        socket.emit(`${tenantId}:joinKanban`)
      })

      socket.on(`${tenantId}:ticket`, (data) => {
        if (data.action === 'update' || data.action === 'create' || data.action === 'delete') {
          fetchData()
        }
      })
    }

    onMounted(() => {
      userProfile.value = localStorage.getItem('profile')
      if (userProfile.value === 'admin') {
        fetchData()
        setupWebSocket()
      }
    })

    onBeforeUnmount(() => {
      if (root) {
        root.unmount()
      }
      if (socket) {
        socket.disconnect()
      }
    })

    return {
      userProfile,
      kanbanContainer,
      handleTicketMove,
      handleTicketClick,
      selectedTicket,
      showTicketDetails
    }
  }
})
</script>

<style lang="scss" scoped>
.kanban-page {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
