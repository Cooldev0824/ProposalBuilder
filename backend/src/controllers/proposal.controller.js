const Proposal = require('../models/proposal.model');

exports.createProposal = async (req, res) => {
  try {
    const proposal = new Proposal({
      ...req.body,
      'metadata.createdBy': req.user.id // Assuming user info is added by auth middleware
    });
    await proposal.save();
    res.status(201).json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { proposalId, sectionId } = req.params;
    const proposal = await Proposal.findOneAndUpdate(
      { 
        _id: proposalId,
        'sections._id': sectionId 
      },
      { 
        $set: { 'sections.$': req.body }
      },
      { new: true }
    );
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateElement = async (req, res) => {
  try {
    const { proposalId, sectionId, elementId } = req.params;
    const proposal = await Proposal.findOneAndUpdate(
      {
        _id: proposalId,
        'sections._id': sectionId,
        'sections.elements._id': elementId
      },
      {
        $set: { 'sections.$.elements.$[elem]': req.body }
      },
      {
        arrayFilters: [{ 'elem._id': elementId }],
        new: true
      }
    );
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};