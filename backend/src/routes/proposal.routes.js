const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposal.controller');
const auth = require('../middleware/auth');

// Base route: /api/proposals

// Create new proposal
router.post('/', auth, proposalController.createProposal);

// Get proposal by ID
router.get('/:id', auth, proposalController.getProposal);

// Update proposal
router.put('/:id', auth, proposalController.updateProposal);

// Update specific section
router.put('/:proposalId/sections/:sectionId', auth, proposalController.updateSection);

// Update specific element
router.put('/:proposalId/sections/:sectionId/elements/:elementId', auth, proposalController.updateElement);

module.exports = router;