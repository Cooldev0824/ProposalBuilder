import { createStore } from 'vuex'
import axios from 'axios'

export default createStore({
  state: {
    proposals: [],
    currentProposal: null,
    loading: false,
    error: null
  },
  
  mutations: {
    SET_PROPOSALS(state, proposals) {
      state.proposals = proposals
    },
    SET_CURRENT_PROPOSAL(state, proposal) {
      state.currentProposal = proposal
    },
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    ADD_PROPOSAL(state, proposal) {
      state.proposals.unshift(proposal)
    }
  },
  
  actions: {
    async fetchProposals({ commit }) {
      commit('SET_LOADING', true)
      try {
        const response = await axios.get('/api/proposals')
        commit('SET_PROPOSALS', response.data)
      } catch (error) {
        commit('SET_ERROR', error.message)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchProposal({ commit }, id) {
      commit('SET_LOADING', true)
      try {
        const response = await axios.get(`/api/proposals/${id}`)
        commit('SET_CURRENT_PROPOSAL', response.data)
      } catch (error) {
        commit('SET_ERROR', error.message)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async updateProposal({ commit }, { id, data }) {
      try {
        const response = await axios.put(`/api/proposals/${id}`, data)
        commit('SET_CURRENT_PROPOSAL', response.data)
      } catch (error) {
        commit('SET_ERROR', error.message)
      }
    },
    
    async createProposal({ commit }, data) {
      try {
        const response = await axios.post('/api/proposals', {
          title: data.title,
          metadata: {
            client: {
              name: data.clientName
            }
          },
          status: 'draft'
        })
        
        // Add the new proposal to the proposals list
        commit('ADD_PROPOSAL', response.data)
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.message)
        throw error
      }
    }
  }
})

