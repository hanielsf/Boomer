const usuario = JSON.parse(localStorage.getItem('usuario'))
import Router from 'src/router/index'
import { socketIO } from '../utils/socket'
import { ConsultarTickets } from 'src/service/tickets'

const socket = socketIO()

const userId = +localStorage.getItem('userId')

socket.on(`tokenInvalid:${socket.id}`, () => {
  socket.disconnect()
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('profile')
  localStorage.removeItem('userId')
  localStorage.removeItem('usuario')
  setTimeout(() => {
    Router.push({
      name: 'login'
    })
  }, 1000)
})

export default {
  methods: {
    socketInitial () {
      socket.emit(`${usuario.tenantId}:joinNotification`)

      socket.io.on(`${usuario.tenantId}:whatsapp`, data => {
        if (data.action === 'update') {
          this.$store.commit('UPDATE_WHATSAPPS', data.whatsapp)
        }
      })

      socket.on(`${usuario.tenantId}:ticketList`, async data => {
        console.log('socket ON');
    
        // Verifique se o tipo de evento corresponde ao esperado
        if (data.type === 'chat:create') {
            console.log('chat:create');
    
            // Verifique se o ticket e o contato estão definidos no payload
            if (data.payload?.ticket?.userId !== userId) return;
            if (data.payload?.fromMe) return;
    
            // Verifique se os dados necessários estão presentes
            const contactName = data.payload?.ticket?.contact?.name || 'Desconhecido';
            const contactPicUrl = data.payload?.ticket?.contact?.profilePicUrl || '';
            const messageBody = data.payload?.body || '';
    
            // Crie a notificação
            const message = new self.Notification('Contato: ' + contactName, {
                body: 'Mensagem: ' + messageBody,
                tag: 'simple-push-demo-notification',
                image: contactPicUrl,
                icon: contactPicUrl
            });
            console.log(message);
            console.log('enviou msg');
    
            // Atualize notificações de mensagem
            const params = {
                searchParam: '',
                pageNumber: 1,
                status: ['open'],
                showAll: false,
                count: null,
                queuesIds: [],
                withUnreadMessages: true,
                isNotAssignedUser: false,
                includeNotQueueDefined: true
                // date: new Date(),
            };
            console.log('Definiu parametros');
    
            try {
                console.log('try');
                const response = await ConsultarTickets(params);
                console.log('try 1');
    
                // Verifique se a resposta contém os dados esperados
                if (response && response.data) {
                    this.countTickets = response.data.count; // count total de tickets no status
                    console.log('try 2');
                    this.$store.commit('UPDATE_NOTIFICATIONS', response.data);
                    console.log('try 3');
                } else {
                    console.error('Resposta inválida da API:', response);
                }
            } catch (err) {
                console.log('error try');
                this.$notificarErro('Algum problema', err);
                console.error(err);
            }
        }
      })
    
      socket.on(`${usuario.tenantId}:whatsapp`, data => {
        if (data.action === 'delete') {
          this.$store.commit('DELETE_WHATSAPPS', data.whatsappId)
        }
      })

      socket.on(`${usuario.tenantId}:whatsappSession`, data => {
        if (data.action === 'update') {
          this.$store.commit('UPDATE_SESSION', data.session)
          this.$root.$emit('UPDATE_SESSION', data.session)
        }

        if (data.action === 'readySession') {
          this.$q.notify({
            position: 'top',
            icon: 'mdi-wifi-arrow-up-down',
            message: `A conexão com o WhatsApp está pronta e o mesmo está habilitado para enviar e receber mensagens. Conexão: ${data.session.name}. Número: ${data.session.number}.`,
            type: 'positive',
            color: 'primary',
            html: true,
            progress: true,
            timeout: 7000,
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }],
            classes: 'text-body2 text-weight-medium'
          })
        }
      })

      socket.on(`${usuario.tenantId}:change_battery`, data => {
        this.$q.notify({
          message: `Bateria do celular do whatsapp ${data.batteryInfo.sessionName} está com bateria em ${data.batteryInfo.battery}%. Necessário iniciar carregamento.`,
          type: 'negative',
          progress: true,
          position: 'top',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      })
      socket.on(`${usuario.tenantId}:ticketList`, async data => {
        var verify = []
        if (data.type === 'notification:new') {
          const params = {
            searchParam: '',
            pageNumber: 1,
            status: ['pending'],
            showAll: false,
            count: null,
            queuesIds: [],
            withUnreadMessages: false,
            isNotAssignedUser: false,
            includeNotQueueDefined: true
          }
          try {
            const data_noti = await ConsultarTickets(params)
            this.$store.commit('UPDATE_NOTIFICATIONS_P', data_noti.data)
            verify = data_noti
          } catch (err) {
            this.$notificarErro('Algum problema', err)
            console.error(err)
          }
          // Faz verificação para se certificar que notificação pertence a fila do usuário
          var pass_noti = false
          verify.data.tickets.forEach((element) => { pass_noti = (element.id == data.payload.id ? true : pass_noti) })
          // Exibe Notificação
          if (pass_noti) {
            const message = new self.Notification('Novo cliente pendente', {
              body: 'Cliente: ' + data.payload.contact.name,
              tag: 'simple-push-demo-notification'
            })
            console.log(message)
          }
        }
      })
    }
  },
  mounted () {
    this.socketInitial()
  },
  destroyed () {
    socket && socket.disconnect()
  }
}
