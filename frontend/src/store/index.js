import { createStore } from 'vuex';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const store = createStore({
  state: {
    proposals: [], // List of proposals
    currentProposal: null, // Currently selected or edited proposal
  },
  mutations: {
    setProposals(state, proposals) {
      state.proposals = proposals;
    },
    addProposalID(state, proposal) {
      state.proposals.push(proposal);
    },
    updateProposal(state, updatedProposal) {
      const index = state.proposals.findIndex(p => p.id === updatedProposal.id);
      if (index !== -1) {
        state.proposals[index] = updatedProposal;
      }
    },
    deleteProposal(state, proposalId) {
      state.proposals = state.proposals.filter(p => p.id !== proposalId);
    },
  },
  actions: {
    async fetchProposals({ commit }) {
      try {
        const response = await axios.get(`${API_URL}/proposals`);
        commit('setProposals', response.data);
      } catch (error) {
        console.error('Error fetching proposals:', error);
      }
    },
    async createProposalID({ commit }, proposal) {
      try {
        const response = await axios.post(`${API_URL}/proposalID`, proposal);
        commit('addProposalID', response.data);
        return response.data; // Return the created proposal
      } catch (error) {
        console.error('Error creating proposalID:', error);
        throw error; // Re-throw the error to handle it in the component
      }
    },
    async updateProposal({ commit }, proposal) {
      try {
        const response = await axios.put(`${API_URL}/proposals/${proposal.id}`, proposal);
        commit('updateProposal', response.data);
      } catch (error) {
        console.error('Error updating proposal:', error);
      }
    },
    async deleteProposal({ commit }, id) {
      try {
        await axios.delete(`${API_URL}/proposals/${id}`);
        commit('deleteProposal', id);
      } catch (error) {
        console.error('Error deleting proposal:', error);
      }
    },
  },
  getters: {
    allProposals: state => state.proposals,
    currentProposal: state => state.currentProposal,
  },
});

export default store;