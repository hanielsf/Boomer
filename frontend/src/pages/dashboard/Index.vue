<template>
  <div class="q-pa-sm">
    <!-- Filtros -->
    <q-card class="q-my-md">
      <q-card-section class="row justify-between items-center">
        <div class="col-12 justify-center flex q-gutter-sm">
          <q-datetime-picker
            style="width: 200px"
            dense
            rounded
            hide-bottom-space
            outlined
            stack-label
            bottom-slots
            label="Data/Hora Agendamento"
            mode="date"
            color="primary"
            format24h
            v-model="params.startDate"
          />
          <q-datetime-picker
            style="width: 200px"
            dense
            rounded
            hide-bottom-space
            outlined
            stack-label
            bottom-slots
            label="Data/Hora Agendamento"
            mode="date"
            color="primary"
            format24h
            v-model="params.endDate"
          />
          <q-select
            style="width: 300px"
            dense
            rounded
            outlined
            hide-bottom-space
            emit-value
            map-options
            multiple
            options-dense
            use-chips
            label="Filas"
            color="primary"
            v-model="params.queuesIds"
            :options="filas"
            :input-debounce="700"
            option-value="id"
            option-label="queue"
            input-style="width: 280px; max-width: 280px;"
          />
          <q-btn
            rounded
            color="primary"
            icon="refresh"
            label="Atualizar"
            @click="getDashData"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Estatísticas -->
    <q-card class="q-my-md q-pa-sm">
      <q-card-section class="q-pa-md">
        <div class="row q-gutter-md justify-center">
          <StatCard title="Total Atendimentos" :value="ticketsAndTimes.qtd_total_atendimentos"/>
          <StatCard title="Ativo" :value="ticketsAndTimes.qtd_demanda_ativa"/>
          <StatCard title="Receptivo" :value="ticketsAndTimes.qtd_demanda_receptiva"/>
          <StatCard title="Novos Contatos" :value="ticketsAndTimes.new_contacts"/>
          <StatCard title="Tempo Médio Atendimento (TMA)" :value="cTmaFormat"/>
          <StatCard title="Tempo Médio 1º Resposta" :value="cTmeFormat"/>
        </div>
      </q-card-section>
    </q-card>

    <!-- Gráficos -->
    <div class="row q-col-gutter-md">
      <div class="col-xs-12 col-sm-6">
        <q-card>
          <q-card-section class="q-pa-md">
            <ApexChart
              ref="ChartTicketsChannels"
              type="donut"
              height="300"
              width="100%"
              :options="ticketsChannelsOptions"
              :series="ticketsChannelsOptions.series"
            />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-xs-12 col-sm-6">
        <q-card>
          <q-card-section class="q-pa-md">
            <ApexChart
              ref="ChartTicketsQueue"
              type="donut"
              height="300"
              width="100%"
              :options="ticketsQueueOptions"
              :series="ticketsQueueOptions.series"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
    
    <q-card class="q-my-md">
      <q-card-section>
        <ApexChart
          ref="ChartTicketsEvolutionChannels"
          type="bar"
          height="300"
          width="100%"
          :options="ticketsEvolutionChannelsOptions"
          :series="ticketsEvolutionChannelsOptions.series"
        />
      </q-card-section>
    </q-card>
    
    <q-card class="q-my-md">
      <q-card-section class="q-pa-md">
        <ApexChart
          ref="ChartTicketsEvolutionByPeriod"
          type="line"
          height="300"
          width="100%"
          :options="ticketsEvolutionByPeriodOptions"
          :series="ticketsEvolutionByPeriodOptions.series"
        />
      </q-card-section>
    </q-card>

    <!-- Tabela de Performance -->
    <q-card class="q-my-md q-pa-sm">
      <q-card-section class="q-pa-md">
        <q-table
          title="Performance Usuários"
          :data="ticketsPerUsersDetail"
          :columns="TicketsPerUsersDetailColumn"
          row-key="email"
          :pagination.sync="paginationTableUser"
          :rows-per-page-options="[0]"
          bordered
          flat
          hide-bottom
        >
          <template v-slot:body-cell-name="props">
            <q-td :props="props">
              <div class="row col text-bold"> {{ props.row.name || 'Não informado' }} </div>
              <div class="row col text-caption">{{ props.row.email }} </div>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { format, subDays, formatDuration } from 'date-fns'
import ApexChart from 'vue-apexcharts'
import Kanban from '@/components/Kanban.vue'
import StatCard from '@/components/StatCard.vue'
import { ListarFilas } from 'src/service/filas'
import {
  GetDashTicketsAndTimes,
  GetDashTicketsChannels,
  GetDashTicketsEvolutionChannels,
  GetDashTicketsQueue,
  GetDashTicketsEvolutionByPeriod,
  GetDashTicketsPerUsersDetail
} from 'src/service/estatisticas'

