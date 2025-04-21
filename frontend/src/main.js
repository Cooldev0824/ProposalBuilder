import { createRouter, createWebHistory } from 'vue-router'
import { createStore } from 'vuex'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Import your views
import Dashboard from './views/Dashboard.vue'
import Editor from './views/Editor.vue'
import CreateProposal from './views/CreateProposal.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Dashboard
    },
    {
      path: '/proposal/create',
      component: CreateProposal
    },
    {
      path: '/proposal/edit/:id',
      component: Editor
    }
  ]
})

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light'
  }
})

const store = createStore({
  state() {
    return {
      proposals: [],
      currentProposal: null
    }
  },
  mutations: {
    setProposals(state, proposals) {
      state.proposals = proposals
    },
    setCurrentProposal(state, proposal) {
      state.currentProposal = proposal
    }
  }
})

const app = createApp(App)
app.use(router)
app.use(store)
app.use(vuetify)
app.mount('#app')