export default {
  name: 'IndexDashboard',
  components: { ApexChart, Kanban, StatCard },
  data () {
    return {
      params: {
        startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        queuesIds: []
      },
      paginationTableUser: {
        rowsPerPage: 40,
        rowsNumber: 0,
        lastIndex: 0
      },
      filas: [],
      ticketsChannelsOptions: {
        animations: { enabled: true, easing: 'easeinout', speed: 1000 },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'dark',
            type: 'vertical',
            shadeIntensity: 0.05,
            opacityFrom: 1,
            opacityTo: 0.9,
            stops: [0, 100]
          }
        },
        chart: { toolbar: { show: true } },
        legend: { position: 'bottom' },
        title: { text: 'Atendimento por canal' },
        noData: { text: 'Sem dados aqui!' },
        series: [],
        labels: [],
        theme: { mode: 'light', palette: 'palette1' },
        plotOptions: { pie: { dataLabels: { offset: -10 } } },
        dataLabels: {
          enabled: true,
          textAnchor: 'middle',
          style: { fontSize: '16px', offsetY: '150' }
        }
      },
      ticketsQueueOptions: {
        animations: { enabled: true, easing: 'easeinout', speed: 1000 },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'dark',
            type: 'vertical',
            shadeIntensity: 0.05,
            opacityFrom: 1,
            opacityTo: 0.9,
            stops: [0, 100]
          }
        },
        chart: { toolbar: { show: true } },
        legend: { position: 'bottom' },
        title: { text: 'Atendimento por fila' },
        noData: { text: 'Sem dados aqui!' },
        series: [],
        labels: [],
        theme: { mode: 'light', palette: 'palette1' },
        plotOptions: { pie: { dataLabels: { offset: -10 } } },
        dataLabels: {
          enabled: true,
          textAnchor: 'middle',
          style: { fontSize: '16px', offsetY: '150' }
        }
      },
      ticketsEvolutionChannelsOptions: {
        animations: { enabled: true, easing: 'easeinout', speed: 1000 },
        chart: {
          type: 'bar',
          stacked: true,
          stackType: '100%',
          toolbar: { tools: { download: true } }
        },
        theme: { mode: 'light', palette: 'palette1' },
        grid: { show: true },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'dark',
            type: 'vertical',
            shadeIntensity: 0.05,
            opacityFrom: 1,
            opacityTo: 0.9,
            stops: [0, 100]
          }
        },
        dataLabels: { enabled: true },
        title: { text: 'Evolução por canal', align: 'left' },
        stroke: { width: 0 },
        xaxis: { type: 'category', categories: [] },
        yaxis: { title: { text: 'Atendimentos' } },
        tooltip: { shared: true, intersect: false },
        legend: { position: 'bottom' },
        series: []
      },
      ticketsEvolutionByPeriodOptions: {
        chart: {
          type: 'line',
          height: 300,
          zoom: { enabled: true },
          toolbar: { tools: { download: true } }
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        title: { text: 'Evolução por período', align: 'left' },
        xaxis: { type: 'datetime', categories: [] },
        yaxis: { title: { text: 'Atendimentos' } },
        tooltip: { shared: true, intersect: false },
        legend: { position: 'bottom' },
        series: []
      },
      ticketsAndTimes: {
        qtd_total_atendimentos: null,
        qtd_demanda_ativa: null,
        qtd_demanda_receptiva: null,
        new_contacts: null,
        tma: null,
        tme: null
      },
      ticketsPerUsersDetail: [],
      TicketsPerUsersDetailColumn: [
        { name: 'Nome', align: 'left', required: true, label: 'Nome', field: 'name' },
        { name: 'Email', align: 'left', required: true, label: 'Email', field: 'email' }
      ]
    }
  },
  computed: {
    cTmaFormat() {
      return this.ticketsAndTimes.tma
        ? formatDuration({ minutes: Math.floor(this.ticketsAndTimes.tma / 60), seconds: this.ticketsAndTimes.tma % 60 })
        : 'N/A'
    },
    cTmeFormat() {
      return this.ticketsAndTimes.tme
        ? formatDuration({ minutes: Math.floor(this.ticketsAndTimes.tme / 60), seconds: this.ticketsAndTimes.tme % 60 })
        : 'N/A'
    }
  },
  methods: {
    async getDashData() {
      try {
        const [ticketsChannels, ticketsQueue, ticketsEvolutionChannels, ticketsEvolutionByPeriod, ticketsPerUsersDetail, filas] = await Promise.all([
          GetDashTicketsChannels(this.params),
          GetDashTicketsQueue(this.params),
          GetDashTicketsEvolutionChannels(this.params),
          GetDashTicketsEvolutionByPeriod(this.params),
          GetDashTicketsPerUsersDetail(this.params),
          ListarFilas()
        ])

        this.ticketsChannelsOptions.series = ticketsChannels.series
        this.ticketsChannelsOptions.labels = ticketsChannels.labels

        this.ticketsQueueOptions.series = ticketsQueue.series
        this.ticketsQueueOptions.labels = ticketsQueue.labels

        this.ticketsEvolutionChannelsOptions.series = ticketsEvolutionChannels.series
        this.ticketsEvolutionChannelsOptions.xaxis.categories = ticketsEvolutionChannels.categories

        this.ticketsEvolutionByPeriodOptions.series = ticketsEvolutionByPeriod.series
        this.ticketsEvolutionByPeriodOptions.xaxis.categories = ticketsEvolutionByPeriod.categories

        this.ticketsPerUsersDetail = ticketsPerUsersDetail
        this.filas = filas

        this.ticketsAndTimes = {
          ...this.ticketsAndTimes,
          qtd_total_atendimentos: ticketsChannels.qtd_total_atendimentos,
          qtd_demanda_ativa: ticketsChannels.qtd_demanda_ativa,
          qtd_demanda_receptiva: ticketsChannels.qtd_demanda_receptiva,
          new_contacts: ticketsChannels.new_contacts,
          tma: ticketsChannels.tma,
          tme: ticketsChannels.tme
        }
      } catch (error) {
        console.error('Erro ao obter dados:', error)
      }
    }
  },
  mounted() {
    this.getDashData()
  }
}
</script>

<style scoped>
/* Estilos personalizados */
</style>
